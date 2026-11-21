import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Incoming LINE webhook events — dedupe key.
export const lineEvents = pgTable(
  'line_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: text('event_id').notNull(),
    lineUserId: text('line_user_id').notNull(),
    eventType: text('event_type').notNull(),
    messageText: text('message_text'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('line_events_event_id_idx').on(table.eventId)],
);

// One conversation per LINE user. profile_json holds PreferenceProfile.
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lineUserId: text('line_user_id').notNull(),
    profileJson: jsonb('profile_json').$type<PreferenceProfile | null>(),
    state: text('state').notNull().default('collecting'),
    missingField: text('missing_field'),
    lastResultId: uuid('last_result_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('conversations_line_user_id_idx').on(table.lineUserId)],
);

// Postgres-backed queue. This repo enqueues + reads status; the worker
// (separate repo) claims, leases and retries.
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull().$type<'CONVERSATION' | 'ANALYSIS'>(),
    status: text('status')
      .notNull()
      .$type<'queued' | 'running' | 'completed' | 'failed'>()
      .default('queued'),
    payloadJson: jsonb('payload_json').notNull().$type<Record<string, unknown>>(),
    progress: text('progress').$type<'collecting' | 'scoring' | 'explaining' | null>(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    runAfter: timestamp('run_after', { withTimezone: true }).notNull().defaultNow(),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    dedupeKey: text('dedupe_key'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('jobs_status_run_after_idx').on(table.status, table.runAfter),
    index('jobs_lease_idx').on(table.leaseUntil),
  ],
);

// Validated RecommendationResult snapshots.
export const results = pgTable(
  'results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lineUserId: text('line_user_id').notNull(),
    conversationId: uuid('conversation_id'),
    resultJson: jsonb('result_json').notNull().$type<RecommendationResult>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('results_line_user_id_idx').on(table.lineUserId)],
);

export type LineEvent = typeof lineEvents.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Result = typeof results.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

// Local structural types so this file stays importable without the shared types barrel.
type PreferenceProfile = {
  workplace: { text: string; lat?: number; lng?: number } | null;
  budget: { max: number; currency: 'THB' } | null;
  transport: { primary: 'public_transit' | 'car' | 'walk' | 'other' | 'unknown' };
  lifestyle: Record<string, 'low' | 'medium' | 'high'>;
};

type RecommendationResult = {
  summary: string;
  recommendations: Array<{
    neighborhood_id: string;
    name: string;
    match_score: number;
    work_score: number;
    lifestyle_score: number;
    estimated_rent_thb: number | null;
    reasons: string[];
    tradeoff: string;
    confidence?: 'high' | 'medium' | 'low';
  }>;
};
