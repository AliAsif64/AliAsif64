import { describe, expect, it } from "vitest";
import { allProducts, productsBySlug } from "../products/registry.js";

type SampleInput = { core: any; feature: any };

const samples: Record<string, SampleInput> = {
  silkinvoice: {
    core: { items: [{ description: "Consulting", amount: 10000 }], buyerNtn: "1234567-8" },
    feature: { invoices: [{ invoiceId: "SI-1", buyerNtn: "1234567-8", total: 11800 }] },
  },
  "paktax-calculator": {
    core: { annualIncome: 1_800_000 },
    feature: { currentIncome: 1_800_000, previousIncome: 1_500_000 },
  },
  "fbr-return-assistant": {
    core: { completedSteps: ["personal-info", "income-sources"] },
    feature: { userId: "u1", completedSteps: ["personal-info", "income-sources"] },
  },
  "gst-invoice-kit": {
    core: { items: [{ description: "Widget", amount: 5000 }] },
    feature: { invoiceNumbers: ["INV-1", "INV-2", "INV-1"] },
  },
  "zakat-planner": {
    core: { cash: 500000, gold: 200000, silver: 50000, investments: 100000, liabilities: 50000 },
    feature: { silverPricePerGram: 250, eligibleAssets: 800000 },
  },
  botbazaar: {
    core: { strategyId: "s1", symbol: "PSX:OGDC" },
    feature: { prices: [100, 95, 90, 105, 110], buyThreshold: 95, sellThreshold: 108 },
  },
  "psx-screener": {
    core: { stocks: [{ symbol: "OGDC", pe: 6, dividendYield: 7 }], minPE: 0, maxPE: 10 },
    feature: {
      savedScreens: { "value-picks": { maxPE: 8, minDividendYield: 6 } },
      screenName: "value-picks",
      stocks: [{ symbol: "OGDC", pe: 6, dividendYield: 7 }],
    },
  },
  "crypto-portfolio-tracker": {
    core: { holdings: [{ exchange: "binance", asset: "BTC", qty: 0.1, avgCost: 50000, price: 60000 }] },
    feature: {
      transactions: [
        { id: "w1", type: "withdrawal", asset: "BTC", qty: 0.1, timestamp: "2026-01-01" },
        { id: "d1", type: "deposit", asset: "BTC", qty: 0.1, timestamp: "2026-01-01" },
      ],
    },
  },
  "tradingview-alert-bot": {
    core: { symbol: "EURUSD", action: "buy", price: 1.08 },
    feature: { accountEquity: 100000, riskPct: 1, entryPrice: 1.08, stopLossPrice: 1.07 },
  },
  "forex-journal": {
    core: { trade: { pair: "EURUSD", entry: 1.08, exit: 1.09, direction: "long", risk: 0.005 } },
    feature: {
      trades: [{ direction: "long", entry: 1.08, exit: 1.09, risk: 0.005 }],
      startingEquity: 10000,
    },
  },
  examgenius: {
    core: { exam: "MDCAT", subject: "Biology" },
    feature: { answers: [{ topic: "Cell Biology", correct: false }, { topic: "Cell Biology", correct: true }] },
  },
  sehatlink: {
    core: { patientId: "p1", doctorId: "d1", slot: "2026-07-13T10:00:00Z" },
    feature: { symptoms: ["fever", "cough"] },
  },
  "whatsbiz-ai": {
    core: { from: "+923001234567", message: "What's the price?" },
    feature: { transcript: ["I need this urgently", "what's the budget for it"] },
  },
  agrisilk: {
    core: { soilPh: 5.5, crop: "wheat" },
    feature: {
      crop: "wheat",
      quantityKg: 500,
      farmerLocation: "Multan",
      buyers: [{ name: "Buyer A", crop: "wheat", pricePerKg: 40, location: "Multan", maxQtyKg: 1000 }],
    },
  },
  "email-reply-bot": {
    core: { subject: "Question", body: "I had a question about your service." },
    feature: { pastEmails: ["Dear Sir, Regards, Ali", "hey whats up"] },
  },
  "social-post-scheduler": {
    core: { platform: "instagram", content: "New product launch!" },
    feature: { platform: "instagram", engagementHistory: [{ hour: 9, engagementRate: 0.02 }, { hour: 18, engagementRate: 0.05 }] },
  },
  "lead-enricher": {
    core: { name: "Ali Khan", domain: "example.com" },
    feature: { email: "ali@example.com", company: "Example Inc", title: "CEO" },
  },
  "meeting-transcriber": {
    core: { audioUrl: "https://example.com/audio.mp3" },
    feature: { segments: ["Let's meet آج شام کو", "Sounds good"] },
  },
  "contentforge-ai": {
    core: { article: "This is a long article about growth strategy." },
    feature: { platform: "linkedin", message: "We grew 40% this quarter." },
  },
  "datasentry-kpi": {
    core: { metrics: { mrr: 500000 } },
    feature: { metric: "mrr", todayValue: 700000, trailingValues: [500000, 510000, 495000] },
  },
  inboxtriage: {
    core: { emails: [{ subject: "Hi", from: "a@b.com" }] },
    feature: { emails: [{ subject: "Urgent!", from: "vip@b.com", isVip: true, hasDeadline: true }] },
  },
  "invoicereader-ai": {
    core: { invoiceText: "Total: 1234.56" },
    feature: { fields: [{ name: "amount", value: "1234.56", confidence: 0.5 }] },
  },
  leadpilot: {
    core: { leadId: "l1", message: "Interested in your product" },
    feature: { leadId: "l1", receivedAt: "2026-07-12T10:00:00Z", respondedAt: "2026-07-12T10:00:20Z" },
  },
  meetingscribe: {
    core: { transcript: "We discussed the roadmap and budget." },
    feature: { sentences: ["Ali will send the report by Friday."] },
  },
  reviewguard: {
    core: { reviewText: "Great service!", rating: 5 },
    feature: { reviewText: "This is a scam, worst experience", rating: 1 },
  },
  "supportdesk-agent": {
    core: { ticket: "How do I reset my password?" },
    feature: { confidence: 0.9, topic: "password" },
  },
  bookingbot: {
    core: { customerId: "c1", slot: "2026-07-14T10:00:00Z" },
    feature: { pastBookings: [{ attended: true }, { attended: false }] },
  },
  cartrescue: {
    core: { cartId: "cart1", items: [{ price: 5000 }, { price: 3000 }] },
    feature: { cartValue: 12000, hoursSinceAbandoned: 2 },
  },
  onboardflow: {
    core: { clientId: "c1", step: "forms" },
    feature: { clientId: "c1", step: "forms", enteredStepAt: "2026-07-01T00:00:00Z", slaHoursPerStep: 48 },
  },
  feedbackminer: {
    core: { feedbackItems: ["slow support", "great UI", "slow support"] },
    feature: { themes: [{ name: "slow support", frequency: 40, severity: 3 }, { name: "great UI", frequency: 60, severity: 1 }] },
  },
  formfiller: {
    core: { sourceColumns: ["Name", "Email"], targetSchema: ["name", "email"] },
    feature: { mappings: [{ source: "Name", target: "name", similarity: 0.95 }, { source: "Addr", target: "address", similarity: 0.4 }] },
  },
  churnwatch: {
    core: { usageTrend: [100, 80, 60], supportTickets: 5 },
    feature: { churnReason: "usage-drop", customerName: "Ali" },
  },
  compliancecheck: {
    core: { contractText: "This agreement includes auto-renewal and unlimited liability.", checklist: ["auto-renewal"] },
    feature: { contractText: "This agreement includes auto-renewal and unlimited liability terms." },
  },
  proposaldrafter: {
    core: { notes: "Client wants an enterprise integration across multiple locations." },
    feature: { notes: "Client wants an enterprise integration across multiple locations." },
  },
  recruitscreen: {
    core: { cvSkills: ["React", "Node"], requiredSkills: ["React", "Node", "AWS"] },
    feature: { cvSkills: ["React", "Node"], requiredSkills: ["React", "Node", "AWS"] },
  },
  researchrunner: {
    core: { competitors: ["CompetitorA", "CompetitorB"] },
    feature: { finding: "CompetitorA launched a new pricing tier this week." },
  },
  seoscout: {
    core: { keyword: "best tax calculator pakistan" },
    feature: { keyword: "buy tax calculator pakistan" },
  },
  socialistener: {
    core: { mentions: [{ text: "love this brand", sentiment: "positive" }] },
    feature: { mentions: [{ text: "worst service ever", sentiment: "negative", reach: 5000 }] },
  },
  stockalert: {
    core: { inventory: [{ sku: "SKU1", qty: 5, reorderPoint: 10 }] },
    feature: { inventory: [{ sku: "SKU1", qty: 5, dailyUsage: 3 }] },
  },
  translateflow: {
    core: { message: "میں مدد چاہتا ہوں" },
    feature: { message: "میں مدد چاہتا ہوں", detectedLanguage: "urdu" },
  },
  codflow: {
    core: { orderId: "o1", customerId: "c1", amount: 3000 },
    feature: { customerId: "c1", pastOrders: [{ delivered: true, refused: false, returned: false }, { delivered: false, refused: true, returned: false }] },
  },
  "freelance-os": {
    core: { projectId: "p1", client: "ClientCo", grossUsd: 1000 },
    feature: { grossUsd: 1000, platform: "fiverr", usdToPkr: 280 },
  },
  "startup-pitch-deck": {
    core: {},
    feature: { filledSlides: ["problem", "solution", "team"] },
  },
  "hr-onboarding-kit": {
    core: { hireName: "Ali", startDate: "2026-08-01" },
    feature: { collectedDocs: ["cnic-copy", "signed-offer-letter"] },
  },
  "sop-template-bundle": {
    core: { category: "operations" },
    feature: { sops: [{ name: "Refund SOP", lastReviewed: "2024-01-01" }] },
  },
  "financial-model-excel": {
    core: { monthlyRevenue: 500000, growthRate: 0.05, monthlyExpenses: 300000, months: 12 },
    feature: { monthlyRevenue: 500000, monthlyExpenses: 300000, months: 12 },
  },
  "whatsapp-business-wrapper": {
    core: { to: "+923001234567", message: "Hello" },
    feature: { webhookAttempts: [{ eventId: "e1", attempt: 2, success: false }] },
  },
  "sms-gateway-pakistan": {
    core: { to: "03001234567", message: "Your OTP is 1234" },
    feature: { to: "03001234567", primaryFailed: true },
  },
  "payment-verification-api": {
    core: { transactionId: "TXN123456", amount: 5000, method: "jazzcash" },
    feature: { claims: [{ orderId: "o1", transactionId: "TXN1", amount: 5000 }, { orderId: "o2", transactionId: "TXN1", amount: 5000 }] },
  },
  "nextjs-saas-starter": {
    core: {},
    feature: { enableBilling: true, enableAdmin: false, enableMultiTenant: true },
  },
};

describe("marketplace product backend registry", () => {
  it("has a registry entry and a sample for every product", () => {
    for (const product of allProducts) {
      expect(samples[product.slug], `missing sample for ${product.slug}`).toBeDefined();
    }
    expect(allProducts.length).toBe(50);
  });

  it("every product's core() and uniqueFeature() run without throwing and return a value", () => {
    for (const product of allProducts) {
      const sample = samples[product.slug];
      const coreResult = product.core(sample.core);
      const featureResult = product.uniqueFeature(sample.feature);
      expect(coreResult, `${product.slug}.core() returned nothing`).toBeDefined();
      expect(featureResult, `${product.slug}.uniqueFeature() returned nothing`).toBeDefined();
    }
  });

  it("looks up products by slug via the registry map", () => {
    expect(productsBySlug.get("silkinvoice")?.title).toBe("SilkInvoice");
    expect(productsBySlug.get("nonexistent-slug")).toBeUndefined();
  });
});
