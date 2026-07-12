# Marketplace Product Backend Review

Source: [www.digitalsilkroute.com/marketplace](https://www.digitalsilkroute.com/marketplace) — 50 listed products across 7 categories, pulled from the live DSR catalog on 2026-07-12.

Each product below was reviewed one by one for what its backend actually needs to do (based on its tagline/usage), given a runnable backend simulation in `src/products/`, and extended with **one unique feature tailored to how that specific product is used** — not a generic add-on copy-pasted across products. All 50 modules are exercised by the automated test suite (`npm test`) and reachable over HTTP via the Express server (`npm run dev`).

Every product exposes two backend endpoints:
- `POST /api/products/:slug/run` — the product's core/baseline backend operation
- `POST /api/products/:slug/feature` — the new unique feature

---

## premium-apps

### SilkInvoice (`silkinvoice`) — AI-powered invoicing and FBR-ready tax exports
- **Backend review:** Needs invoice creation + PKR sales-tax computation as its baseline. The real risk in this product is invoices getting rejected on FBR export due to malformed data.
- **Unique feature added — FBR export validator & formatter:** Validates NTN format and totals across a batch before export and returns a precise error list, so rejections are caught locally instead of at FBR submission time.

## tax-tools

### PakTax Calculator (`paktax-calculator`) — Salary & business tax calculator FY 2025-26
- **Backend review:** Baseline is a slab-based tax computation against FY25-26 salaried brackets.
- **Unique feature added — Year-over-year comparison:** Compares this year's tax burden to last year's income to show effective-rate drift from a raise, not just a static single-year number.

### FBR Return Assistant (`fbr-return-assistant`) — Guided FBR return filing walkthrough
- **Backend review:** Needs a step checklist + progress tracker; FBR's IRIS portal is notorious for session timeouts that lose user progress.
- **Unique feature added — Auto-save & resume filing:** Encodes a resume token from completed steps so a user can restore an in-progress filing on any device instead of restarting.

### GST Invoice Kit (`gst-invoice-kit`) — FBR-compliant sales tax invoicing templates
- **Backend review:** Baseline is GST computation (18%) over line items.
- **Unique feature added — Duplicate invoice-number guard:** Scans a batch for reused invoice numbers, which is a common cause of FBR sales-tax filing rejections.

### Zakat Planner (`zakat-planner`) — Annual zakat calculation and disbursement planner
- **Backend review:** Baseline is 2.5% zakat on eligible assets minus liabilities.
- **Unique feature added — Nisab auto-updater:** Recomputes the nisab threshold from a live silver rate instead of a stale hard-coded figure, so "is zakat even due" stays accurate year to year.

## trading-tools

### BotBazaar (`botbazaar`) — Marketplace + runtime for algorithmic trading bots
- **Backend review:** Baseline is strategy deployment into a runtime.
- **Unique feature added — Sandboxed backtester:** Runs a candidate strategy against historical price series in isolation, returning win rate and P&L, before it's allowed to touch live capital or be listed.

### PSX Screener (`psx-screener`) — Real-time PSX stock screener, 40+ filters
- **Backend review:** Baseline is multi-field filtering over a stock list.
- **Unique feature added — Saved screen combos:** Lets users save and re-apply named filter combinations (e.g. "value-picks") instead of rebuilding 40 filters every session.

### Crypto Portfolio Tracker (`crypto-portfolio-tracker`) — P&L across Binance, Bybit, P2P
- **Backend review:** Baseline is holdings aggregation and unrealized P&L.
- **Unique feature added — Cross-exchange transfer reconciliation:** Detects a user's own internal transfers between exchanges and excludes them from P&L/volume, preventing double-counting.

### TradingView Alert Bot (`tradingview-alert-bot`) — Forward alerts to Telegram/WhatsApp
- **Backend review:** Baseline is forwarding a signal payload to messaging channels.
- **Unique feature added — Risk-based position sizing:** Attaches a suggested position size derived from account equity and risk-per-trade to every forwarded alert, not just the raw signal.

### Forex Journal (`forex-journal`) — Trade journal with equity curve, R-multiples
- **Backend review:** Baseline is per-trade P&L logging.
- **Unique feature added — Equity curve & R-multiple calculator:** Converts a trade list into a running equity curve and R-multiples to reveal consistency of edge, not just win/loss counts.

## ai-automation

### ExamGenius (`examgenius`) — AI tutor & mock exams for MDCAT/ECAT/CSS/NTS
- **Unique feature — Weak-area detector:** Surfaces specific weak topics from answer history instead of a flat score.

### SehatLink (`sehatlink`) — Telehealth platform for Pakistani clinics
- **Unique feature — Symptom triage urgency scorer:** Prioritizes the booking queue by red-flag symptom detection instead of first-come-first-served.

### WhatsBiz AI (`whatsbiz-ai`) — WhatsApp AI assistant that qualifies leads
- **Unique feature — Lead scoring engine:** Scores conversations on budget/urgency/authority/need signals so reps see hot leads first.

### AgriSilk (`agrisilk`) — AI advisory + marketplace for farmers
- **Unique feature — Best-buyer price matcher:** Matches a harvest listing against active buyer bids by crop, quantity, and region to surface the best net price.

### Email Reply Bot (`email-reply-bot`) — Drafts replies in your voice
- **Unique feature — Tone-matching profile:** Builds a formality/length profile from past sent emails so drafts sound like the actual user.

### Social Post Scheduler (`social-post-scheduler`) — AI captions + scheduling
- **Unique feature — Best-time-to-post recommender:** Recommends posting time per platform from the user's own engagement history.

### Lead Enricher (`lead-enricher`) — Enrich raw lead lists
- **Unique feature — Per-field confidence scoring:** Scores each enriched field independently so sales knows what to trust vs. verify.

### Meeting Transcriber (`meeting-transcriber`) — Zoom/Meet transcription in Urdu/English
- **Unique feature — Urdu/English code-switch tagger:** Tags each segment's language, since Pakistani meetings routinely mix Urdu and English mid-sentence.

### ContentForge AI (`contentforge-ai`) — One article in → five platform assets out
- **Unique feature — Platform tone adapter:** Rewrites tone per platform (formal LinkedIn, punchy X) instead of reusing one tone everywhere.

### DataSentry — KPI Brief (`datasentry-kpi`) — Founder KPI brief every morning
- **Unique feature — Anomaly flagging:** Flags KPIs that deviate significantly from their trailing average, so the brief highlights what changed.

### InboxTriage (`inboxtriage`) — Pre-sorted inbox with drafted replies
- **Unique feature — Priority-drafted replies:** Drafts replies only for top-priority emails first (VIP + deadline signals).

### InvoiceReader AI (`invoicereader-ai`) — Invoices in, clean CSV out
- **Unique feature — Low-confidence exception flagging:** Flags individual low-confidence fields for human review instead of silently guessing.

### LeadPilot (`leadpilot`) — Every lead answered in 30 seconds
- **Unique feature — 30-second SLA tracker:** Measures real response latency against the promised SLA and auto-escalates breaches.

### MeetingScribe (`meetingscribe`) — Transcripts → decisions, owners, deadlines
- **Unique feature — Owner + deadline extractor:** Parses action items into structured `{owner, task, deadline}` records for direct task-tracker import.

### ReviewGuard (`reviewguard`) — Reviews answered in your voice
- **Unique feature — Negative-sentiment escalation:** Escalates strongly negative reviews to a human instead of auto-posting a templated reply.

### SupportDesk Agent (`supportdesk-agent`) — Knows when to hand off to a human
- **Unique feature — Handoff decision engine:** Escalates on low confidence or sensitive topics (billing, refunds, legal) — the product's core trust mechanism.

### BookingBot (`bookingbot`) — WhatsApp appointment booking
- **Unique feature — No-show risk predictor:** Predicts no-show risk from booking history and sends extra reminders to high-risk bookings.

### CartRescue (`cartrescue`) — Abandoned checkout recovery
- **Unique feature — Personalized 3-touch sequencer:** Scales the discount by cart value and elapsed time across a 3-touch sequence instead of one generic blast.

### OnboardFlow (`onboardflow`) — Client onboarding on rails
- **Unique feature — Stalled-client detector:** Flags clients stuck at a step past SLA and auto-nudges, since silent stalls (not missing steps) kill completion rates.

### FeedbackMiner (`feedbackminer`) — 1,000 feedback items → top 5
- **Unique feature — Impact ranking:** Ranks themes by frequency × severity so rare-but-severe issues aren't buried under common minor ones.

### FormFiller (`formfiller`) — Messy exports → clean import files
- **Unique feature — Field-mapping confidence flags:** Flags ambiguous AI-guessed column mappings for manual confirmation instead of silently importing wrong.

### ChurnWatch (`churnwatch`) — At-risk customers spotted early
- **Unique feature — Reason-tailored win-back drafts:** Generates a win-back email matched to the detected churn driver instead of one generic template.

### ComplianceCheck (`compliancecheck`) — Contracts screened before you sign
- **Unique feature — Risk-clause highlighter:** Flags specific risky clauses (auto-renewal, unlimited liability, unilateral termination) with severity and explanation.

### ProposalDrafter (`proposaldrafter`) — Discovery notes → structured proposal
- **Unique feature — Scope-based pricing tier suggester:** Matches scope keywords to a rate card so proposals aren't priced by guesswork.

### RecruitScreen (`recruitscreen`) — Score CVs against a job spec
- **Unique feature — Gap-based interview probe generator:** Generates interview questions targeted at exactly the candidate's skill gaps.

### ResearchRunner (`researchrunner`) — Weekly competitor/market intel digest
- **Unique feature — "So-what" synthesizer:** Attaches a concrete business implication to every raw finding.

### SEOScout (`seoscout`) — Keyword → full SEO brief
- **Unique feature — Search-intent classifier:** Classifies intent (informational/transactional/navigational) first so the outline structure actually fits the searcher.

### SocialListener (`socialistener`) — Daily brand/competitor digest with sentiment
- **Unique feature — Public-response-needed flag engine:** Flags only high-reach negative mentions as needing a public response, protecting response bandwidth.

### StockAlert (`stockalert`) — Daily inventory reorder digest
- **Unique feature — Today-vs-this-week prioritizer:** Splits the reorder list by days-of-stock-left into an urgent bucket and a this-week bucket.

### TranslateFlow (`translateflow`) — Detect language, translate, draft replies
- **Unique feature — Dual-language reply output:** Returns the draft in both the customer's language and English so agents can verify before sending.

## business-templates

### CodFlow (`codflow`) — COD order + returns platform
- **Unique feature — Return-fraud risk scorer:** Scores return/refusal risk from customer history so high-risk COD orders can require prepayment.

### Freelance-OS (`freelance-os`) — OS for Fiverr/Upwork freelancers
- **Unique feature — Platform-fee net earnings calculator:** Computes true PKR take-home after platform fees and FX conversion.

### Startup Pitch Deck (`startup-pitch-deck`) — 16-slide investor deck template
- **Unique feature — Investor-readiness scorer:** Scores a filled outline against sections investors expect, so founders know exactly what's missing.

### HR Onboarding Kit (`hr-onboarding-kit`) — Onboarding playbook for Pakistani SMBs
- **Unique feature — Compliance-document tracker:** Tracks which labor-law-required documents (CNIC, EOBI, signed offer, NDA) are collected per hire.

### SOP Template Bundle (`sop-template-bundle`) — 50+ SOP templates
- **Unique feature — SOP version control & staleness flag:** Flags any SOP not reviewed in over a year, a common audit failure point.

### Financial Model Excel (`financial-model-excel`) — 3-statement SaaS/e-commerce model
- **Unique feature — Best/base/worst scenario sensitivity:** Runs the model through three growth-rate assumptions in one call for a sensitivity range.

## apis

### WhatsApp Business API Wrapper (`whatsapp-business-wrapper`) — SDK + webhook relay
- **Unique feature — Webhook relay retry with dead-letter queue:** Retries failed deliveries with exponential backoff and dead-letters permanent failures.

### SMS Gateway Pakistan (`sms-gateway-pakistan`) — Unified SMS API, Jazz/Zong/Telenor/Ufone
- **Unique feature — Carrier auto-detect + failover routing:** Detects carrier from number prefix and fails over to a backup route on rejection.

### Payment Verification API (`payment-verification-api`) — Verify JazzCash/Easypaisa/bank transfers
- **Unique feature — Duplicate-claim detector:** Flags the same transaction ID claimed by multiple orders, catching a common COD/e-commerce fraud pattern.

## source-code

### Next.js SaaS Starter (`nextjs-saas-starter`) — Production SaaS starter
- **Unique feature — Feature-flag scaffold toggler:** Returns the exact effective route/module scaffold for a buyer's chosen config (billing/admin/multi-tenant) instead of one fixed template to prune by hand.

---

## Verification

- `npx tsc --noEmit` — clean, no type errors.
- `npm test` (Vitest) — 3 suites / 50-product coverage: every `core()` and `uniqueFeature()` runs without throwing against a realistic sample payload, and the registry count is asserted at exactly 50.
- Manual HTTP smoke test against a running `npm run dev` server confirmed `/api/health`, `/api/products`, and representative `/run` + `/feature` calls (PakTax Calculator, SilkInvoice) return correct results.

## Scope note

These are backend **simulations** built for structural review and prototyping — they implement each product's real domain logic (tax slabs, GST math, risk scoring, triage rules, etc.) in-process, but do not call live third-party services (FBR IRIS, JazzCash/Easypaisa, WhatsApp Cloud API, exchange APIs). Wiring in live credentials and external API calls is the natural next step once this backend shape is approved.
