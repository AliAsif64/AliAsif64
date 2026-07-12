# DSR Marketplace — Product Backend Review

A backend review sandbox covering every product listed on the [Digital Silk Route marketplace](https://www.digitalsilkroute.com/marketplace). Each of the 50 products was reviewed individually, given a runnable backend module reflecting its core function, and extended with one unique feature tailored to how that specific product is actually used.

See [`REVIEW.md`](./REVIEW.md) for the full product-by-product writeup.

## Structure

```
src/
  products/
    types.ts              # shared ProductModule interface
    tax-tools.ts           # PakTax Calculator, FBR Return Assistant, GST Invoice Kit, Zakat Planner
    trading-tools.ts       # BotBazaar, PSX Screener, Crypto Portfolio Tracker, TradingView Alert Bot, Forex Journal
    ai-automation.ts       # 15 AI-automation products (batch 1)
    ai-automation-2.ts     # 15 AI-automation products (batch 2)
    business-templates.ts  # CodFlow, Freelance-OS, Startup Pitch Deck, HR Onboarding Kit, SOP Bundle, Financial Model
    apis.ts                 # WhatsApp Business API Wrapper, SMS Gateway Pakistan, Payment Verification API
    source-code.ts          # Next.js SaaS Starter
    premium-apps.ts         # SilkInvoice
    registry.ts              # aggregates every product into one lookup map
  server.ts                 # Express API exposing every product's backend over HTTP
  __tests__/products.test.ts # exercises core() + uniqueFeature() for all 50 products
```

Every product implements:
- `core(input)` — simulates the product's baseline backend operation (what it already needed to do).
- `uniqueFeature(input)` — the new capability added for this task, specific to that product's usage.

## Running it

```bash
npm install
npm run dev     # starts the Express server on :3000
npm test        # runs the full product test suite
npm run build   # type-checks and compiles to dist/
```

## API

- `GET /api/health` — service + product count.
- `GET /api/products` — catalog metadata for all products.
- `GET /api/products/:slug` — metadata for one product.
- `POST /api/products/:slug/run` — invoke the product's core backend operation.
- `POST /api/products/:slug/feature` — invoke the product's unique feature.

Example:

```bash
curl -X POST localhost:3000/api/products/paktax-calculator/run \
  -H 'Content-Type: application/json' \
  -d '{"annualIncome": 1800000}'
```

## Scope

These are backend **simulations**: real domain logic (tax slabs, GST math, risk scoring, triage rules, position sizing, etc.) computed in-process, without live calls to third-party services (FBR IRIS, JazzCash/Easypaisa, WhatsApp Cloud API, exchanges). See the "Scope note" in `REVIEW.md`.
