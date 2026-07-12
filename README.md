# DSR Solutions — Business OS & AI Automation Suite

A full-stack, multi-tenant SaaS implementing the two DSR solution pillars as
working software: **Business OS** (CRM, invoicing, projects, team management)
and the **AI Automation Suite** (no-code automations, an AI assistant, and
third-party integrations) — sold as subscriptions, with public marketing,
pricing, and live-demo pages. Built for SMEs and Enterprise teams across the
GCC, UK, USA, Canada, and Australia; every organization is an isolated tenant
with its own data, users, subscription, and integration credentials.

## Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM (PostgreSQL —
  Supabase-compatible out of the box), JWT auth, Zod validation, Stripe
  (subscriptions + per-tenant invoice payments).
- **Frontend**: React + TypeScript, Vite, Tailwind CSS, React Router,
  TanStack Query, Recharts.

## Features

### Public site
- **Landing page** (`/`) and **pricing page** (`/pricing`) — no login
  required. Pricing shows one global USD price per plan, displayed converted
  into the visitor's local currency (USD, GBP, CAD, AUD, AED, SAR, QAR, KWD).
- **Live interactive demos** — "Try Business OS live demo" / "Try AI
  Automation Suite live demo" buttons instantly create a temporary, fully
  unlocked sandbox workspace pre-loaded with realistic sample data (contacts
  in the UAE/UK/Canada, deals, invoices, a project board, and automations
  with run history) — no signup required. Demo workspaces auto-expire and are
  deleted after 2 hours (cleanup runs every 30 minutes).

### Subscriptions & billing
- Three products — **Business OS**, **AI Automation Suite**, and the
  discounted **Full Suite bundle** — each with **SME** and **Enterprise**
  tiers, monthly or annual billing. Prices/features live in
  `server/src/config/plans.ts`.
- New signups get a **14-day free trial of the full bundle** automatically —
  no card required — so they can explore everything before choosing a plan.
- Stripe Checkout (subscription mode) for upgrading, and the Stripe Billing
  Portal for self-serve plan changes/cancellation, both from the in-app
  **Billing** page.
- Route-level entitlement checks: Business OS routes (CRM, invoicing,
  projects) require an active Business-OS-or-bundle subscription; AI
  Automation Suite routes (automations, AI assistant) require an active
  AI-Suite-or-bundle subscription. Lapsed/uncovered requests get a `402` with
  an upgrade message, and the frontend redirects to `/pricing`.
- This billing is DSR's own platform Stripe account (`STRIPE_SECRET_KEY`),
  separate from the per-organization Stripe key in Settings, which is each
  tenant's own account for collecting payment from *their* invoice clients.

### Business OS
- **CRM**: contacts/leads with status tracking, and a Kanban deal pipeline
  (New → Qualified → Proposal → Negotiation → Won/Lost).
- **Invoicing**: line-item invoices, auto-numbering, PDF export, emailing
  invoices to clients, manual "mark as paid," and optional Stripe Checkout for
  online payment. An hourly job auto-flags invoices past their due date as
  overdue.
- **Projects & Tasks**: Kanban task boards per project with assignment and due
  dates.
- **Team management**: role-based access (Owner/Admin/Manager/Member),
  invite-by-email with temporary passwords.
- **Analytics dashboard**: pipeline value, revenue collected/outstanding,
  task completion, automation health — all computed live from the database.

### AI Automation Suite
- **Visual automation builder**: pick a trigger (new contact, deal stage
  change, invoice overdue, task completed, a cron schedule, or manual) and
  chain actions (send email, create task, call a webhook, post to Slack,
  or generate text with AI). Values from the triggering record can be injected
  into action fields with `{{contact.name}}`-style placeholders. The engine
  runs actions in order and logs each step's outcome.
- **Run history**: every automation execution is logged with per-step
  success/failure detail, so failures (e.g. "no SMTP configured") are visible
  and actionable, not silent.
- **AI Assistant**: a persistent chat assistant (Anthropic Claude) for
  drafting communications, summarizing records, and suggesting next actions,
  scoped per user/organization with conversation history.
- **Integrations settings**: SMTP, Slack incoming webhook, and Stripe key are
  configured per-organization in Settings, independent of server-wide env
  vars — each tenant can bring their own providers.

## Required external APIs

The app runs and is fully explorable without any external keys — subscription
checkout is disabled with a clear "contact sales" state, and automations that
need an unconfigured integration fail gracefully instead of crashing. To
unlock full functionality:

| Capability | Required credential | Where to get it |
|---|---|---|
| Subscription checkout & billing portal | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (server env, DSR's own Stripe account) | https://dashboard.stripe.com/apikeys |
| AI Assistant chat + "Generate text with AI" automation action | `ANTHROPIC_API_KEY` (server env) | https://console.anthropic.com/ |
| "Send email" automation action, invoice emails, team invite emails | SMTP host/user/pass (server env **or** per-org in Settings) | Any provider: SendGrid, Postmark, Mailgun, Amazon SES, or a Gmail App Password |
| "Pay online" button on a tenant's invoices (separate from subscription billing) | Stripe secret key (per-org in Settings, or `STRIPE_SECRET_KEY` env) | https://dashboard.stripe.com/apikeys |
| "Post to Slack" automation action | Slack Incoming Webhook URL (per-org in Settings) | Slack App directory → Incoming Webhooks |

## Getting started

Requires a Postgres database (a Supabase project's Postgres works directly —
see below — or any local/hosted Postgres for development).

```bash
# Backend
cd server
cp .env.example .env       # set DATABASE_URL, JWT_SECRET at minimum; add API keys as needed
npm install
npm run prisma:migrate     # creates tables
npm run seed                # optional demo data: demo@dsrsolutions.com / Demo1234!
npm run dev                  # http://localhost:4000

# Frontend (separate terminal)
cd client
npm install
npm run dev                  # http://localhost:5173 (proxies /api to :4000)
```

Visit `/` for the marketing site, `/pricing` to see plans, or `/register` to
start a 14-day trial. Sign in with the seeded demo account, or click "try a
live demo" on the login page for an instant no-signup sandbox.

## Deploying via Supabase / Lovable

This backend is a self-hosted Express API with its own JWT auth (not Supabase
Auth), so there are two independent pieces to place:

1. **Database → Supabase.** Just point `DATABASE_URL` at your Supabase
   project's Postgres connection string (Project Settings → Database →
   Connection string) and run `npm run prisma:deploy`. No other changes
   needed — the schema is already Supabase-compatible.
2. **API → a Node host.** Supabase/Lovable's native pattern is a React
   frontend calling Supabase directly (Supabase Auth + Row Level Security +
   Edge Functions), with no separate server. This project instead ships a
   custom Express API that needs somewhere to run continuously — e.g.
   Render, Railway, Fly.io, or a VPS — pointed at that same Supabase Postgres
   database. Deploy `client/dist` (from `npm run build`) as static hosting
   (Lovable, Vercel, Netlify, or Supabase Storage + a CDN), with
   `VITE`/proxy config or a reverse proxy routing `/api/*` to the Express
   host.

If instead you want a fully Supabase-native rebuild — Supabase Auth, Row
Level Security policies instead of the JWT/Express authorization layer, and
Edge Functions in place of Express routes, so a Lovable-generated frontend
can call Supabase directly with no separate backend to host — that's a
larger, separate rework; ask and it can be scoped out.

## Project layout

```
server/   Express API, Prisma schema, automation engine, billing/subscriptions, demo sandbox, scheduler
client/   React app: marketing site, pricing, CRM, Invoicing, Projects, Team, Automations, AI Assistant, Billing, Settings
```
