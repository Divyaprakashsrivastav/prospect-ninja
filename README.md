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

2. Set `AUTH_SECRET` and `CRON_SECRET` to long random strings. Set `DATABASE_URL` to PostgreSQL.

3. Start PostgreSQL. This machine does not have Docker or a system Postgres install, so use the bundled local cluster:

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
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `AUTH_SECRET` | Yes | Auth.js signing |
| `AUTH_URL` | Local | `http://localhost:3000` |
| `OPENAI_API_KEY` | No | OpenAI drafts; demo AI is used when empty |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `AI_PROVIDER` | No | `auto` (default), `openai`, or `demo` |
| `CRON_SECRET` | Production cron | Bearer token for `/api/jobs/discover` |
| `HEYREACH_API_KEY` | No | Official provider later; stub stays unconfigured without it |
| `HEYREACH_API_BASE_URL` | No | Only when HeyReach is wired |

Never put API keys in client components. Do not commit `.env` or `.env.local`.

## Daily discovery

- Max **15** new prospects per campaign per day (`dailyDiscoverLimit`, hard-capped).
- Duplicates skipped by LinkedIn URL and provider external ID.
- Local: `npm run job:discover`
- Vercel: cron hits `GET /api/jobs/discover` with `Authorization: Bearer $CRON_SECRET`

## Deploy (Vercel)

1. Create a hosted Postgres database (Neon or Supabase).
2. Set the env vars above in the Vercel project.
3. `npx prisma migrate deploy` against production (or a CI step).
4. Deploy. Confirm `CRON_SECRET` is set so Vercel Cron can authorize.

## Rules encoded in the product

- Private routes require a session.
- Send requires `approved` status, `approvedAt`, and a body hash that still matches the approved text.
- Any edit clears approval.
- Demo provider cannot mark a message as `sent`.
