import { z } from "zod";
import { processConversation } from "../agent/conversation";
import { intakeTransaction } from "../db/intake-db";
import { buildIntakeFlex, type IntakeLineMessage } from "./intake-flex";

export const textEvent = z.object({
  type: z.literal("message"),
  mode: z.literal("active").optional(),
  webhookEventId: z.string().min(1),
  replyToken: z.string().min(1),
  source: z.object({ type: z.literal("user"), userId: z.string().min(1) }),
  message: z.object({ type: z.literal("text"), id: z.string().min(1), text: z.string().trim().min(1).max(5000) }),
});

type IntakeOutcome = { reply?: IntakeLineMessage; jobId?: string };

export async function handleTextEvent(event: z.infer<typeof textEvent>): Promise<IntakeOutcome> {
  return intakeTransaction(async (client) => {
    // Serialize intake for this LINE user, including concurrent sessions/events.
    const { rows: [user] } = await client.query<{ id: string }>(
      `INSERT INTO users (line_user_id) VALUES ($1)
       ON CONFLICT (line_user_id) DO UPDATE SET updated_at = now() RETURNING id`,
      [event.source.userId],
    );
    await client.query(
      `INSERT INTO conversation_sessions (user_id) VALUES ($1)
       ON CONFLICT (user_id) WHERE closed_at IS NULL DO NOTHING`,
      [user.id],
    );
    const { rows: [session] } = await client.query<{
      id: string;
      next_message_sequence: string;
      preferences: Record<string, unknown>;
      awaiting_question: string | null;
      profile_version: number;
      ready_for_analysis: boolean;
    }>(`SELECT id, next_message_sequence, preferences, awaiting_question, profile_version, ready_for_analysis
        FROM conversation_sessions WHERE user_id = $1 AND closed_at IS NULL FOR UPDATE`, [user.id]);
    const { rows: [message] } = await client.query<{ id: string }>(
      `INSERT INTO conversation_messages (session_id, sequence_no, direction, line_message_id, webhook_event_id, content)
       VALUES ($1, $2, 'IN', $3, $4, $5) ON CONFLICT DO NOTHING RETURNING id`,
      [session.id, session.next_message_sequence, event.message.id, event.webhookEventId, event.message.text],
    );
    if (!message) return {};
    // Record ignored events too, so LINE redelivery cannot replay them after the job finishes.
    await client.query("UPDATE conversation_sessions SET next_message_sequence = next_message_sequence + 1 WHERE id = $1", [session.id]);

    const { rowCount: busy } = await client.query(
      `SELECT 1 FROM analysis_jobs j JOIN conversation_sessions s ON s.id = j.session_id
       WHERE s.user_id = $1 AND j.job_type = 'ANALYSIS' AND (
         j.status IN ('QUEUED', 'PROCESSING', 'COLLECTING', 'SCORING', 'EXPLAINING')
         OR (j.status = 'FAILED' AND j.attempts < j.max_attempts)
       ) LIMIT 1`, [user.id],
    );
    if (busy) return {};

    async function queueAnalysis(profile: Record<string, unknown>, version: number, key: string): Promise<IntakeOutcome> {
      const { rows: [job] } = await client.query<{ id: string }>(
        `INSERT INTO analysis_jobs (session_id, message_id, job_type, idempotency_key, profile_version, input_snapshot)
         VALUES ($1, $2, 'ANALYSIS', $3, $4, $5) ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
        [session.id, message.id, key, version, { ...profile, profileVersion: version }],
      );
      if (!job) return {};
      const language = profile.language === "en" ? "en" : "th";
      const reply = language === "en" ? "I’m searching for neighborhoods that match your preferences."
        : "กำลังค้นหาย่านที่ตรงกับความต้องการของคุณครับ";
      return { jobId: job.id, reply: buildIntakeFlex({ reply, language, needsClarification: false }) };
    }

    if (/^(retry|ลองใหม่)$/i.test(event.message.text)) {
      if (!session.ready_for_analysis) return {};
      const { rows: [last] } = await client.query<{ terminal_failure: boolean }>(
        `SELECT status = 'FAILED' AND attempts >= max_attempts AS terminal_failure
         FROM analysis_jobs WHERE session_id = $1 AND job_type = 'ANALYSIS' AND profile_version = $2
         ORDER BY created_at DESC, id DESC LIMIT 1`, [session.id, session.profile_version],
      );
      if (!last?.terminal_failure) return {};
      await client.query("UPDATE conversation_sessions SET state = 'READY', updated_at = now() WHERE id = $1", [session.id]);
      return queueAnalysis(session.preferences, session.profile_version, `analysis-retry:${message.id}`);
    }

    // Any Codex failure rolls back the event as well as the profile, allowing LINE redelivery.
    const result = await processConversation({
      message: event.message.text,
      previousProfile: session.preferences,
      previousQuestion: session.awaiting_question,
    });
    const { rows: [updated] } = await client.query<{ profile_version: number; should_queue: boolean }>(
      `WITH prior AS (
         SELECT (preferences - 'language') IS DISTINCT FROM ($2::jsonb - 'language') AS changed,
                ready_for_analysis AS was_ready
         FROM conversation_sessions WHERE id = $1
       )
       UPDATE conversation_sessions s SET preferences = $2,
          profile_version = s.profile_version + CASE WHEN prior.changed OR ($3 AND NOT prior.was_ready) THEN 1 ELSE 0 END,
          profile_source_metadata = $4, ready_for_analysis = $3, awaiting_question = $5,
          state = CASE WHEN NOT $3 THEN 'WAITING_FOR_USER' WHEN prior.changed OR NOT prior.was_ready THEN 'READY' ELSE s.state END,
          updated_at = now()
       FROM prior WHERE s.id = $1
       RETURNING s.profile_version, $3 AND (prior.changed OR NOT prior.was_ready) AS should_queue`,
      [session.id, result.profile, result.ready, { lastProcessedMessageId: message.id }, result.question],
    );
    if (result.question) return { reply: { type: "text", text: result.question } };
    if (!updated.should_queue) return {};
    return queueAnalysis(result.profile, updated.profile_version, `analysis:${session.id}:${updated.profile_version}`);
  });
}
