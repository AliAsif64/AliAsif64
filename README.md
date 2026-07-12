# DSR Solutions — Business OS & AI Automation Suite

A full-stack, multi-tenant web application implementing the two DSR solution
pillars as working software: **Business OS** (CRM, invoicing, projects, team
management) and the **AI Automation Suite** (no-code automations, an AI
assistant, and third-party integrations). Built for both SMEs and Enterprise
teams — every organization is an isolated tenant with its own data, users, and
integration credentials.

## Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM (SQLite by default,
  swap to PostgreSQL for production by changing `datasource provider` in
  `server/prisma/schema.prisma` and `DATABASE_URL`), JWT auth, Zod validation.
- **Frontend**: React + TypeScript, Vite, Tailwind CSS, React Router,
  TanStack Query, Recharts.

## Features

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

The app runs and is fully explorable without any external keys — automations
that need an unconfigured integration fail gracefully with a clear message
instead of crashing. To unlock full functionality:

| Capability | Required credential | Where to get it |
|---|---|---|
| AI Assistant chat + "Generate text with AI" automation action | `ANTHROPIC_API_KEY` (server env) | https://console.anthropic.com/ |
| "Send email" automation action, invoice emails, team invite emails | SMTP host/user/pass (server env **or** per-org in Settings) | Any provider: SendGrid, Postmark, Mailgun, Amazon SES, or a Gmail App Password |
| "Pay online" button on invoices | Stripe secret key (per-org in Settings, or `STRIPE_SECRET_KEY` env) | https://dashboard.stripe.com/apikeys |
| "Post to Slack" automation action | Slack Incoming Webhook URL (per-org in Settings) | Slack App directory → Incoming Webhooks |

Nothing else is required — the CRM, invoicing (minus emailing/online
payment), projects, team, and analytics all work with zero external
dependencies.

## Getting started

```bash
# Backend
cd server
cp .env.example .env       # fill in JWT_SECRET at minimum; add API keys as needed
npm install
npm run prisma:migrate     # creates the SQLite database
npm run seed                # optional demo data: demo@dsrsolutions.com / Demo1234!
npm run dev                  # http://localhost:4000

# Frontend (separate terminal)
cd client
npm install
npm run dev                  # http://localhost:5173 (proxies /api to :4000)
```

Register a new workspace at `/register`, or sign in with the seeded demo
account. SME and Enterprise are both selectable at signup as a `plan` field
on the organization (does not currently gate features — it's there for
future tiered billing/limits).

## Project layout

```
server/   Express API, Prisma schema, automation engine, scheduler
client/   React app: CRM, Invoicing, Projects, Team, Automations, AI Assistant, Settings
```
