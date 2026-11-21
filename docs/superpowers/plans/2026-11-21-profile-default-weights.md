# Persist Default `/profile` Weights Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` if available. Follow repo guidance: manual smoke checks, no new test suite.

**Goal:** Save a numeric weight for every selected lifestyle category when the user clicks **Save priorities**, even if they leave percentages blank.

**Architecture:** Resolve defaults on the server before both settings write paths. Preview the same defaults in `/profile` and render persisted values from the save response. Keep the existing PostgreSQL JSON shape and profile-version checks.

**Tech Stack:** Next.js, TypeScript, Zod, PostgreSQL.

**Spec:** `/profile` save behavior below; see `PRD.md` and `ARCHITECTURE.md` for the existing preference flow.

## Rules

- Default only selected categories. No categories means no weights; don’t add presets automatically.
- Split the unallocated percentage evenly among blank categories. Hand rounding remainders to blank rows in display order. Gym 60% + blank Park → 60/40; three blanks → 34/33/33.
- Never change a user-entered weight. If no rows are blank, keep the current cap-only behavior (e.g. 60/25 still saves as 85%). If there isn’t at least 1% per blank row, ask the user to lower a weight.
- Defaults apply on explicit `/profile` save, not on page load. Existing profiles with blanks get defaults the next time they’re saved. No bulk backfill, LINE intake changes, or database schema change.

## Tasks

### 1. Resolve and persist defaults

- [ ] In `src/lib/preferences/categories.ts`, add `resolveProfileWeights` for ordered rows with `weight: number | null`. Return rows with numeric weights or a validation error. Preserve all other fields; do not use the LINE `suggestWeights` fallback, which can overwrite explicit weights.
- [ ] In `src/app/api/settings/route.ts`, run the resolver after request validation, before the insert/update branches. Return HTTP 400 for insufficient room. Persist resolved weights in `conversation_sessions.preferences.categories`; keep location normalization, auth, and conflict handling unchanged.

### 2. Make defaults visible and saveable

- [ ] In `src/app/profile/profile-view.tsx`, show calculated percentages as previews for blank rows (e.g. `40% on save`), keeping manual inputs editable. When defaults won’t fit, show an actionable error and disable save. Allow saving legacy blank rows even if nothing else changed.
- [ ] After save, display the API response as saved values; update `PRD.md` to clarify the behavior.

### 3. Verify manually against PostgreSQL

- [ ] Save a new profile with three blank categories; confirm 34/33/33 in the UI after reload and in `preferences.categories` in PostgreSQL.
- [ ] Update an existing profile with 60% plus a blank row; confirm 60/40 and unchanged locations. Save a legacy blank profile without changing anything else; confirm numeric values persist.
- [ ] Check that 100% plus a blank row is rejected without a DB write, 60/25 stays 60/25, and removing all rows saves an empty list. Verify a stale save still returns 409 and reloading alone doesn’t write or enqueue a search.
