# ARCHITECTURE — Hackathon MVP

**Principle:** One Next.js/Node.js codebase, one PostgreSQL database, one prepared neighborhood dataset. Keep the LINE webhook fast and the AI path replaceable by a mock.
**Deployment:** not settled yet — plan is Docker Compose (`web` + `db`) with the **job worker in a separate repo** sharing the same `DATABASE_URL`. Until the app scaffold lands, run Next.js and Postgres however is fastest locally.

**Implemented intake:** The Next.js webhook verifies LINE events, reads the active PostgreSQL profile by verified LINE `userId`, and runs Codex intake inline. When a one-on-one text message reaches Codex intake, the webhook requests LINE’s native loading indicator for up to 10 seconds. Missing destination, monthly rent ceiling, or transport gets a direct text reply and no job. The transport question includes an optional lifestyle invitation if no lifestyle preference is known; lifestyle does not gate analysis. Once all three are known, the bot asks for confirmation. Only an explicit confirmation of that prompt queues an `ANALYSIS` job and, after commit, triggers a Thai `SEARCHING` Flex push message with a button that opens the LINE Mini App. While an analysis is active, intake silently ignores new messages for that user. See [current intake flow](docs/line-codex-current-flow.svg). The diagrams and queue names below describe the older planned architecture, not current intake. The separate analysis worker is still required to consume the jobs and deliver results.

The webhook saves the display name returned by LINE in `users.display_name` alongside the LINE user ID. A failed profile lookup preserves the last saved name. When a settings save creates a session, it also saves the display name if LINE provides it during authentication.
Codex returns intake answer suggestions alongside profile extraction. The app selects only suggestions for the question it actually asks, with localized transport options as fallback. Search confirmation uses a fixed localized command. `src/lib/line/quick-reply.ts` builds LINE message actions; taps follow the existing text webhook path. Suggestions are not persisted.

## 1. High-level design

```mermaid
flowchart TD
    U[User in LINE] --> L[LINE Messaging API]
    L --> W[Next.js webhook route]
    W -->|verify, dedupe, enqueue| DB[(PostgreSQL)]
    W -->|HTTP 200 quickly| L
    P[Node worker<br/>(separate repo)] -->|claim job| DB
    P --> C[Conversation AI]
    C -->|need info| L
    C -->|ready| A[Research agent]
    A --> T[Neighborhood search/detail tools]
    T --> J[Prepared Bangkok JSON]
    A --> S[Deterministic scoring + Zod validation]
    S --> DB
    P --> F[LINE Flex builder + Push API]
    F --> L
    U --> R[LIFF / Next.js results page]
    R --> DB
```

Two logical AI stages, **not** two services or a complicated multi-agent framework. Devs can build mocks independently. Do not make external services a dependency for the core demo.

## 2. Stack

| Concern | Choice |
| --- | --- |
| UI + API | Next.js App Router + TypeScript |
| Client data fetching | TanStack Query |
| Runtime | Node.js (Next.js server + separate worker repo); Docker Compose planned |
| Styling | Tailwind CSS; shadcn/ui only if useful |
| AI | OpenAI API, tool calling, structured output |
| Validation | Zod at external/system boundaries |
| Persistence + queue | PostgreSQL, SQL via `pg` |
| LINE | Messaging API Webhook, Push, Flex and optional LIFF |
| Source data | Versioned `data/neighborhoods.json` snapshot |
| Maps, rental provider | Optional stretch integrations, not blockers |

**Why a persistent Node process?** Serverless request lifetimes make a reliable polling worker a bad fit, so the worker needs a long-lived process — deployed separately from this repo.

### Deployment (planned, not built yet)
- **This repo:** Next.js web app + PostgreSQL, wrapped in a `docker-compose.yml` (`web` + `db`) when we start building.
- **Worker:** separate repo, separate deploy, same `DATABASE_URL`.
- **Local before that:** any Postgres + `npm run dev` is fine. Don't spend time on infra yet.

## 3. Request/worker sequence

```mermaid
sequenceDiagram
    participant User
    participant LINE
    participant API as Webhook/API
    participant DB as Postgres
    participant Worker as Worker (other repo)
    participant AI as OpenAI + Tools
    User->>LINE: Message
    LINE->>API: POST webhook
    API->>API: Verify signature
    API->>DB: Store event id, enqueue CONVERSATION
    API-->>LINE: 200 OK
    Worker->>DB: Claim next job
    Worker->>AI: Extract profile
    alt Missing required detail
        Worker->>LINE: Push one question
    else Ready
        Worker->>DB: Enqueue ANALYSIS
        Worker->>AI: Call neighborhood tools, explain
        Worker->>DB: Save validated result
        Worker->>LINE: Push Flex summary
    end
    User->>API: Open LIFF result URL
    API->>DB: Read result
    API-->>User: Mobile result page
```

**Important:** Never await OpenAI inside the webhook. Verify raw request bytes before JSON parsing if required by the LINE SDK; use constant-time signature comparison via the SDK. Acknowledge successfully persisted events, not events lost in memory.

## 4. Suggested repository structure

```text
src/
  app/
    api/line/webhook/route.ts
    api/jobs/[id]/route.ts
    api/results/[id]/route.ts
    results/[id]/page.tsx
  components/recommendation-card.tsx
  lib/
    db/schema.ts
    db/client.ts
    line/verify.ts
    line/push.ts
    line/build-recommendation-flex.ts
    agent/conversation.ts
    agent/research.ts
    agent/schemas.ts
    neighborhoods/load.ts
    neighborhoods/tools.ts
    scoring/score-neighborhoods.ts
    jobs/queue.ts
  types/recommendation.ts
  fixtures/recommendation.mock.json
data/neighborhoods.json
AGENTS.md
PRD.md
ARCHITECTURE.md
SCHEMA.md
CODING_STANDARD.md
```

## 5. Responsibilities and data flow

**Conversation agent** → message and previous profile → validated `PreferenceProfile` → either one clarification question or `ready: true`.

**Research agent** → profile → `searchNeighborhoods(filters)` → `getNeighborhoodDetails(ids)` → validated candidate facts → scoring code → AI-written summary/reasons/trade-offs → validated `RecommendationResult`.

**Scoring code** → explicit available features and chosen weights → normalized values/overall score. No freehand AI arithmetic. Keep scoring deterministic for the same inputs. Missing feature ≠ zero; disclose missing evidence and confidence. Never describe an estimated commute as verified transit time.

**Flex builder** → `RecommendationResult` → LINE Flex object, respecting LINE component limits. UI should not make its own ranking decisions.

## 6. Minimal persistence

| Table | Important columns |
| --- | --- |
| `line_events` | `event_id` unique, `line_user_id`, `received_at` |
| `conversations` | `line_user_id` unique, `profile_json`, `state`, `updated_at` |
| `jobs` | `id`, `type`, `status`, `payload_json`, `attempts`, `run_after`, `lease_until`, `last_error`, `created_at` |
| `results` | `id`, `line_user_id`, `result_json`, `created_at` |

`jobs.status`: `queued`, `running`, `completed`, `failed`. UI may show `collecting`, `scoring`, `explaining` as optional progress metadata. Claim jobs in a transaction using `FOR UPDATE SKIP LOCKED`. A lease expiration allows recovery after a process crash. Deduplicate LINE event IDs and serialize work per conversation to avoid out-of-order preference updates.

**Ownership split:** this repo **writes** the queue (`src/lib/jobs/queue.ts` — enqueue + status reads for the UI). The **worker lives in a separate repo** and owns claiming, running, leasing and retrying jobs against the same `jobs` table. Both sides agree on the table shape in [SCHEMA.md](./SCHEMA.md) — change it in both repos together. Never start a worker loop inside this repo's web process.

## 7. Contracts and boundaries

```ts
type PreferenceProfile = {
  workplace: { text: string; lat?: number; lng?: number } | null;
  budget: { max: number; currency: 'THB' } | null;
  transport: { primary: 'public_transit' | 'car' | 'walk' | 'other' | 'unknown' };
  lifestyle: Record<string, 'low' | 'medium' | 'high'>;
};

type Job = {
  id: string;
  type: 'CONVERSATION' | 'ANALYSIS';
  status: 'queued' | 'running' | 'completed' | 'failed';
};
```

See `PRD.md` for **canonical** `RecommendationResult` and `buildRecommendationFlex` signatures. Create Zod runtime schemas mirroring these types; no duplicated hand-maintained interfaces.

Tool contracts:

```ts
searchNeighborhoods(input: {
  query?: string;
  maxRentThb?: number;
  nearTransit?: boolean;
}): Promise<Array<{ id: string; name: string }>>;

getNeighborhoodDetails(input: {
  ids: string[];
}): Promise<Array<NeighborhoodRecord>>;
```

Use tool data as untrusted input; validate IDs and fields. Limit tool calls and candidate count to control latency/cost.

## 8. Failure handling and demo fallback

- Invalid LINE signature → `401`; duplicate event → idempotent `200` without duplicate work.
- OpenAI timeout/error → retry bounded number of times, then short LINE error message.
- Invalid model JSON → Zod rejection, one controlled retry, then fallback.
- Missing rent/commute source → `null` or disclose unknown, never invent.
- External API unavailable → use versioned prepared neighborhood snapshot.
- LINE push failure → log and retry delivery without rerunning the entire recommendation.
- Secret keys → environment variables only; avoid logging message contents or tokens.

## 9. Environment variables

```dotenv
OPENAI_API_KEY=
# Web service intake; choose a supported Codex model.
CODEX_MODEL=
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
DATABASE_URL=
NEXT_PUBLIC_LIFF_ID=
NEXT_PUBLIC_APP_URL=
MOCK_AGENT=false
```

Never put server secrets in `NEXT_PUBLIC_*` variables.

Env wiring: `DATABASE_URL` points at the local Postgres for development (`postgresql://app:app@localhost:5432/app`). Copy `.env.example` → `.env` and fill in real values. Never put server secrets in `NEXT_PUBLIC_*` variables.

## 10. Integration order

1. Freeze shared types + fixture and neighborhood JSON format.
2. Get webhook verification + database enqueue + LINE push working.
3. Connect mock result to Flex builder; demo the whole path.
4. Replace mock with conversation extraction + agent tools.
5. Add scoring/validation, a results page and progress if time remains.
6. Run a full live rehearsal and keep a mock fallback ready.

**Deployment dependency (not settled):** the demo needs a public HTTPS URL for the LINE webhook and a reachable Postgres for both this repo and the worker repo. Docker Compose is the plan; details get decided when the scaffold starts.
