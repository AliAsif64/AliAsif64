# Lovable prompts — update the DSR solution pages

Claude runs in a sandboxed cloud environment with no browser-extension access
and no write access to the Lovable project behind digitalsilkroute.com, so the
page updates below can't be pushed from here. Instead, each section is a
**ready-to-paste prompt for the Lovable editor** (open your project in
Lovable — via the site editor or the browser extension — and paste the prompt
into the chat). They describe exactly what the product now does, so the
marketing pages match the software in this repo.

Before pasting, replace `APP_URL` in both prompts with the deployed app's
real URL (e.g. `https://app.digitalsilkroute.com`).

---

## Prompt 1 — `/solutions/ai-automation-suite`

```
Update the /solutions/ai-automation-suite page to reflect the launched product.
Keep the existing site theme, header, and footer. Structure the page as follows:

HERO
- Title: "AI Automation Suite"
- Subtitle: "No-code automations and a Claude-powered AI copilot that runs your
  busywork — built for SMEs and enterprises across the GCC, UK, USA, Canada,
  and Australia."
- Primary CTA button: "Try the live demo — no signup" linking to APP_URL
  (the app's landing page has a one-click AI Automation Suite sandbox
  pre-loaded with sample data; sessions auto-expire after 2 hours).
- Secondary CTA: "Start 14-day free trial" linking to APP_URL/register
  (full-bundle trial, no credit card).

FEATURE SECTIONS (6 cards or alternating rows)
1. Visual automation builder — pick a trigger (new contact, deal stage change,
   invoice overdue, task completed, cron schedule, or manual) and chain actions:
   send email, create task, call webhook, post to Slack, or generate text with
   AI. Insert live record fields anywhere with {{contact.name}}-style
   placeholders.
2. Create automations with AI — describe the automation in plain English
   ("when a deal is won, email the contact and post the win in Slack") and the
   AI generates the full validated configuration, previewed before you create it.
3. Data-aware AI Assistant — a chat copilot grounded in your live pipeline,
   invoices, tasks, and automation health. It answers with your real numbers,
   deal names, and invoice references — not generic advice.
4. AI lead scoring & email drafting — score any CRM lead 0-100 with a written
   rationale, and generate ready-to-send emails from a stated goal using the
   lead's real deal and payment history.
5. AI business insights — one click turns your live business data into 3-5
   prioritized recommendations, including exactly which automations to set up.
6. Full run history — every automation execution is logged step by step, so
   failures are visible and actionable, never silent.

INTEGRATIONS ROW
"Bring your own providers, per workspace:" SMTP (SendGrid, Postmark, Mailgun,
Amazon SES), Slack, Stripe, webhooks, and Anthropic Claude for AI.

PRICING SECTION (link "See full pricing" to APP_URL/pricing)
- SME: $79/month or $790/year
- Enterprise: $249/month or $2,490/year
- Full Suite bundle with Business OS: from $99/month
- Every plan starts with a 14-day free trial of the full platform, no card
  required. Prices are billed in USD; the pricing page shows local-currency
  equivalents for AED, SAR, QAR, KWD, GBP, CAD, and AUD.

CLOSING CTA
"Automate the busywork this week" with the same two buttons as the hero.
```

---

## Prompt 2 — `/solutions/business-os`

```
Update the /solutions/business-os page to reflect the launched product. Keep
the existing site theme, header, and footer. Structure the page as follows:

HERO
- Title: "Business OS"
- Subtitle: "CRM, invoicing, projects, and team management in one platform —
  everything an SME or enterprise needs to run daily operations, from the GCC
  to the UK, USA, Canada, and Australia."
- Primary CTA button: "Try the live demo — no signup" linking to APP_URL
  (one-click Business OS sandbox pre-loaded with sample contacts, deals,
  invoices, and projects; sessions auto-expire after 2 hours).
- Secondary CTA: "Start 14-day free trial" linking to APP_URL/register
  (full-bundle trial, no credit card).

FEATURE SECTIONS (5 cards or alternating rows)
1. CRM with visual deal pipeline — track leads with status stages and move
   deals across a Kanban board: New → Qualified → Proposal → Negotiation →
   Won/Lost. AI lead scoring rates every contact 0-100 with a written rationale.
2. Invoicing that collects itself — line-item invoices with automatic
   numbering, PDF export, one-click email delivery, online payment via Stripe
   Checkout, and automatic overdue detection that can trigger follow-up
   automations.
3. Projects & tasks — Kanban boards per project with assignees and due dates;
   completed tasks can trigger automations.
4. Team management with roles — Owner, Admin, Manager, and Member roles with
   email invites. Enterprise plans get unlimited seats.
5. Live analytics dashboard — pipeline value, revenue collected and
   outstanding, task completion, and automation health, computed live —
   plus one-click AI Business Insights with prioritized recommendations.

MULTI-TENANT / TRUST ROW
"Every workspace is an isolated tenant with its own data, users, roles,
subscription, and integration credentials."

PRICING SECTION (link "See full pricing" to APP_URL/pricing)
- SME: $49/month or $470/year (up to 10 team members)
- Enterprise: $199/month or $1,990/year (unlimited members, priority support)
- Full Suite bundle with the AI Automation Suite: from $99/month — best value
- Every plan starts with a 14-day free trial of the full platform, no card
  required. Prices billed in USD with local-currency display for AED, SAR,
  QAR, KWD, GBP, CAD, and AUD.

CLOSING CTA
"Run your whole business from one place" with the same two buttons as the hero.
```

---

## Checklist after pasting

- [ ] Replace `APP_URL` with the deployed app URL in both pages.
- [ ] If you adjust prices in `server/src/config/plans.ts`, mirror the change
      on both pages (and nowhere else — the app's pricing page reads from the
      API automatically).
- [ ] Verify the two demo CTAs open the app landing page, where the
      "Try ... live demo" buttons create the sandbox.
