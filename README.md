# Yoo Nai Dee (อยู่ไหนดี)

**Find three Bangkok neighborhoods worth visiting, right from LINE.** Listing sites help renters filter properties. Yoo Nai Dee helps them decide *where* to look by comparing neighborhoods against their commute, budget, and lifestyle.

## Try the live demo

<img src="docs/line_add_friend.png" alt="Scan this QR code in LINE to add Yoo Nai Dee as a friend" width="200" height="200" />

1. **Scan the QR code** with LINE and add Yoo Nai Dee as a friend.
2. **Paste this example** or describe your own needs in Thai or English:

   > ทำงานที่อโศก งบค่าเช่าไม่เกิน 15,000 บาทต่อเดือน เดินทางด้วย BTS อยากอยู่คอนโด ใกล้คาเฟ่กับยิม
   >
   > I work in Asok, can spend up to ฿15,000/month, take the BTS, and want a condo near cafés and a gym.

3. **Tap ค้นหา (Search)** when asked to confirm. A **SEARCHING** card appears while the worker researches your options. To try a follow-up question, omit the BTS preference and reply with `BTS` when asked.
4. **Compare the three areas** in the LINE result. Open the [LINE Mini App](https://miniapp.line.me/2012621103-OpONnNqR), choose **View information** on an area, and check **Sources** for its evidence links.

## What to look for

| Judging criterion | Evidence |
| --- | --- |
| Problem & solution fit | A natural-language request becomes a shortlist tailored to your destination, budget, transport, and housing type. |
| Build quality | Confirm in LINE, receive a result after background processing, then reopen it in the Mini App. The worker validates the result before saving it. |
| Insight / originality | Compare the reason to choose each area with its downside. A rent ceiling is a constraint; being near a café is a preference. |
| Real-world value | Open **Sources** to check the evidence before deciding where to visit. The result does not claim verified rents, measured commute times, or numerical fit scores. |
| Alignment with build direction | [Codex intake](src/lib/agent/codex-intake.ts) interprets chat and asks for missing details. After confirmation, the [research worker](yoonaidee-background-worker) uses OpenAI web search and validates three distinct recommendations. LINE handles intake, confirmation, and delivery. |
| Effective use of Codex | [AGENTS.md](AGENTS.md) documents the team's agent workflow. This is separate from the app's runtime use of Codex; there is no dedicated Codex build log in this repo. |

**Behind the demo:** LINE → Next.js webhook and Codex intake → PostgreSQL job → Spring Boot research worker → LINE Flex result and saved Mini App view. The Mini App also lets signed-in users edit their profile and lifestyle priorities.

**Scope:** This is a research shortlist, not a live rental inventory or trip planner. The live flow requires LINE and OpenAI. See [JUDGING.md](JUDGING.md) for the team's self-review rubric.

## Run locally

### 1. Start the web app

Install Node.js 22 or newer and npm, then run:

```sh
git clone https://github.com/bytesbanana/yoonaidee.git
cd yoonaidee
npm ci
cp .env.example .env
npm run dev
```

Open [the recommendations home](http://localhost:3000/). Loading saved recommendations and profiles requires the setup below. For a production build, run `npm run build` followed by `npm start`.

### 2. Connect PostgreSQL

Create an empty PostgreSQL 15+ database and set `DATABASE_URL` in your shell. Run from the repo root:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/yoo_nai_dee_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/migrations/20261121_analysis_waiting_for_handler.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/migrations/20261121_analysis_acknowledged.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/migrations/20261121_demo_analysis_completion.sql
```

For an existing database, run only missing migrations in the order shown.

### 3. Configure LINE and Codex

Set `DATABASE_URL`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `OPENAI_API_KEY`, `CODEX_MODEL`, and `NEXT_PUBLIC_LIFF_ID` in `.env`. See [`.env.example`](.env.example) for optional settings. Keep database credentials and API secrets on the server and set `NEXT_PUBLIC_*` values before building.

1. Expose the web app over HTTPS. Set the LINE Messaging API webhook to `https://<your-public-host>/api/line/webhook` and enable webhooks and redelivery.
2. Create a LIFF app in a LINE Login channel under the same provider as the Messaging API channel. Set its endpoint to `https://<your-public-host>/` and enable `openid` and `profile` scopes.
3. For your own deployment, update the fixed Mini App link in [`src/lib/line/intake-flex.ts`](src/lib/line/intake-flex.ts).

### 4. Start the analysis worker

Use Java 21 and a separate terminal. Set `JDBC_DATABASE_URL`, `PGUSER`, and `PGPASSWORD` for the same PostgreSQL database, plus `OPENAI_API_KEY` and `LINE_CHANNEL_ACCESS_TOKEN` for research and delivery.

```sh
git submodule update --init yoonaidee-background-worker
cd yoonaidee-background-worker
sh ./mvnw spring-boot:run
```

On Windows, run `mvnw.cmd spring-boot:run`. Without the worker, the web app accepts confirmed requests but analysis jobs stay queued. `npm run intake:worker` handles legacy intake and outbox processing, not neighborhood research.

## Repository guide

- [`src/app/`](src/app) — Next.js pages, LIFF, LINE webhook, and profile API.
- [`src/lib/agent/`](src/lib/agent) and [`src/lib/line/`](src/lib/line) — Codex intake, preference validation, and LINE messaging.
- [`yoonaidee-background-worker/`](yoonaidee-background-worker) — Spring Boot research and LINE delivery.
- [LINE intake flow](docs/line-codex-current-flow.svg) · [Database dictionary](docs/yoo_nai_dee_data_dictionary.md) · [Product requirements](PRD.md)
