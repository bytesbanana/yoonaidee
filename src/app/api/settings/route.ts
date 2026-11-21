import { intakePool, intakeTransaction } from "@/lib/db/intake-db";
import { z } from "zod";
import { categoryId, preferenceCategories } from "@/lib/preferences/categories";

const verifiedToken = z.object({ sub: z.string().min(1) });
const verifiedAccessToken = z.object({ client_id: z.string(), expires_in: z.number() });
const lineProfile = z.object({ userId: z.string().min(1) });
const storedProfile = z.object({
  categories: preferenceCategories.optional(),
  budget: z.object({ maxMonthlyRent: z.number().positive().nullable() }).optional(),
  transport: z.object({ primary: z.string().nullable(), preferredModes: z.array(z.string()).optional() }).optional(),
  destinations: z.array(z.object({ name: z.string() })).optional(),
  housing: z.object({ propertyTypes: z.array(z.string()) }).optional(),
});

const weightUpdate = z.object({
  sessionId: z.uuid().nullable(),
  version: z.number().int().nonnegative().nullable(),
  weights: z.array(z.object({
    category: categoryId,
    weight: z.number().int().min(1).max(100),
  })).max(categoryId.options.length),
});

type Session = {
  id: string;
  profile_version: number;
  preferences: unknown;
};

const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

async function authenticate(request: Request) {
  // The LIFF ID is deployment configuration. Never choose the expected channel from a request token.
  const liffChannelId = process.env.NEXT_PUBLIC_LIFF_ID?.trim().match(/^(\d+)-[a-zA-Z0-9]+$/)?.[1];
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim() || liffChannelId;
  const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());
  if (!channelId || !databaseConfigured) {
    console.error("line.settings.missing_config", {
      lineChannelConfigured: Boolean(channelId),
      databaseConfigured,
    });
    return json({ error: "Profile settings are unavailable. Try again shortly." }, 503);
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || token.length > 8192) {
    return json({ error: "Sign in with LINE to access your settings." }, 401);
  }

  const verifyUrl = "https://api.line.me/oauth2/v2.1/verify";
  const options = { signal: AbortSignal.timeout(5000), cache: "no-store" as const };
  const unauthorized = () => json({ error: "Sign in with LINE again to access your preferences." }, 401);
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
    return lineProfile.parse(await profile.json()).userId;
  }

  const verification = await fetch(verifyUrl, {
    ...options,
    method: "POST",
    body: new URLSearchParams({ id_token: token, client_id: channelId }),
  });
  if (verification.status === 400 || verification.status === 401) return unauthorized();
  if (!verification.ok) throw new Error("LINE verification unavailable");
  return verifiedToken.parse(await verification.json()).sub;
}

async function readSession(lineUserId: string) {
  const { rows: [session] } = await intakePool.query<Session>(
    `SELECT s.id, s.profile_version, s.preferences
     FROM conversation_sessions s JOIN users u ON u.id = s.user_id
     WHERE u.line_user_id = $1 AND s.closed_at IS NULL`,
    [lineUserId],
  );
  return session;
}

export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    if (user instanceof Response) return user;
    const session = await readSession(user);
    if (!session) return json({ settings: null });

    const data = storedProfile.parse(session.preferences);
    return json({
      settings: {
        sessionId: session.id,
        version: session.profile_version,
        categories: data.categories ?? [],
        budget: data.budget?.maxMonthlyRent ?? null,
        transport: data.transport?.primary ?? null,
        preferredModes: data.transport?.preferredModes ?? [],
        destination: data.destinations?.[0]?.name ?? null,
        housing: data.housing?.propertyTypes ?? [],
      },
    });
  } catch {
    console.error("line.settings.read_failed");
    return json({ error: "Could not load housing settings. Try again shortly." }, 503);
  }
}

function savedPriorities(session: Session) {
  return {
    sessionId: session.id,
    version: session.profile_version,
    categories: storedProfile.parse(session.preferences).categories ?? [],
  };
}

export async function PATCH(request: Request) {
  try {
    const user = await authenticate(request);
    if (user instanceof Response) return user;
    const update = weightUpdate.safeParse(await request.json().catch(() => null));
    if (!update.success || update.data.weights.reduce((total, row) => total + row.weight, 0) > 100) {
      return json({ error: "Enter whole percentages from 1 to 100 with a combined total of at most 100%." }, 400);
    }

    const { sessionId, version, weights } = update.data;
    if (new Set(weights.map(({ category }) => category)).size !== weights.length) {
      return json({ error: "Each category can only be added once." }, 400);
    }

    const session = await readSession(user);
    const conflict = () => json({ error: "Your saved priorities changed. Reload them before saving again." }, 409);
    if (!session) {
      if (sessionId !== null || version !== null) return conflict();
      const created = await intakeTransaction(async (client) => {
        await client.query("INSERT INTO users (line_user_id) VALUES ($1) ON CONFLICT DO NOTHING", [user]);
        const categories = weights.map((item) => ({ ...item, places: [] }));
        const { rows: [inserted] } = await client.query<Session>(
          `INSERT INTO conversation_sessions (user_id, preferences, profile_version)
           SELECT id, $2::jsonb, 1 FROM users WHERE line_user_id = $1
           ON CONFLICT (user_id) WHERE closed_at IS NULL DO NOTHING
           RETURNING id, profile_version, preferences`,
          [user, JSON.stringify({ categories })],
        );
        return inserted ? savedPriorities(inserted) : null;
      });
      return created ? json(created) : conflict();
    }

    if (session.id !== sessionId || session.profile_version !== version) return conflict();

    const { categories = [] } = storedProfile.parse(session.preferences);
    const placesByCategory = new Map(categories.map(({ category, places }) => [category, places]));
    const updated = weights.map((item) => ({ ...item, places: placesByCategory.get(item.category) ?? [] }));
    const { rows: [saved] } = await intakePool.query<Session>(
      `UPDATE conversation_sessions
       SET preferences = jsonb_set(preferences, '{categories}', $3::jsonb),
           profile_version = profile_version + 1,
           updated_at = now()
       WHERE id = $1 AND profile_version = $2 AND closed_at IS NULL
       RETURNING id, profile_version, preferences`,
      [sessionId, version, JSON.stringify(updated)],
    );
    if (!saved) return conflict();
    return json(savedPriorities(saved));
  } catch {
    console.error("line.settings.write_failed");
    return json({ error: "Could not save your priorities. Try again shortly." }, 503);
  }
}
