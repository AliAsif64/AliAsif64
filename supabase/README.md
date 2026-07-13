# Supabase-native backend (push through Lovable)

This folder is the **Lovable/Supabase implementation** of the DSR Solutions
backend — the same functionality as the Express server in `/server`, rebuilt
the way Lovable expects it so you can push it through the Lovable editor:

- `migrations/20260713000000_dsr_backend.sql` — full multi-tenant schema with
  Row Level Security (tenancy + subscription entitlements enforced in the
  database), signup onboarding trigger, automation event triggers, and
  pg_cron jobs (invoice overdue watcher, schedule tick, demo cleanup).
- `functions/ai` — all AI features in one edge function: data-aware assistant
  chat, business insights, lead scoring, email drafting, and the
  natural-language automation builder.
- `functions/automation-run` — the automation engine: executes send_email /
  create_task / webhook / slack_notify / ai_generate actions with
  `{{field}}` interpolation and per-step run logs. Fired by database
  triggers, the 5-minute cron tick (for SCHEDULE automations), or manual
  "Run now".
- `functions/billing` — Stripe Checkout + Billing Portal for the SME /
  Enterprise plans of Business OS, AI Automation Suite, and the bundle.
- `functions/stripe-webhook` — keeps the `subscriptions` table in sync with
  Stripe (activation, plan changes, cancellation, payment failures).
- `functions/demo` — one-click demo sandbox: onboards an anonymous auth user
  into a pre-seeded, fully-unlocked demo org that auto-expires in 2 hours.

Key differences from the Express version, by design:
- **Auth is Supabase Auth** (email/password + anonymous sign-in for demos),
  not custom JWT. Registration passes `organization_name`, `name`, `plan` in
  `options.data`; a Postgres trigger creates the org, profile, integration
  row, and 14-day full-bundle trial automatically.
- **Tenancy and entitlements are enforced by RLS**, not Express middleware —
  every table checks `current_org_id()` and `has_entitlement(...)`, so even a
  Lovable-generated frontend querying tables directly is safe.
- **Email is Resend** (Lovable's standard) instead of SMTP: set
  `RESEND_API_KEY`. The per-org "from" address lives in `integrations.smtp_from`.
- Invoice PDF generation is not included (was pdfkit server-side); render
  invoices client-side or add a `pdf` edge function later.

## How to push this through Lovable

1. In Lovable, make sure your project is **connected to Supabase**
   (Settings → Integrations → Supabase).
2. Paste the master prompt below into the Lovable chat, attaching or pasting
   the three kinds of artifacts when asked (Lovable applies SQL migrations
   and deploys edge functions itself):

```
Set up my Supabase backend for the DSR Solutions app (Business OS + AI
Automation Suite):

1. Run the SQL migration I'm providing (supabase/migrations/20260713000000_dsr_backend.sql)
   against my Supabase project. It creates the multi-tenant schema, RLS
   policies, signup trigger, automation triggers, and pg_cron jobs.
2. Deploy these edge functions from the code I'm providing, with JWT
   verification ENABLED: ai, billing, demo.
3. Deploy these edge functions with JWT verification DISABLED (they
   authenticate by other means): automation-run (internal secret),
   stripe-webhook (Stripe signature).
4. Set these function secrets: ANTHROPIC_API_KEY, STRIPE_SECRET_KEY,
   STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, SITE_URL (my app's public URL).
   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided
   automatically.
5. Generate a random 32+ char internal secret and run:
   update public.app_config set
     automation_run_url = 'https://<project-ref>.supabase.co/functions/v1/automation-run',
     internal_secret = '<the-generated-secret>'
   where id = 1;
6. In my Stripe dashboard I will point a webhook at
   https://<project-ref>.supabase.co/functions/v1/stripe-webhook for the
   events: checkout.session.completed, customer.subscription.updated,
   customer.subscription.deleted, invoice.payment_failed.
```

3. Set the secrets it asks for (Supabase → Edge Functions → Secrets):
   `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `RESEND_API_KEY`, `SITE_URL`.

## Frontend call map (for Lovable to wire up)

| Feature | How to call |
|---|---|
| Register | `supabase.auth.signUp({ email, password, options: { data: { organization_name, name, plan } } })` |
| Login | `supabase.auth.signInWithPassword(...)` |
| Live demo | `supabase.auth.signInAnonymously()` then `supabase.functions.invoke("demo")` |
| CRM / deals / invoices / projects / tasks / team / automations | Direct table queries via supabase-js — RLS scopes everything to the user's org and plan |
| AI assistant chat | `supabase.functions.invoke("ai", { body: { action: "chat", message, conversationId? } })` |
| AI insights | `...invoke("ai", { body: { action: "insights" } })` |
| AI lead score | `...invoke("ai", { body: { action: "score-lead", contactId } })` |
| AI email draft | `...invoke("ai", { body: { action: "draft-email", contactId, goal } })` |
| AI automation builder | `...invoke("ai", { body: { action: "generate-automation", prompt } })` then insert the returned row into `automations` |
| Run automation now | `...invoke("automation-run", { body: { automation_id, context: {} } })` |
| Subscribe / upgrade | `...invoke("billing", { body: { action: "checkout", product, tier, billingPeriod } })` → redirect to returned `url` |
| Manage billing | `...invoke("billing", { body: { action: "portal" } })` → redirect |

Plan catalog for the pricing page (kept in `functions/billing/index.ts`):
Business OS $49/$199, AI Automation Suite $79/$249, Full Suite bundle
$99/$349 (SME/Enterprise, monthly; annual = 10× monthly). Adjust there and
on the marketing pages together.
