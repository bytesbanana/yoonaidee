import { z } from "zod";
import { intakeTransaction } from "../db/intake-db";

export const textEvent = z.object({
  type: z.literal("message"),
  mode: z.literal("active").optional(),
  webhookEventId: z.string().min(1),
  source: z.object({ type: z.literal("user"), userId: z.string().min(1) }),
  message: z.object({ type: z.literal("text"), id: z.string().min(1), text: z.string().trim().min(1).max(5000) }),
});

export async function enqueueTextEvent(event: z.infer<typeof textEvent>) {
  return intakeTransaction(async (client) => {
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
    const { rows: [session] } = await client.query<{ id: string; next_message_sequence: string }>(
      `SELECT id, next_message_sequence FROM conversation_sessions
       WHERE user_id = $1 AND closed_at IS NULL FOR UPDATE`,
      [user.id],
    );
    const { rows: [message] } = await client.query<{ id: string }>(
      `INSERT INTO conversation_messages (session_id, sequence_no, direction, line_message_id, webhook_event_id, content)
       VALUES ($1, $2, 'IN', $3, $4, $5) ON CONFLICT DO NOTHING RETURNING id`,
      [session.id, session.next_message_sequence, event.message.id, event.webhookEventId, event.message.text],
    );
    if (!message) return null;
    await client.query("UPDATE conversation_sessions SET next_message_sequence = next_message_sequence + 1 WHERE id = $1", [session.id]);
    const { rows: [job] } = await client.query<{ id: string }>(
      `INSERT INTO analysis_jobs (session_id, message_id, job_type, idempotency_key)
       VALUES ($1, $2, 'CONVERSATION', $3) RETURNING id`,
      [session.id, message.id, `conversation:${message.id}`],
    );
    return job.id;
  });
}
