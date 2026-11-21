# JUDGING CRITERIA — Yoo Nai Dee (อยู่ไหนดี)
**Purpose:** Internal rubric for self-scoring the demo before submission, and for mapping each criterion to evidence a judge can see.
**Status:** draft · **Owner:** whole team · **Related:** [PRD.md](./PRD.md) (§2 product goal, §11 judging lens), [ARCHITECTURE.md](./ARCHITECTURE.md)

## 1. The six criteria
| #   | Criterion                          | Weight | One-line question                                       | Evidence a judge can see                                                                                              |
| --- | ---------------------------------- | ------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | **Problem & solution fit**         | 25%    | Is this the right problem, solved the right way?        | PRD §1 problem framing, live conversation that ends in 3 usable areas, not a chat toy                                 |
| 2   | **Build quality**                  | 25%    | Does the end-to-end path actually work, reliably?       | Live LINE → result flow, mock fallback, Zod validation, deterministic scoring                                         |
| 3   | **Insight / originality**          | 20%    | Does it produce something a normal search engine can't? | Hard-constraint vs preference separation, per-neighborhood trade-off, why zone A beats zone B, uncertainty disclosure |
| 4   | **Real-world value**               | 10%    | Would a real Bangkok renter use this?                   | Usable rent/commute data with sources, LIFF results page, honest "unknown" over invented facts                        |
| 5   | **Alignment with build direction** | 10%    | Does the build match the announced track/tech intent?   | LINE OA + LIFF, AI agent with tool calling, structured output, Postgres-backed queue (see ARCHITECTURE §2)            |
| 6   | **Effective use of Codex**         | 10%    | Was the AI used with judgment, not just volume?         | Visible task/decision log, review-driven diffs, clean commit history, no hallucinated facts shipped                   |

Weights are a planning aid, not an official rubric. Use them to allocate demo time, not to argue with judges.

## 2. What each criterion means in practice

### 1. Problem & solution fit (25%)
- **Fits:** the user says "อโศก งบ 15,000 ชอบคาเฟ่ ขี่ BTS" and gets 3 areas that genuinely fit that budget, commute and lifestyle mix.
- **Fails:** generic "here are popular Bangkok neighborhoods" answer; a UI that needs the user to learn a form; a bot that answers a question nobody has.
- **Self-check:** could a real renter act on the output this minute? If not, the problem is not solved yet.

### 2. Build quality (25%)
- **Fits:** one unbroken path — webhook → job → agent → scoring → Flex card → LIFF page — with a mock fallback so the demo survives a dead API.
- **Fails:** half the flow is a mock; scores are AI-frehanded; schema drift between worker and web; crashes on missing rent data.
- **Self-check:** walk PRD §10 demo checklist end to end, with the network cut.

### 3. Insight / originality (20%)
- **Fits:** distinguishes hard constraints (budget ceiling) from preferences (cafe access), shows the strongest downside per neighborhood, discloses confidence, explains why #1 beat #2.
- **Fails:** "Great for foodies! Great for nightlife!" with no reasoning, no trade-offs, no comparison of sacrifices.
- **Self-check:** every sentence in a Flex card answers "why do I care?" — delete anything that doesn't.

### 4. Real-world value (10%)
- **Fits:** sourced rent ranges, honest commute caveats, a result page worth screenshotting, works in Thai.
- **Fails:** invented travel times, no LIFF link, English-only output for a Thai user.
- **Self-check:** no number in the demo appears without a source or an explicit "unknown" label.

### 5. Alignment with build direction (10%)
- **Fits:** AI is the orchestrator (not a narration layer), tools are called for real data, LINE is the primary surface, persistence is real.
- **Fails:** hardcoded ranking dressed up as AI; LINE used only as a notification channel; agent never calls a tool.
- **Self-check:** PRD §2 pitch sentence is true of the running demo.

### 6. Effective use of Codex (10%)
- **Fits:** bounded tasks, explicit constraints in `AGENTS.md`, review passes before merge, decision log kept, no invented facts shipped.
- **Fails:** large unreviewed dumps, silently changed shared contracts, fabricated data passed off as sourced.
- **Self-check:** `git log` reads like a story; the diffs are reviewable; a judge can see where AI helped.

## 3. Self-scoring sheet (fill before demo day)
| Criterion                      | Weight | Score (0–5) | Weighted | Evidence / gap |
| ------------------------------ | ------ | ----------- | -------- | -------------- |
| Problem & solution fit         | 25%    |             |          |                |
| Build quality                  | 25%    |             |          |                |
| Insight / originality          | 20%    |             |          |                |
| Real-world value               | 10%    |             |          |                |
| Alignment with build direction | 10%    |             |          |                |
| Effective use of Codex         | 10%    |             |          |                |
| **Total**                      | 100%   |             | /5       |                |

Scoring guide: 0 = missing, 1 = demo-only, 2 = works but brittle, 3 = solid, 4 = strong, 5 = defensible under a judge's follow-up question.

## 4. Three things that cost the most points
1. **Invented facts.** A made-up commute time or rent number discredits every other claim in the deck.
2. **A broken demo path.** A dead API with no fallback reads as a broken product, not a resilient one.
3. **Ranking without reasoning.** Numbers without trade-offs look like a lookup table, which is exactly the thing this project exists to beat.

## 5. Open questions
- Official rubric weights (if published) override §1.
- Should "Use of Codex" evidence live in a dedicated `DECISIONS.md`? Undecided — decide before demo day.
