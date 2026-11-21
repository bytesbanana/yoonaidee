import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { handleTextEvent, textEvent } from "@/lib/line/intake-events";

export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return new Response("Webhook unavailable", { status: 503 });

  const body = Buffer.from(await request.arrayBuffer());
  const expected = createHmac("sha256", secret).update(body).digest();
  const supplied = Buffer.from(request.headers.get("x-line-signature") ?? "", "base64");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let events: unknown[];
  try {
    ({ events } = z.object({ events: z.array(z.unknown()) }).parse(JSON.parse(body.toString("utf8"))));
  } catch {
    return new Response("Invalid event payload", { status: 400 });
  }

  for (const event of events) {
    const parsed = textEvent.safeParse(event);
    if (!parsed.success) continue;
    const { webhookEventId: eventId, replyToken } = parsed.data;
    let outcome: Awaited<ReturnType<typeof handleTextEvent>>;
    try {
      outcome = await handleTextEvent(parsed.data);
    } catch {
      console.error("line.webhook.intake_failed", { eventId });
      return new Response("Webhook intake unavailable", { status: 503 });
    }
    if (outcome.jobId) console.info("line.analysis.queued", { eventId, jobId: outcome.jobId });
    if (!outcome.reply) continue;

    // Push the queued-job card after commit without relying on the webhook reply token.
    const isPush = outcome.jobId !== undefined;
    const delivery = isPush ? "push" : "reply";
    const logContext = { eventId, jobId: outcome.jobId };
    // LINE failure must not roll back saved intake or analysis jobs.
    try {
      const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      if (!channelToken) throw new Error("LINE channel token missing");
      const response = await fetch(`https://api.line.me/v2/bot/message/${delivery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${channelToken}` },
        body: JSON.stringify({
          ...(isPush ? { to: parsed.data.source.userId } : { replyToken }),
          messages: [outcome.reply],
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        console.error(`line.${delivery}.failed`, {
          ...logContext, httpStatus: response.status, requestId: response.headers.get("x-line-request-id"),
        });
      } else if (isPush) {
        console.info("line.push.accepted", logContext);
      }
    } catch (error) {
      console.error(`line.${delivery}.failed`, { ...logContext, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  console.info("line.webhook.accepted", { eventCount: events.length });
  return new Response("OK");
}
