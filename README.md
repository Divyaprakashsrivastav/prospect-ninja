# Outreach Studio

AI-assisted LinkedIn prospecting with a human-approved send workflow. Inspired by products like HeyReach, but messages never leave the queue until a person approves the exact draft.

This MVP does **not** scrape LinkedIn, automate a browser, or collect LinkedIn passwords. Discovery and send go through a provider adapter. Until you supply an official API (for example HeyReach), the app uses a labelled **demo provider** with sample data. Demo send attempts are stored as `demo_recorded` and are never shown as real LinkedIn deliveries.

## Stack

- Next.js 15 App Router, React, TypeScript, CSS Modules
- PostgreSQL + Prisma
- Auth.js (email + password, JWT sessions)
- OpenAI (optional; template drafts if no key)
- Vercel Cron for daily discovery

## Setup

1. Copy environment variables:

```bash
copy .env.example .env.local
```

2. Set `AUTH_SECRET` and `CRON_SECRET` to long random strings. Set `DATABASE_URL` (app / pooled) and `DIRECT_URL` (migrations / direct) to PostgreSQL. For Supabase, copy both from Project Settings → Database.

3. If you are using local PostgreSQL instead of Supabase, start it. This machine does not have Docker or a system Postgres install, so use the bundled local cluster:

```bash
npm run db:up
```

Leave that terminal open. Alternatively, `docker compose up -d` if Docker Desktop is available.

4. In a second terminal, migrate and run the app:

```bash
npm install
npm run db:deploy
npm run dev
```

Open http://localhost:3000, register, create an ICP campaign, then **Discover now**.

## Environment

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | App queries. Supabase transaction pooler, port 6543, `pgbouncer=true` |
| `DIRECT_URL` | Yes | Migrations and interactive transactions. Supabase session pooler or direct DB, port 5432 |
| `AUTH_SECRET` | Yes | Auth.js JWT signing |
| `AUTH_URL` | Yes in production | Local: `http://localhost:3000`. Vercel: `https://YOUR-PROJECT.vercel.app` |
| `AUTH_TRUST_HOST` | Yes on Vercel | `true` so Auth.js trusts the deployment host |
| `OPENAI_API_KEY` | No | OpenAI drafts; demo AI is used when empty |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `AI_PROVIDER` | No | `auto` (default), `openai`, or `demo` |
| `CRON_SECRET` | Yes for Vercel Cron | Bearer token for `/api/jobs/discover` |
| `HEYREACH_API_KEY` | No | Official send later; demo provider is used when empty |
| `HEYREACH_API_BASE_URL` | No | Only when HeyReach is wired |

Never put API keys in client components. Do not commit `.env` or `.env.local`.

## Daily discovery

- Max **15** new prospects per campaign per day (`dailyDiscoverLimit`, hard-capped).
- Duplicates skipped by LinkedIn URL and provider external ID.
- Local: `npm run job:discover`
- Vercel: cron hits `GET /api/jobs/discover` with `Authorization: Bearer $CRON_SECRET`

## Deploy (Vercel)

1. Create a hosted Postgres database (this project uses Supabase).
2. Set every required env var above on the Vercel project (Production and Preview).
3. If that database has not already received Prisma migrations, run `npx prisma migrate deploy` against it. Do not use `migrate reset`.
4. Deploy. `vercel.json` already schedules daily discovery; `CRON_SECRET` must be set so Vercel Cron can authorize.

## Rules encoded in the product

- Private routes require a session.
- Send requires `approved` status, `approvedAt`, and a body hash that still matches the approved text.
- Any edit clears approval.
- Demo provider cannot mark a message as `sent`.
