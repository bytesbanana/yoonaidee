import { z } from "zod";

const verifiedToken = z.object({ sub: z.string().min(1), name: z.string().min(1).optional() });
const verifiedAccessToken = z.object({ client_id: z.string(), expires_in: z.number() });
const lineProfile = z.object({ userId: z.string().min(1), displayName: z.string().min(1).optional() });

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function authenticateLine(request: Request, unavailable: string) {
  // The LIFF ID is deployment configuration. Never choose the expected channel from a request token.
  const liffChannelId = process.env.NEXT_PUBLIC_LIFF_ID?.trim().match(/^(\d+)-[a-zA-Z0-9]+$/)?.[1];
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim() || liffChannelId;
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());
  if (!channelId || !databaseConfigured) {
    console.error("line.auth.missing_config", {
      lineChannelConfigured: Boolean(channelId),
      databaseConfigured,
    });
    return json({ error: unavailable }, 503);
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || token.length > 8192) {
    return json({ error: "Sign in with LINE to continue." }, 401);
  }

  const verifyUrl = "https://api.line.me/oauth2/v2.1/verify";
  const options = { signal: AbortSignal.timeout(5000), cache: "no-store" as const };
  const unauthorized = () => json({ error: "Sign in with LINE again to continue." }, 401);
  if (request.headers.get("x-line-token-type") === "access") {
    const query = new URLSearchParams({ access_token: token });
    const verification = await fetch(`${verifyUrl}?${query}`, options);
    if (verification.status === 400 || verification.status === 401) return unauthorized();
    if (!verification.ok) throw new Error("LINE verification unavailable");
    const { client_id, expires_in } = verifiedAccessToken.parse(await verification.json());
    if (client_id !== channelId || expires_in <= 0) return unauthorized();

    const profile = await fetch("https://api.line.me/v2/profile", {
      ...options,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (profile.status === 401 || profile.status === 403) return unauthorized();
    if (!profile.ok) throw new Error("LINE profile unavailable");
    return lineProfile.parse(await profile.json());
  }

  const verification = await fetch(verifyUrl, {
    ...options,
    method: "POST",
    body: new URLSearchParams({ id_token: token, client_id: channelId }),
  });
  if (verification.status === 400 || verification.status === 401) return unauthorized();
  if (!verification.ok) throw new Error("LINE verification unavailable");
  const { sub, name } = verifiedToken.parse(await verification.json());
  return { userId: sub, displayName: name };
}
