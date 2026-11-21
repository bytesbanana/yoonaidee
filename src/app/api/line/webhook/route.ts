import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const replyEvent = z.object({
  type: z.literal("message"),
  mode: z.literal("active").optional(),
  webhookEventId: z.string().min(1),
  replyToken: z.string().min(1),
  source: z.object({ type: z.literal("user") }),
  message: z.object({ type: z.literal("text"), text: z.string() }),
});

async function replyToMessage(event: z.infer<typeof replyEvent>, channelToken: string) {
  const language = /[ก-๙]/.test(event.message.text) ? "th" : "en";
  const reply = language === "th" ? "ได้รับข้อความของคุณแล้วครับ" : "I received your message.";
  const eventId = event.webhookEventId;
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: { Authorization: `Bearer ${channelToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: reply }],
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error("line.reply.failed", { eventId, httpStatus: response.status });
      return false;
    }
    console.info("line.reply.accepted", { eventId });
    return true;
  } catch {
    console.error("line.reply.failed", { eventId, code: "TRANSPORT_ERROR" });
    return false;
  }
}

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
  const messages = events.flatMap((event) => {
    const parsed = replyEvent.safeParse(event);
    return parsed.success ? [parsed.data] : [];
  });
  if (!messages.length) return new Response("OK");

  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelToken) {
    console.error("line.reply.failed", { code: "LINE_CHANNEL_ACCESS_TOKEN_MISSING" });
    return new Response("Webhook reply unavailable", { status: 503 });
  }

  const replies = await Promise.all(messages.map((event) => replyToMessage(event, channelToken)));
  if (replies.includes(false)) return new Response("LINE reply failed", { status: 502 });
  return new Response("OK");
}
