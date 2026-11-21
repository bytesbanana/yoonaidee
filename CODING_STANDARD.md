# CODING_STANDARD — Hackathon Speed Rules

**Goal:** Ship a working end-to-end demo quickly. Favor readable, small, boring code over enterprise architecture.

## 1. Rules of thumb

1. **TypeScript throughout.** Use strict types at shared interfaces; avoid `any` for API/agent outputs.
2. **DRY, pragmatically.** Extract code once it is reused; do not build abstraction layers for hypothetical reuse.
3. **SRP, pragmatically.** Each function/module should have one understandable job. Avoid gigantic route handlers and giant agent prompts.
4. **KISS / YAGNI.** No microservices, event bus, generic plugin architecture, or complex dependency injection for the demo.
5. **Prefer working vertical slices.** First make LINE → mock recommendation → Flex work, then add AI/tools/data.
6. **Do not write automated tests for this hackathon.** Manually verify the few critical paths in the checklist below.
7. **One source of truth.** Types/contracts in `src/types`; validation schemas in `lib/agent/schemas`; no copy-paste versions in every developer branch.
8. **No silent fabrication.** Scores and data must come from rules/tool results; missing numbers are `null` with a note.
9. **Failures are visible.** Catch errors at boundaries, log concise context, send a usable fallback. Never silently swallow them.
10. **Keep PRs/commits small.** Make commits per working feature and integrate often.

## 2. Names and file conventions

- Files: `kebab-case.ts` / `kebab-case.tsx`.
- React components and types: `PascalCase`.
- Functions/variables: `camelCase`; env vars and constants: `UPPER_SNAKE_CASE`.
- Async functions with side effects should say what they do: `sendLinePush`, `claimNextJob`, `loadNeighborhoods`.
- Prefer named exports, except where Next.js requires default exports.

## 3. Next.js and Node boundaries

- Route handlers: authentication/validation → one application function → response.
- UI components: presentation only; don't score neighborhoods or call secret APIs inside components.
- Server-only: LINE secret, OpenAI API key and database connections. Never import into Client Components.
- Expensive work runs from the background worker, not a webhook route.
- Use `async/await`, timeouts for external calls and bounded retries for transient failures.

## 4. Agent and data coding standards

- Validate OpenAI structured output with Zod before persistence or Flex rendering.
- Tool outputs must use versioned neighborhood IDs, never invented names.
- Keep prompts in `src/lib/agent/`; keep tools deterministic and small.
- Agent may select criteria and explain trade-offs; scoring code calculates numbers.
- Record assumptions and data confidence; handle null features explicitly.
- Keep mock fixtures shape-identical to real output. A `MOCK_AGENT` flag switches the source, not the UI contract.

## 5. Error/logging rules

```ts
try {
  const result = await analyzePreferences(profile);
  return RecommendationResultSchema.parse(result);
} catch (error) {
  console.error('analysis_failed', { jobId, error });
  throw error; // worker decides retry/fallback
}
```

Do not log access tokens, API keys or full private LINE messages. Include `jobId`, `eventId` and stage in logs for debugging. Keep a short, actionable error to display to the user.

## 6. Minimum manual smoke checks (not automated tests)

- Webhook rejects invalid signatures and ignores duplicate LINE events.
- User with full preferences gets top 3 via LINE.
- User missing commute mode receives one useful question.
- Flex renders 3 valid neighborhood cards without oversized payloads.
- `MOCK_AGENT=true` works when OpenAI or external data fails.
- Results page opens on a phone; mobile text does not overflow.
- Worker survives/retries a failed job without sending duplicate cards.

## 7. Team collaboration + Codex

- Before coding, read `AGENTS.md` → follow links to `PRD.md`, `ARCHITECTURE.md`, this file.
- Assign owner to each file/module; avoid editing the same file at the same time.
- Agree on JSON contract before parallel work.
- Give Codex narrow tasks: one route, one component, one bug, one adapter.
- Require Codex to summarize changed files, assumptions, and manual verification; review generated changes before merging.
- If a feature will take too long, make a working mock/fallback rather than a half-finished integration.

## 8. Definition of done

A feature is done when it runs on the shared branch, matches the shared type, has one manual happy-path check, handles a sensible error case, and does not break the end-to-end demo. No test suite or elaborate documentation required.
