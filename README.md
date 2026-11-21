# Yoo Nai Dee (อยู่ไหนดี)

Yoo Nai Dee is a LINE-first hackathon project for people deciding where to live in Bangkok. The bot collects a monthly rent ceiling, a preferred way to get around, and optional weighted priorities such as Work, School, and Gym. The web app displays saved neighborhood recommendations.

## What works today

- **LINE chat** uses the OpenAI Codex SDK to collect preferences in Thai or English. The bot asks for missing details, queues an analysis in PostgreSQL after the user confirms, and sends a **SEARCHING** card.
- **Web and LINE Mini App** open directly to the latest completed recommendations for signed-in LINE users. **Past searches** opens earlier results, and **Your profile** opens saved housing preferences and editable lifestyle priorities.
- **Background worker** claims analysis jobs and moves them to `WAITING_FOR_HANDLER`. Live neighborhood research and personalized result delivery are planned.

## Run the web demo

Install Node.js 22 or newer and npm, then run:

```sh
git clone https://github.com/bytesbanana/yoonaidee.git
cd yoonaidee
npm ci
npm run dev
```

Open [the recommendations home](http://localhost:3000/). Loading saved recommendations and profiles requires the LINE and PostgreSQL setup below.

Use `npm run lint` to run ESLint. Use `npm run build` followed by `npm start` to serve a production build.

## Connect LINE and PostgreSQL

### 1. Set up the database

Create an empty PostgreSQL 15+ database and make its connection URL available to your shell as `DATABASE_URL`. From the repository root, apply the schema and migrations in order with `psql`:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/yoo_nai_dee_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/migrations/20261121_analysis_waiting_for_handler.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/migrations/20261121_analysis_acknowledged.sql
```

For an existing database, apply only migrations it is missing, in the order shown above.

### 2. Configure the web service

Copy [`.env.example`](.env.example) to `.env` if you are starting from a fresh checkout. Set these values in `.env` for local development or in the host environment for deployment.

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection for LINE intake and saved profiles |
| `LINE_CHANNEL_SECRET` | Verifying signatures from the LINE Messaging API channel |
| `LINE_CHANNEL_ACCESS_TOKEN` | Looking up bot profiles and sending LINE replies and pushes |
| `OPENAI_API_KEY` | Authenticating Codex intake |
| `CODEX_MODEL` | A Codex-compatible model available to your API project |
| `NEXT_PUBLIC_LIFF_ID` | Initializing LIFF for LINE sign-in |
| `LINE_LOGIN_CHANNEL_ID` | Optional override for token validation. The server defaults to the numeric prefix of the LIFF ID |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional place picker on the profile page. Use a website-restricted key with Maps JavaScript API and Places API (New) enabled |

Keep database credentials, the LINE channel secret and access token, and the OpenAI API key on the server. Set `NEXT_PUBLIC_*` values before building the app.

### 3. Register the webhook and Mini App

1. Expose the Next.js server over public HTTPS. Set the Messaging API channel's webhook URL to `https://<your-public-host>/api/line/webhook`, then enable webhooks and redelivery.
2. Create a LIFF app in a LINE Login channel under the same LINE provider as the Messaging API channel. Set its endpoint to `https://<your-public-host>/`, enable the `openid` and `profile` scopes, and set `NEXT_PUBLIC_LIFF_ID` to its ID.
3. The **ดูคำแนะนำ** button in the **SEARCHING** card opens the Mini App home through a fixed URL. For your own deployment, update the URL in [`src/lib/line/intake-flex.ts`](src/lib/line/intake-flex.ts) to point to your app.

To check intake, send `ทำงานอโศก งบไม่เกิน 15,000 บาทต่อเดือน` to the bot. It should ask for a travel mode. Reply `BTS`, then tap or type `ค้นหา` when prompted. Expect one `ANALYSIS` job and a **SEARCHING** card after confirmation.

### 4. Run the optional analysis worker

The Java 21 Spring Boot worker is a Git submodule. Initialize it from the root and run it in a separate terminal:

```sh
git submodule update --init yoonaidee-background-worker
cd yoonaidee-background-worker
export JDBC_DATABASE_URL='jdbc:postgresql://localhost:5432/yoonaidee'
export PGUSER='your-database-user'
export PGPASSWORD='your-database-password'
sh ./mvnw spring-boot:run
```

Use the same database and credentials as the web service. On Windows, set the same variables in your shell and run `mvnw.cmd spring-boot:run`. With the worker running, a confirmed job should move from `QUEUED` to `WAITING_FOR_HANDLER`. With only the web service running, the job stays queued and subsequent messages from that user are ignored while it is active. The `npm run intake:worker` script processes legacy conversation jobs and outbox messages. The current chat flow runs in the webhook.

## Repository guide

| Path | Contents |
| --- | --- |
| [`src/app/`](src/app) | Next.js pages, LIFF provider, LINE webhook, and profile settings API |
| [`src/lib/agent/`](src/lib/agent) and [`src/lib/line/`](src/lib/line) | Codex intake, preference validation, and LINE messaging |
| [`docs/`](docs) | Database schema, migrations, and flow diagrams |
| [`yoonaidee-background-worker/`](yoonaidee-background-worker) | Spring Boot analysis queue consumer |

See the [LINE intake flow](docs/line-codex-current-flow.svg), [database dictionary](docs/yoo_nai_dee_data_dictionary.md), and [product requirements](PRD.md).
