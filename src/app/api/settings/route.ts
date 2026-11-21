import { intakePool, intakeTransaction } from "@/lib/db/intake-db";
import { z } from "zod";
import { categoryId, preferenceCategories } from "@/lib/preferences/categories";

const verifiedToken = z.object({ sub: z.string().min(1) });
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
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId || !process.env.DATABASE_URL) {
    return json({ error: "Settings service is not configured." }, 503);
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || token.length > 8192) {
    return json({ error: "Sign in with LINE to access your settings." }, 401);
  }

  const verification = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    body: new URLSearchParams({ id_token: token, client_id: channelId }),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  if (verification.status === 400 || verification.status === 401) {
    return json({ error: "Your LINE session has expired. Sign in again." }, 401);
  }
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
        const { rows: [inserted] } = await client.query<{ id: string; profile_version: number }>(
          `INSERT INTO conversation_sessions (user_id, preferences, profile_version)
           SELECT id, $2::jsonb, 1 FROM users WHERE line_user_id = $1
           ON CONFLICT (user_id) WHERE closed_at IS NULL DO NOTHING
           RETURNING id, profile_version`,
          [user, JSON.stringify({ categories })],
        );
        return inserted ? { sessionId: inserted.id, version: inserted.profile_version, categories } : null;
      });
      return created ? json(created) : conflict();
    }

    if (session.id !== sessionId || session.profile_version !== version) return conflict();

    const { categories = [] } = storedProfile.parse(session.preferences);
    const placesByCategory = new Map(categories.map(({ category, places }) => [category, places]));
    const updated = weights.map((item) => ({ ...item, places: placesByCategory.get(item.category) ?? [] }));
    const { rows: [saved] } = await intakePool.query<{ profile_version: number }>(
      `UPDATE conversation_sessions
       SET preferences = jsonb_set(preferences, '{categories}', $3::jsonb),
           profile_version = profile_version + 1,
           updated_at = now()
       WHERE id = $1 AND profile_version = $2 AND closed_at IS NULL
       RETURNING profile_version`,
      [sessionId, version, JSON.stringify(updated)],
    );
    if (!saved) return conflict();
    return json({ sessionId, categories: updated, version: saved.profile_version });
  } catch {
    console.error("line.settings.write_failed");
    return json({ error: "Could not save your priorities. Try again shortly." }, 503);
  }
}
