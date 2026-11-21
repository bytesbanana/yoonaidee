# SCHEMA — Database Definition (PostgreSQL 16 + Drizzle)

**Scope:** Lean MVP. Four tables, minimal indexes. Assumptions are allowed to change — if the shape is wrong, edit this file and `src/lib/db/schema.ts` together.

Drizzle source of truth: `src/lib/db/schema.ts`.

---

## 1. `line_events` — inbound LINE webhook dedupe

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` PK | no | `defaultRandom()` |
| `event_id` | `text` | no | LINE event id (message id); **unique** |
| `line_user_id` | `text` | no | sender user id |
| `event_type` | `text` | no | e.g. `message`, `follow` |
| `message_text` | `text` | yes | stored short-term for debugging; do not log it elsewhere |
| `received_at` | `timestamptz` | no | `defaultNow()` |

Indexes: unique `line_events_event_id_idx` on `event_id`.

Semantics: insert first; on unique violation the event is a **duplicate** → respond `200` with no new work.

---

## 2. `conversations` — one conversation per LINE user

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` PK | no | `defaultRandom()` |
| `line_user_id` | `text` | no | **unique** |
| `profile_json` | `jsonb` | yes | latest `PreferenceProfile` (see PRD §6) |
| `state` | `text` | no | `collecting` \| `ready` \| `analyzing` \| `done`; default `collecting` |
| `missing_field` | `text` | yes | which field the last clarification question targeted |
| `last_result_id` | `uuid` | yes | FK → `results.id` (nullable, set after analysis) |
| `created_at` | `timestamptz` | no | `defaultNow()` |
| `updated_at` | `timestamptz` | no | `defaultNow()`, updated on write |

Indexes: unique `conversations_line_user_id_idx` on `line_user_id`.

Semantics: serializes work per user — a conversation only accepts one active job at a time (see §3, `dedupe_key`).

---

## 3. `jobs` — Postgres queue

> **Ownership:** this repo **enqueues** jobs and reads their status for the UI. The **worker lives in a separate repo** and owns claiming, running, leasing and retrying. Both repos must use this table shape — change it in both together.

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` PK | no | `defaultRandom()` |
| `type` | `text` | no | `CONVERSATION` \| `ANALYSIS` |
| `status` | `text` | no | `queued` \| `running` \| `completed` \| `failed`; default `queued` |
| `payload_json` | `jsonb` | no | job input (conversation id, event id, profile) |
| `progress` | `text` | yes | optional UI hint: `collecting` \| `scoring` \| `explaining` |
| `attempts` | `integer` | no | default `0` |
| `max_attempts` | `integer` | no | default `3` |
| `run_after` | `timestamptz` | no | earliest execution time; default `defaultNow()` (backoff) |
| `lease_until` | `timestamptz` | yes | worker lease expiry; expired + `running` ⇒ reclaimable |
| `dedupe_key` | `text` | yes | unique-while-active key, e.g. `conversation:{id}` |
| `last_error` | `text` | yes | short error string, never secrets or full message bodies |
| `created_at` | `timestamptz` | no | `defaultNow()` |
| `updated_at` | `timestamptz` | no | `defaultNow()` |

Indexes:
- `jobs_status_run_after_idx` on `(status, run_after)` — poll query.
- `jobs_lease_idx` on `(lease_until)` — crash recovery sweep.

Semantics:
- **Claim:** `UPDATE jobs SET status='running', lease_until=now()+interval '60 seconds', attempts=attempts+1 WHERE id = (SELECT id FROM jobs WHERE status='queued' AND run_after<=now() ORDER BY run_after FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *;`
- **Complete:** `status='completed'`. **Fail:** if `attempts < max_attempts` → back to `queued` with `run_after = now() + backoff`; else `status='failed'`.
- **Crash recovery:** `running` rows with `lease_until < now()` are returned to `queued`.
- **Serialize per conversation:** one active job per `dedupe_key` (`conversation:{id}`); newer events for the same conversation wait behind it.

---

## 4. `results` — validated recommendation output

| Column | Type | Null | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` PK | no | `defaultRandom()`; used in `/api/results/:id` and the LIFF URL |
| `line_user_id` | `text` | no | owner |
| `conversation_id` | `uuid` | yes | FK → `conversations.id` |
| `result_json` | `jsonb` | no | validated `RecommendationResult` (PRD §7) |
| `created_at` | `timestamptz` | no | `defaultNow()` |

Indexes: `results_line_user_id_idx` on `line_user_id`.

Semantics: written only after Zod validation. Immutable — a new run creates a new row.

---

## 5. Reference DDL

```sql
CREATE TABLE line_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  line_user_id text NOT NULL,
  event_type text NOT NULL,
  message_text text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id text NOT NULL UNIQUE,
  profile_json jsonb,
  state text NOT NULL DEFAULT 'collecting',
  missing_field text,
  last_result_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  payload_json jsonb NOT NULL,
  progress text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  run_after timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  dedupe_key text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_status_run_after_idx ON jobs (status, run_after);
CREATE INDEX jobs_lease_idx ON jobs (lease_until);

CREATE TABLE results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id text NOT NULL,
  conversation_id uuid REFERENCES conversations(id),
  result_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX results_line_user_id_idx ON results (line_user_id);
```

Migrations: `drizzle-kit push` for hackathon speed, `drizzle-kit generate` + `migrate` when the schema stabilizes.

---

## 6. Not in schema (deliberately)

- Users/accounts table — LINE user id is the identity.
- Message transcript table — raw messages are not needed after the profile is extracted.
- Neighborhood table — the snapshot lives in `data/neighborhoods.json` (versioned file, not DB).
- Audit/history, soft deletes, multi-region, sharding — out of MVP scope.
