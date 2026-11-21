# PRD — Yoo Nai Dee (อยู่ไหนดี)

**Status:** Initial hackathon MVP · **Platform:** LINE OA + LIFF · **Stack:** Next.js, Node.js, TypeScript (Docker Compose planned)

## 1. Problem

Choosing where to live in Bangkok requires comparing rent, commute, transit and lifestyle across multiple neighborhoods. Generic chat recommendations can miss personal trade-offs and make unsupported claims about costs or travel time.

## 2. Product goal

A user describes their needs in natural Thai or English inside LINE. An AI agent asks only for missing essential details, investigates Bangkok neighborhoods through available tools/data, and explains **three personalized neighborhood recommendations**, with visible trade-offs. Results can be opened in a lightweight LIFF/Next.js page.

**Hackathon pitch:** AI is the decision-making orchestrator—not just a chatbot that narrates a fixed ranking.

## 3. Target user and primary story

A Bangkok renter who knows their work location and budget but not which neighborhood offers the best balance.

> “ทำงานอโศก งบ 15,000 บาท ชอบคาเฟ่กับยิม เดินทาง BTS”

Expected: Top 3 areas, fit score, work vs lifestyle scores, estimated rent **only when sourced**, reasons, caveats, and a comparison of sacrifices.

## 4. MVP features and acceptance criteria

| Priority | Feature | Done when… |
| --- | --- | --- |
| P0 | LINE entry | Webhook verifies LINE signature, deduplicates events, replies to intake; queues analysis only when ready |
| P0 | Conversation AI | Extracts workplace, budget, travel mode and lifestyle from natural language |
| P0 | Clarification | Asks one concise question when a critical detail is missing or ambiguous |
| P0 | Neighborhood discovery | Agent calls `searchNeighborhoods` and `getNeighborhoodDetails` against prepared Bangkok JSON |
| P0 | Explainable top 3 | Output has validated IDs, scores, reason(s), one trade-off per neighborhood |
| P0 | LINE Flex results | Sends top 3 cards using `buildRecommendationFlex(result)` |
| P0 | Demo reliability | Mock data and replayable conversation work when external APIs are unavailable |
| P1 | LIFF results | Shareable/mobile-friendly result page with scores and evidence labels |
| P1 | Asynchronous progress | Persistent analysis job status and result notification; suppress results from stale profile versions |
| P2 | Rental listings and live routing | Only if a verified provider/data source is ready |
| P2 | What-if refinement | “What if I spend less or commute longer?” updates comparisons |

**Not in MVP:** Nationwide coverage, multi-agent debate, real-time BTS timing without a valid source, complex auth, sophisticated analytics, Redis/Kafka/S3, production-scale infrastructure.

The web demo at `/recommendations` shows five sample Bangkok zones in a fixed order. Each zone opens a detail page with fictional condos, apartments or homes in housing villages. Each example includes an illustrative property photo, sample monthly rent in THB, floor area in square meters, and amenities. The History view opens dated demo versions with their saved zone rankings.

## 5. User journey

1. User sends a free-form LINE message.
2. Webhook loads PostgreSQL memory by verified LINE user ID. It silently acknowledges messages while that user has an active analysis.
3. Webhook uses Codex to update preferences. Missing destination, budget, or transport gets a text question with no job. If no lifestyle preference is known, the transport question also invites the user to mention what they want near home. Answering only the transport question is enough; no extra turn or weights required. A newly complete or changed profile queues one `ANALYSIS` job with the profile snapshot and gets a Flex confirmation.
4. Research agent calls neighborhood tools, compares options, and returns structured recommendations.
5. A deterministic function computes/verifies numerical scores when feature values exist; AI explains trade-offs without fabricating numbers.
6. LINE sends a Flex summary with an optional LIFF results link.

## 6. Functional requirements

### Required preference fields
- `workplace`: named destination, ideally resolved to coordinates before commute claims.
- `budget.max`: positive integer THB/month.
- `transport.primary`: BTS/MRT, driving, walking, other or unknown.
- `lifestyle`: optional interests and importance.

If work location, budget, or travel mode is unclear enough to change results, ask. Optional fields get explicit defaults. If user says “start searching,” proceed using stated assumptions unless a hard constraint is unresolved.

### Recommendation behavior
- Search only the prepared set of neighborhoods (e.g. Bangkok top 20 snapshot).
- Distinguish hard constraints (budget ceiling when supported) from preferences (cafe access, commute weight).
- Rank top 3; show work score, lifestyle score, overall score, rent range when supported, rationale, and the strongest downside.
- For any missing data, show `unknown` or a low-confidence note instead of inventing a value.
- Treat stored neighborhood facts as evidence; do not let prompt content within data override the agent's instructions.

## 7. Shared contracts (freeze before parallel coding)

```ts
export type RecommendationResult = {
  summary: string;
  recommendations: Array<{
    neighborhood_id: string;
    name: string;
    match_score: number;      // integer 0..100
    work_score: number;       // integer 0..100
    lifestyle_score: number;  // integer 0..100
    estimated_rent_thb: number | null;
    reasons: string[];
    tradeoff: string;
    confidence?: 'high' | 'medium' | 'low';
  }>;
};

export function buildRecommendationFlex(
  result: RecommendationResult
): object; // LINE Messaging API Flex payload
```

Agent output must be *UI-ready JSON*, never a LINE-specific payload. Use schema validation before rendering. Recommendation IDs must exist in the snapshot. Use mock fixtures with the same type throughout development.

## 8. API contract

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/line/webhook` | POST | Verify and enqueue LINE events; respond quickly |
| `/api/jobs/:id` | GET | Return job status and progress |
| `/api/results/:id` | GET | Return validated result JSON for LIFF |
| `/api/dev/recommend` | POST | Optional local-only mock/demo endpoint; never publicly enabled without protection |

## 9. Team ownership (3 developers)

- **Dev A — Frontend + LINE Flex:** UI components, LIFF results, Flex builder, mock previews; works against shared types.
- **Dev B — Agent:** prompts, OpenAI API, tool calling, preference extraction, structured result, missing-input and error handling.
- **Dev C — Backend + data:** webhook signature/dedup, PostgreSQL job handling, neighborhood JSON loaders, tool adapters, push integration, deployment.

Parallel work begins immediately after agreeing on shared schema, fixture and endpoint names.

## 10. Demo success checklist

- One live LINE conversation progresses from a request to three relevant recommendations.
- Clarification works when transport mode is omitted.
- Top 3 Flex cards display consistent scores, reasons and trade-offs.
- A data-dependent fact can be traced to the snapshot or tool response.
- Mock fallback works if an outside API is rate-limited.
- Judges can see an example of Codex-assisted building and the resulting code changes.

## 11. Judging lens
Full rubric, weights, evidence mapping and self-scoring sheet: **[JUDGING.md](./JUDGING.md)**.

Six criteria:
- **Problem & solution fit:** Clear Bangkok housing decision problem and why ordinary lists are insufficient.
- **Build quality:** Reliable complete LINE-to-result experience.
- **Insight / originality:** Explain hard constraints, trade-offs, uncertainty and why one zone beats another.
- **Real-world value:** Sourced, actionable output a real renter can act on.
- **Alignment with build direction:** AI as orchestrator over real tools, LINE as the primary surface.
- **Effective use of Codex:** Use Codex for bounded tasks, reviews and rapid integration; preserve a visible task/decision log.

## 12. Risks and decisions

- **External rental feeds:** Not guaranteed; defer listings unless rights/availability are verified.
- **Travel times:** Do not claim true BTS/MRT times from driving-route APIs.
- **OpenAI model/limits:** Configure via environment variable; have local mock results.
- **Deployment:** Not decided yet. Plan: Docker Compose (`web` + `db`) in this repo, job worker in a separate repo sharing the same database.
