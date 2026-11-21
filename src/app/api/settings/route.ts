import { authenticateLine } from "@/lib/line/verify-liff";
import { intakePool, intakeTransaction } from "@/lib/db/intake-db";
import { z } from "zod";
import { categoryId, categoryKey, maxPreferenceCategories, preferenceCategories, preferencePlaces } from "@/lib/preferences/categories";
import { normalizeCategoryLocations } from "@/lib/preferences/locations";

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
    weight: z.number().int().min(1).max(100).nullable(),
    places: preferencePlaces.optional(),
  })).max(maxPreferenceCategories),
});

type Session = {
  id: string;
  profile_version: number;
  preferences: unknown;
};

const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });

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
    const user = await authenticateLine(request, "Profile settings are unavailable. Try again shortly.");
    if (user instanceof Response) return user;
    const session = await readSession(user.userId);
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

export async function DELETE(request: Request) {
  try {
    const user = await authenticateLine(request, "Profile settings are unavailable. Try again shortly.");
    if (user instanceof Response) return user;
    const sessionId = z.uuid().safeParse(new URL(request.url).searchParams.get("sessionId"));
    if (!sessionId.success) return json({ error: "Reload your profile before resetting it." }, 400);

    await intakeTransaction(async (client) => {
      // Take the same user lock as LINE intake before closing the active session.
      const { rows: [owner] } = await client.query<{ id: string }>(
        "SELECT id FROM users WHERE line_user_id = $1 FOR UPDATE",
        [user.userId],
      );
      if (!owner) return;

      await client.query(
        `UPDATE conversation_sessions
         SET preferences = '{}'::jsonb, profile_source_metadata = '{}'::jsonb,
             awaiting_question = NULL, ready_for_analysis = false,
             profile_version = profile_version + 1, state = 'CLOSED',
             closed_at = now(), updated_at = now()
         WHERE id = $1 AND user_id = $2 AND closed_at IS NULL`,
        [sessionId.data, owner.id],
      );
    });
    return new Response(null, { status: 204, headers });
  } catch {
    console.error("line.settings.reset_failed");
    return json({ error: "Could not reset your profile. Try again shortly." }, 503);
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
    const user = await authenticateLine(request, "Profile settings are unavailable. Try again shortly.");
    if (user instanceof Response) return user;
    const update = weightUpdate.safeParse(await request.json().catch(() => null));
    if (!update.success) return json({ error: "Check the locations and percentages for each category." }, 400);
    if (update.data.weights.reduce((total, row) => total + (row.weight ?? 0), 0) > 100) {
      return json({ error: "The combined percentage must be at most 100%." }, 400);
    }

    const { sessionId, version, weights } = update.data;
    if (new Set(weights.map(({ category }) => categoryKey(category))).size !== weights.length) {
      return json({ error: "Each category can only be added once." }, 400);
    }

    const session = await readSession(user.userId);
    const conflict = () => json({ error: "Your saved priorities changed. Reload them before saving again." }, 409);
    if (!session) {
      if (sessionId !== null || version !== null) return conflict();
      const created = await intakeTransaction(async (client) => {
        await client.query(
          `INSERT INTO users (line_user_id, display_name) VALUES ($1, $2)
           ON CONFLICT (line_user_id) DO UPDATE
           SET display_name = EXCLUDED.display_name, updated_at = now()
           WHERE EXCLUDED.display_name IS NOT NULL AND users.display_name IS DISTINCT FROM EXCLUDED.display_name`,
          [user.userId, user.displayName ?? null],
        );
        const categories = weights.map((item) => ({ ...item, places: normalizeCategoryLocations(item.places ?? []) }));
        const { rows: [inserted] } = await client.query<Session>(
          `INSERT INTO conversation_sessions (user_id, preferences, profile_version)
           SELECT id, $2::jsonb, 1 FROM users WHERE line_user_id = $1
           ON CONFLICT (user_id) WHERE closed_at IS NULL DO NOTHING
           RETURNING id, profile_version, preferences`,
          [user.userId, JSON.stringify({ categories })],
        );
        return inserted ? savedPriorities(inserted) : null;
      });
      return created ? json(created) : conflict();
    }

    if (session.id !== sessionId || session.profile_version !== version) return conflict();

    const { categories = [] } = storedProfile.parse(session.preferences);
    const placesByCategory = new Map(categories.map(({ category, places }) => [category, places]));
    const updated = weights.map((item) => ({
      ...item,
      places: item.places ? normalizeCategoryLocations(item.places) : placesByCategory.get(item.category) ?? [],
    }));
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
