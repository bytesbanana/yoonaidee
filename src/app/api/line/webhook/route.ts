import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { enqueueTextEvent, textEvent } from "@/lib/line/intake-events";

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

  console.info("line.webhook.accepted", { eventCount: events.length });
  for (const event of events) {
    const parsed = textEvent.safeParse(event);
    if (!parsed.success) continue;

    const eventId = parsed.data.webhookEventId;
    try {
      const jobId = await enqueueTextEvent(parsed.data);
      if (jobId) {
        console.info("line.webhook.queued", { eventId, jobId });
      } else {
        console.info("line.webhook.duplicate", { eventId });
      }
    } catch {
      console.error("line.webhook.enqueue_failed", { eventId });
      return new Response("Webhook temporarily unavailable", { status: 503 });
    }
  }
  return new Response("OK");
}
