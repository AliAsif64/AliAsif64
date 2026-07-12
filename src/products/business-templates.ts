import type { ProductModule } from "./types.js";

export const codFlow: ProductModule = {
  slug: "codflow",
  title: "CodFlow",
  category: "business-templates",
  tagline: "Cash-on-delivery order + returns platform for Pakistani e-commerce",
  pricePkr: 48000,
  featureName: "Return-fraud risk scorer",
  featureDescription:
    "Scores each return/refused-COD request against the customer's history (refusal rate, return rate, address changes) so high-risk COD orders can be flagged before dispatch.",
  core({ orderId, customerId, amount }: { orderId: string; customerId: string; amount: number }) {
    return { orderId, customerId, amount, status: "pending-dispatch", paymentMethod: "COD" };
  },
  uniqueFeature({
    customerId,
    pastOrders,
  }: {
    customerId: string;
    pastOrders: { delivered: boolean; refused: boolean; returned: boolean }[];
  }) {
    const total = pastOrders.length || 1;
    const refusedRate = pastOrders.filter((o) => o.refused).length / total;
    const returnedRate = pastOrders.filter((o) => o.returned).length / total;
    const riskScore = Math.min(100, Math.round((refusedRate * 0.6 + returnedRate * 0.4) * 100));
    return {
      customerId,
      riskScore,
      riskLevel: riskScore > 50 ? "high" : riskScore > 20 ? "medium" : "low",
      recommendation: riskScore > 50 ? "require prepayment or call confirmation" : "proceed with COD",
    };
  },
};

export const freelanceOs: ProductModule = {
  slug: "freelance-os",
  title: "Freelance-OS",
  category: "business-templates",
  tagline: "All-in-one operating system for Pakistani freelancers on Fiverr/Upwork",
  pricePkr: 52000,
  featureName: "Platform-fee net earnings calculator",
  featureDescription:
    "Computes true take-home PKR after Fiverr/Upwork service fees and USD-to-PKR conversion, since freelancers otherwise track gross figures that overstate real income.",
  core({ projectId, client, grossUsd }: { projectId: string; client: string; grossUsd: number }) {
    return { projectId, client, grossUsd, status: "invoiced" };
  },
  uniqueFeature({
    grossUsd,
    platform,
    usdToPkr,
  }: {
    grossUsd: number;
    platform: "fiverr" | "upwork";
    usdToPkr: number;
  }) {
    const feeRate = platform === "fiverr" ? 0.2 : 0.1;
    const netUsd = +(grossUsd * (1 - feeRate)).toFixed(2);
    const netPkr = +(netUsd * usdToPkr).toFixed(2);
    return { platform, feeRate, netUsd, netPkr };
  },
};

export const startupPitchDeck: ProductModule = {
  slug: "startup-pitch-deck",
  title: "Startup Pitch Deck",
  category: "business-templates",
  tagline: "16-slide investor deck template (Keynote + PPTX)",
  pricePkr: 3500,
  featureName: "Investor-readiness scorer",
  featureDescription:
    "Checks a filled-in deck outline against the slide sections investors expect and scores completeness, so founders know exactly what's missing before sending it out.",
  core() {
    return {
      slides: [
        "cover", "problem", "solution", "market-size", "product", "traction",
        "business-model", "go-to-market", "competition", "team", "financials",
        "ask", "roadmap", "vision", "appendix", "contact",
      ],
    };
  },
  uniqueFeature({ filledSlides }: { filledSlides: string[] }) {
    const required = [
      "problem", "solution", "market-size", "traction", "business-model", "team", "ask",
    ];
    const missing = required.filter((s) => !filledSlides.includes(s));
    const score = Math.round(((required.length - missing.length) / required.length) * 100);
    return { score, missing, readiness: score === 100 ? "investor-ready" : "needs work" };
  },
};

export const hrOnboardingKit: ProductModule = {
  slug: "hr-onboarding-kit",
  title: "HR Onboarding Kit",
  category: "business-templates",
  tagline: "Full HR onboarding playbook + templates for Pakistani SMBs",
  pricePkr: 4000,
  featureName: "Compliance-document tracker",
  featureDescription:
    "Tracks which Pakistani-labour-law-required documents (CNIC, EOBI, offer letter, NDA) have been collected per new hire and flags gaps before day one.",
  core({ hireName, startDate }: { hireName: string; startDate: string }) {
    return {
      hireName,
      startDate,
      checklist: ["offer-letter", "welcome-email", "equipment-request", "team-intro"],
    };
  },
  uniqueFeature({ collectedDocs }: { collectedDocs: string[] }) {
    const REQUIRED_DOCS = ["cnic-copy", "eobi-registration", "signed-offer-letter", "nda"];
    const missing = REQUIRED_DOCS.filter((d) => !collectedDocs.includes(d));
    return { requiredDocs: REQUIRED_DOCS, missing, compliant: missing.length === 0 };
  },
};

export const sopTemplateBundle: ProductModule = {
  slug: "sop-template-bundle",
  title: "SOP Template Bundle",
  category: "business-templates",
  tagline: "50+ standard operating procedure templates",
  pricePkr: 4500,
  featureName: "SOP version control & staleness flag",
  featureDescription:
    "Tracks a revision history per SOP and flags any document not reviewed in over a year, since stale SOPs are a common audit failure point for SMBs.",
  core({ category }: { category: string }) {
    return { category, templateCount: 50, format: ["docx", "pdf"] };
  },
  uniqueFeature({
    sops,
  }: {
    sops: { name: string; lastReviewed: string }[];
  }) {
    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const stale = sops.filter((s) => now - new Date(s.lastReviewed).getTime() > oneYearMs);
    return { staleCount: stale.length, staleSops: stale.map((s) => s.name) };
  },
};

export const financialModelExcel: ProductModule = {
  slug: "financial-model-excel",
  title: "Financial Model Excel",
  category: "business-templates",
  tagline: "3-statement SaaS/e-commerce financial model",
  pricePkr: 7000,
  featureName: "Best/base/worst scenario sensitivity",
  featureDescription:
    "Runs the same model through optimistic, base, and pessimistic growth-rate assumptions in one call, giving founders a sensitivity range instead of a single fragile projection.",
  core({
    monthlyRevenue,
    growthRate,
    monthlyExpenses,
    months,
  }: {
    monthlyRevenue: number;
    growthRate: number;
    monthlyExpenses: number;
    months: number;
  }) {
    let revenue = monthlyRevenue;
    let cumulativeProfit = 0;
    const projection = [];
    for (let m = 1; m <= months; m++) {
      const profit = revenue - monthlyExpenses;
      cumulativeProfit += profit;
      projection.push({ month: m, revenue: +revenue.toFixed(2), profit: +profit.toFixed(2) });
      revenue *= 1 + growthRate;
    }
    return { projection, cumulativeProfit: +cumulativeProfit.toFixed(2) };
  },
  uniqueFeature({
    monthlyRevenue,
    monthlyExpenses,
    months,
  }: {
    monthlyRevenue: number;
    monthlyExpenses: number;
    months: number;
  }) {
    const scenarios = { worst: -0.02, base: 0.05, best: 0.15 };
    const results: Record<string, number> = {};
    for (const [name, rate] of Object.entries(scenarios)) {
      let revenue = monthlyRevenue;
      let cumulativeProfit = 0;
      for (let m = 1; m <= months; m++) {
        cumulativeProfit += revenue - monthlyExpenses;
        revenue *= 1 + rate;
      }
      results[name] = +cumulativeProfit.toFixed(2);
    }
    return { scenarios: results };
  },
};

export const businessTemplatesProducts: ProductModule[] = [
  codFlow,
  freelanceOs,
  startupPitchDeck,
  hrOnboardingKit,
  sopTemplateBundle,
  financialModelExcel,
];
