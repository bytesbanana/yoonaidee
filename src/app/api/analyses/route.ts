import { z } from "zod";
import { intakePool } from "@/lib/db/intake-db";
import { authenticateLine } from "@/lib/line/verify-liff";
import { resultSchema } from "@/lib/analyses/result";

const unavailable = "Could not load your analysis results. Try again shortly.";
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

const ownedResults = `
  FROM analysis_results r
  JOIN analysis_jobs j ON j.id = r.job_id
  JOIN conversation_sessions s ON s.id = j.session_id
  JOIN users u ON u.id = s.user_id
  WHERE u.line_user_id = $1 AND j.job_type = 'ANALYSIS' AND j.status = 'COMPLETED'`;
const summaryColumns = `r.id, r.created_at AS "createdAt",
  r.profile_snapshot #>> '{destinations,0,name}' AS destination`;
const newestFirst = "ORDER BY r.created_at DESC, r.id DESC";

export async function GET(request: Request) {
  try {
    const user = await authenticateLine(request, unavailable);
    if (user instanceof Response) return user;
    const params = new URL(request.url).searchParams;
    const id = params.get("result");

    if (id === null && params.get("view") === "history") {
      const { rows } = await intakePool.query(
        `SELECT ${summaryColumns} ${ownedResults} ${newestFirst} OFFSET 1`,
        [user.userId],
      );
      return json({ history: rows });
    }

    if (id !== null && !z.uuid().safeParse(id).success) {
      return json({ error: "This analysis result is unavailable." }, 404);
    }

    const { rows: [row] } = await intakePool.query(
      `SELECT ${summaryColumns}, r.result_schema_version, r.result_data
       ${ownedResults} ${id === null ? "" : "AND r.id = $2"} ${newestFirst} LIMIT 1`,
      id === null ? [user.userId] : [user.userId, id],
    );

    if (!row) {
      return id === null ? json({ analysis: null }) : json({ error: "This analysis result is unavailable." }, 404);
    }

    const parsed = resultSchema.safeParse(row.result_data);
    if (row.result_schema_version !== 1 || !parsed.success) {
      console.error("line.analyses.invalid_result", { resultId: row.id });
      return json({ error: "This saved analysis could not be displayed." }, 422);
    }

    return json({
      analysis: { id: row.id, createdAt: row.createdAt, destination: row.destination, result: parsed.data },
    });
  } catch {
    console.error("line.analyses.read_failed");
    return json({ error: unavailable }, 503);
  }
}
