import { intakePool } from "@/lib/db/intake-db";
import { z } from "zod";
import { preferenceCategories } from "@/lib/preferences/categories";

const verifiedToken = z.object({ sub: z.string().min(1) });
const storedProfile = z.object({
  categories: preferenceCategories.optional(),
  budget: z.object({ maxMonthlyRent: z.number().positive().nullable() }).optional(),
  transport: z.object({ primary: z.string().nullable(), preferredModes: z.array(z.string()).optional() }).optional(),
  destinations: z.array(z.object({ name: z.string() })).optional(),
  housing: z.object({ propertyTypes: z.array(z.string()) }).optional(),
});

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId || !process.env.DATABASE_URL) {
    return Response.json({ error: "Settings service is not configured." }, { status: 503, headers });
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || token.length > 8192) {
    return Response.json({ error: "Sign in with LINE to view your settings." }, { status: 401, headers });
  }

  try {
    const verification = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      body: new URLSearchParams({ id_token: token, client_id: channelId }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (verification.status === 400 || verification.status === 401) {
      return Response.json({ error: "Your LINE session has expired. Sign in again." }, { status: 401, headers });
    }
    if (!verification.ok) throw new Error("LINE verification unavailable");
    const { sub } = verifiedToken.parse(await verification.json());
    const { rows: [session] } = await intakePool.query<{ preferences: unknown }>(
      `SELECT s.preferences
       FROM conversation_sessions s JOIN users u ON u.id = s.user_id
       WHERE u.line_user_id = $1 AND s.closed_at IS NULL`,
      [sub],
    );
    const data = session ? storedProfile.parse(session.preferences) : null;
    const settings = data ? {
      categories: data.categories ?? [],
      budget: data.budget?.maxMonthlyRent ?? null,
      transport: data.transport?.primary ?? null,
      preferredModes: data.transport?.preferredModes ?? [],
      destination: data.destinations?.[0]?.name ?? null,
      housing: data.housing?.propertyTypes ?? [],
    } : null;
    return Response.json({ settings }, { headers });
  } catch {
    console.error("line.settings.read_failed");
    return Response.json({ error: "Could not load housing settings. Try again shortly." }, { status: 503, headers });
  }
}
