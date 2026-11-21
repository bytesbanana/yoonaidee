import { intakePool } from "@/lib/db/intake-db";
import { z } from "zod";
import { categoryId, hasCompleteWeights, preferenceCategories } from "@/lib/preferences/categories";
import { pendingWeightCategories } from "@/lib/agent/conversation";

const verifiedToken = z.object({ sub: z.string().min(1) });
const storedProfile = z.object({
  categories: preferenceCategories.optional(),
  budget: z.object({ maxMonthlyRent: z.number().positive().nullable() }).optional(),
  transport: z.object({ primary: z.string().nullable(), preferredModes: z.array(z.string()).optional() }).optional(),
  destinations: z.array(z.object({ name: z.string() })).optional(),
  housing: z.object({ propertyTypes: z.array(z.string()) }).optional(),
});

const weightUpdate = z.object({
  sessionId: z.uuid(),
  version: z.number().int().nonnegative(),
  weights: z.array(z.object({
    category: categoryId,
    weight: z.number().int().min(1).max(100),
  })).min(1).max(categoryId.options.length),
});

type Session = {
  id: string;
  profile_version: number;
  preferences: unknown;
  awaiting_question: string | null;
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
    `SELECT s.id, s.profile_version, s.preferences, s.awaiting_question
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
    if (!update.success || !hasCompleteWeights(update.data.weights)) {
      return json({ error: "Enter a whole percentage for each category. The total must be 100%." }, 400);
    }

    const { sessionId, version, weights } = update.data;
    const session = await readSession(user);
    const conflict = () => json({ error: "Your saved priorities changed. Reload them before saving again." }, 409);
    if (!session || session.id !== sessionId || session.profile_version !== version) return conflict();

    const { categories = [] } = storedProfile.parse(session.preferences);
    const weightsByCategory = new Map(weights.map(({ category, weight }) => [category, weight]));
    if (weights.length !== categories.length || weightsByCategory.size !== categories.length
      || categories.some(({ category }) => !weightsByCategory.has(category))) {
      return json({ error: "Provide one percentage for each saved category." }, 400);
    }

    const updated = categories.map((category) => ({
      ...category,
      weight: weightsByCategory.get(category.category) ?? category.weight,
    }));
    const completedIntake = pendingWeightCategories(session.preferences, session.awaiting_question) !== null;
    const { rows: [saved] } = await intakePool.query<{ profile_version: number }>(
      `UPDATE conversation_sessions
       SET preferences = jsonb_set(preferences, '{categories}', $3::jsonb),
           profile_version = profile_version + 1,
           ready_for_analysis = CASE WHEN $4 THEN true ELSE ready_for_analysis END,
           awaiting_question = CASE WHEN $4 THEN NULL ELSE awaiting_question END,
           state = CASE WHEN $4 THEN 'READY' ELSE state END,
           updated_at = now()
       WHERE id = $1 AND profile_version = $2 AND closed_at IS NULL
         AND awaiting_question IS NOT DISTINCT FROM $5
       RETURNING profile_version`,
      [sessionId, version, JSON.stringify(updated), completedIntake, session.awaiting_question],
    );
    if (!saved) return conflict();
    return json({ categories: updated, version: saved.profile_version });
  } catch {
    console.error("line.settings.write_failed");
    return json({ error: "Could not save your priorities. Try again shortly." }, 503);
  }
}
