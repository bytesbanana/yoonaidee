import { setTimeout as pause } from "node:timers/promises";
import { processConversation } from "../src/lib/agent/conversation";
import { intakeTransaction } from "../src/lib/db/intake-db";
import { buildIntakeFlex, type IntakeLineMessage } from "../src/lib/line/intake-flex";

type ConversationJob = {
  id: string;
  message_id: string;
  session_id: string;
  user_id: string;
  content: string;
  preferences: unknown;
  awaiting_question: string | null;
  attempts: number;
  max_attempts: number;
};

async function runConversation() {
  const completion = await intakeTransaction(async (client) => {
    const { rows: [job] } = await client.query<ConversationJob>(`
      SELECT j.id, j.message_id, j.session_id, j.attempts, j.max_attempts,
             m.content, s.user_id, s.preferences, s.awaiting_question
      FROM analysis_jobs j
      JOIN conversation_messages m ON m.id = j.message_id
      JOIN conversation_sessions s ON s.id = j.session_id
      WHERE j.job_type = 'CONVERSATION' AND j.status = 'QUEUED' AND j.run_after <= now()
        AND NOT EXISTS (
          SELECT 1 FROM analysis_jobs earlier
          JOIN conversation_messages em ON em.id = earlier.message_id
          WHERE earlier.session_id = j.session_id AND earlier.job_type = 'CONVERSATION'
            AND earlier.status IN ('QUEUED', 'PROCESSING') AND em.sequence_no < m.sequence_no
        )
      ORDER BY j.created_at, m.sequence_no
      LIMIT 1 FOR UPDATE OF j SKIP LOCKED
    `);
    if (!job) return false;

    console.info("line.agent.started", { jobId: job.id, attempt: job.attempts + 1 });
    let result: Awaited<ReturnType<typeof processConversation>>;
    try {
      result = await processConversation({
        message: job.content,
        previousProfile: job.preferences,
        previousQuestion: job.awaiting_question,
      });
    } catch {
      const terminal = job.attempts + 1 >= job.max_attempts;
      console.error("line.agent.failed", { jobId: job.id, attempt: job.attempts + 1, terminal });
      await client.query(
        `UPDATE analysis_jobs SET attempts = attempts + 1, status = $2, updated_at = now(),
           run_after = now() + interval '10 seconds', last_error = 'Intake extraction failed'
         WHERE id = $1`,
        [job.id, terminal ? "FAILED" : "QUEUED"],
      );
      if (terminal) {
        await client.query(
          `INSERT INTO notification_outbox (user_id, session_id, idempotency_key, notification_type, payload)
           VALUES ($1, $2, $3, 'CONVERSATION_MESSAGE', $4)`,
          [job.user_id, job.session_id, `intake-failure:${job.id}`, {
            messages: [{ type: "text", text: /[ก-๙]/.test(job.content)
              ? "ตอนนี้ประมวลผลข้อความไม่ได้ครับ ลองส่งข้อความเดิมอีกครั้งได้เลย"
              : "I couldn't process that message. Please send it again." }],
          }],
        );
      }
      return true;
    }

    const { rows: [session] } = await client.query<{ next_message_sequence: string }>(
      `WITH prior AS (
         SELECT id, (preferences - 'language') IS DISTINCT FROM ($2::jsonb - 'language') AS changed, ready_for_analysis
         FROM conversation_sessions WHERE id = $1 FOR UPDATE
       )
       UPDATE conversation_sessions s SET preferences = $2,
          profile_version = s.profile_version + CASE WHEN prior.changed OR ($4 AND NOT prior.ready_for_analysis) THEN 1 ELSE 0 END,
          profile_source_metadata = $3, ready_for_analysis = $4, awaiting_question = $5,
          state = CASE WHEN $4 AND prior.ready_for_analysis AND NOT prior.changed THEN s.state ELSE $6 END,
          next_message_sequence = s.next_message_sequence + 1, updated_at = now()
       FROM prior WHERE s.id = prior.id
       RETURNING (s.next_message_sequence - 1) AS next_message_sequence`,
      [job.session_id, result.profile, { lastProcessedMessageId: job.message_id }, result.ready, result.question,
        result.ready ? "READY" : "WAITING_FOR_USER"],
    );
    const reply = result.reply;
    const { rows: [message] } = await client.query<{ id: string }>(
      `INSERT INTO conversation_messages (session_id, sequence_no, direction, content, delivery_status)
       VALUES ($1, $2, 'OUT', $3, 'PENDING') RETURNING id`,
      [job.session_id, session.next_message_sequence, reply],
    );
    await client.query(
      `INSERT INTO notification_outbox (user_id, session_id, idempotency_key, notification_type, payload)
       VALUES ($1, $2, $3, 'CONVERSATION_MESSAGE', $4)`,
      [job.user_id, job.session_id, `intake:${job.id}`, {
        messageId: message.id,
        messages: [buildIntakeFlex({
          reply,
          language: result.profile.language,
          needsClarification: result.question !== null,
        })],
      }],
    );
    await client.query(
      `UPDATE analysis_jobs SET status = 'COMPLETED', progress = 100, attempts = attempts + 1,
          completed_at = now(), updated_at = now(), last_error = NULL WHERE id = $1`,
      [job.id],
    );
    return {
      jobId: job.id,
      clarificationNeeded: result.question !== null,
      profileReady: result.ready,
    };
  });
  if (typeof completion === "object") console.info("line.agent.completed", completion);
  return Boolean(completion);
}

type Notification = {
  id: string;
  line_user_id: string;
  job_id: string;
  attempts: number;
  max_attempts: number;
  payload: { messageId?: string; messages: IntakeLineMessage[] };
};

async function deliverIntakeMessage() {
  const delivery = await intakeTransaction(async (client) => {
    const { rows: [notification] } = await client.query<Notification>(`
      SELECT n.id, n.attempts, n.max_attempts, n.payload, u.line_user_id,
             split_part(n.idempotency_key, ':', 2) AS job_id
      FROM notification_outbox n JOIN users u ON u.id = n.user_id
      WHERE n.status = 'PENDING'
        AND ((n.notification_type = 'CONVERSATION_MESSAGE'
              AND (n.idempotency_key LIKE 'intake:%' OR n.idempotency_key LIKE 'intake-failure:%'))
          OR (n.notification_type = 'ANALYSIS_ACKNOWLEDGED'
              AND n.idempotency_key LIKE 'analysis-ack:%'))
        AND n.next_attempt_at <= now()
        AND NOT EXISTS (
          SELECT 1 FROM notification_outbox earlier WHERE earlier.session_id = n.session_id
            AND earlier.status = 'PENDING'
            AND (earlier.idempotency_key LIKE 'intake:%'
              OR earlier.idempotency_key LIKE 'intake-failure:%'
              OR earlier.idempotency_key LIKE 'analysis-ack:%')
            AND (earlier.created_at, earlier.id) < (n.created_at, n.id)
        )
      ORDER BY n.created_at, n.id LIMIT 1 FOR UPDATE OF n SKIP LOCKED
    `);
    if (!notification) return false;

    let accepted = false;
    let httpStatus: number | null = null;
    try {
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Line-Retry-Key": notification.id,
        },
        body: JSON.stringify({ to: notification.line_user_id, messages: notification.payload.messages }),
        signal: AbortSignal.timeout(8000),
      });
      httpStatus = response.status;
      accepted = response.ok || (response.status === 409 && response.headers.has("x-line-accepted-request-id"));
    } catch {
      // Retry with the same LINE retry key after a transport failure.
    }

    const terminal = notification.attempts + 1 >= notification.max_attempts;
    const status = accepted ? "SENT" : terminal ? "FAILED" : "PENDING";
    await client.query(
      `UPDATE notification_outbox SET status = $2, attempts = attempts + 1,
          updated_at = now(), next_attempt_at = now() + interval '10 seconds',
          sent_at = CASE WHEN $2 = 'SENT' THEN now() END,
          last_error = CASE WHEN $2 <> 'SENT' THEN 'LINE push failed' END
       WHERE id = $1`,
      [notification.id, status],
    );
    if (notification.payload.messageId && status !== "PENDING") {
      await client.query("UPDATE conversation_messages SET delivery_status = $2 WHERE id = $1", [notification.payload.messageId, status]);
    }
    return { jobId: notification.job_id, notificationId: notification.id, httpStatus, status };
  });
  if (!delivery) return false;
  if (delivery.status === "SENT") {
    console.info("line.push.accepted", delivery);
  } else {
    console.error("line.push.failed", delivery);
  }
  return true;
}

for (const key of ["DATABASE_URL", "OPENAI_API_KEY", "OPENAI_MODEL", "LINE_CHANNEL_ACCESS_TOKEN"]) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}

console.info("line.worker.ready");

while (true) {
  try {
    const delivered = await deliverIntakeMessage();
    const processed = await runConversation();
    if (!processed && !delivered) await pause(1000);
  } catch {
    console.error("Intake worker database operation failed");
    await pause(3000);
  }
}
