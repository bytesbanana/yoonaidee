# AGENT — Entry Point for Coding Agents
> **This file is a router.** Read the documents below before making code changes. For Codex and other agents that automatically discover `AGENTS.md`, an identical `AGENTS.md` is provided.

## Hackathon reality (read this first)
- **Requirements are a starting point, not a contract.** PRD/ARCHITECTURE describe the intended demo, but scope, stack and data will change mid-hackathon. Treat them as *current best guess*.
- **Do not take requirements literally at the cost of shipping.** If the spec says X but a working demo needs Y, build Y, keep it obvious, and note the deviation in your summary. Do not silently fake a requirement either.
- **Change freely, keep it small.** Editing PRD.md / ARCHITECTURE.md / this file is normal and expected. Update the doc in the same change when behavior moves, so the next agent isn't misled.
- **Prefer a working end-to-end path over a spec-complete one.** Cut scope, stub data, hardcode, duplicate — then swap in the real thing later. Nothing is sacred except secrets, data honesty (no invented facts), and the demo path working.
- **Don't block on ambiguity.** Make a reasonable call, record the assumption in the summary, keep moving.
- **Skip ceremony.** No test suites, no lint bikeshedding, no speculative abstractions, no waiting for review. Ship the vertical slice.

## Read in this order
1. **[PRD.md](./PRD.md)** — What the product must do, MVP scope, user journey, acceptance criteria, shared result contract, team ownership.
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — How the Next.js/Node.js/LINE/OpenAI/PostgreSQL pieces connect, job flow, tool boundaries, deployment plan.
3. **[SCHEMA.md](./SCHEMA.md)** — Database tables, columns, indexes, and job/queue semantics.
4. **[CODING_STANDARD.md](./CODING_STANDARD.md)** — How to code quickly for this hackathon: pragmatic DRY/SRP, no automated tests, manual smoke checks, error handling.
5. **[JUDGING.md](./JUDGING.md)** — Judging criteria, weights, evidence a judge can see, and the pre-demo self-scoring sheet. Read before demo-day polish.

## Agent operating rules
- **Goal:** Deliver a reliable live LINE → AI → top-3 recommendation demo, not a production platform.
- **Source of truth:** PRD defines features and shared contracts; Architecture defines system boundaries; Coding Standard defines style. They are guides, not law — when they conflict with reality or with shipping, pick the simpler option, implement it, and update the doc.
- **Before editing:** State target feature, files you will touch and assumptions — briefly, one or two lines. Preserve existing public types unless the change requires breaking them.
- **While editing:** Make small changes, keep shared schemas intact, do not invent neighborhood facts, rent, transit times or scores. Validate all model output.
- **After editing:** Summarize files changed, commands run, manual checks done, assumptions, and blockers. Do not claim checks that were not performed.
- **Priority order:** Working end-to-end flow > demo reliability > explainable agent behavior > UI polish > stretch features.
- **Avoid:** Premature abstractions, new infrastructure, test frameworks, multi-agent debate, long refactors, and any scope not requested in the PRD. Do avoid *silently* dropping requested scope — if you skip it, say so in your summary.

## Work allocation
- **Dev A:** `src/components/**`, `src/app/results/**`, `src/lib/line/build-recommendation-flex.ts`
- **Dev B:** `src/lib/agent/**`, `src/lib/scoring/**`
- **Dev C:** `src/app/api/**`, `src/lib/db/**`, `src/lib/jobs/**` (enqueue side only), `src/lib/neighborhoods/**`
- **Shared:** `src/types/recommendation.ts`, `src/lib/db/schema.ts`, mock JSON fixture, environment variable names — agree before editing.

## Running locally
Not scaffolded yet. When the app starts: `cp .env.example .env`, run a Postgres, `npm run dev`. Docker Compose (`web` + `db`) is the planned local setup — add it when the scaffold lands, not before. The job worker lives in a **separate repo** and polls the same `jobs` table; this repo only enqueues. See `SCHEMA.md` for table definitions.

## Recommended first task
Implement a single vertical slice using mock JSON: receive a LINE webhook, enqueue/deliver a valid mock `RecommendationResult`, and render it through `buildRecommendationFlex`. Then replace mocks with real agent and data calls.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
