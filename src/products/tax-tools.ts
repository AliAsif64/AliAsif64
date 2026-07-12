import type { ProductModule } from "./types.js";

/** FY2025-26 simplified salaried-individual slabs (PKR, annual). */
const SALARIED_SLABS = [
  { upTo: 600_000, rate: 0 },
  { upTo: 1_200_000, rate: 0.05 },
  { upTo: 2_200_000, rate: 0.15 },
  { upTo: 3_200_000, rate: 0.25 },
  { upTo: 4_100_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

function computeTax(annualIncome: number, slabs: typeof SALARIED_SLABS) {
  let tax = 0;
  let lower = 0;
  for (const slab of slabs) {
    if (annualIncome <= lower) break;
    const taxableInBand = Math.min(annualIncome, slab.upTo) - lower;
    tax += taxableInBand * slab.rate;
    lower = slab.upTo;
  }
  return Math.round(tax);
}

export const paktaxCalculator: ProductModule = {
  slug: "paktax-calculator",
  title: "PakTax Calculator",
  category: "tax-tools",
  tagline: "Salary & business tax calculator for FY 2025-26",
  pricePkr: 3500,
  featureName: "Year-over-year comparison",
  featureDescription:
    "Compares this year's tax burden against last year's income to surface effective-rate drift, so users see the real impact of a raise instead of just a single-year number.",
  core({ annualIncome }: { annualIncome: number }) {
    const tax = computeTax(annualIncome, SALARIED_SLABS);
    return {
      annualIncome,
      tax,
      effectiveRate: annualIncome ? +(tax / annualIncome).toFixed(4) : 0,
      netIncome: annualIncome - tax,
    };
  },
  uniqueFeature({
    currentIncome,
    previousIncome,
  }: {
    currentIncome: number;
    previousIncome: number;
  }) {
    const current = computeTax(currentIncome, SALARIED_SLABS);
    const previous = computeTax(previousIncome, SALARIED_SLABS);
    const currentRate = currentIncome ? current / currentIncome : 0;
    const previousRate = previousIncome ? previous / previousIncome : 0;
    return {
      currentTax: current,
      previousTax: previous,
      taxDelta: current - previous,
      effectiveRateDelta: +(currentRate - previousRate).toFixed(4),
      note:
        currentRate > previousRate
          ? "Your income moved into a higher effective bracket this year."
          : "Your effective rate held steady or improved.",
    };
  },
};

export const fbrReturnAssistant: ProductModule = {
  slug: "fbr-return-assistant",
  title: "FBR Return Assistant",
  category: "tax-tools",
  tagline: "Guided walkthrough for filing your FBR income tax return",
  pricePkr: 6500,
  featureName: "Auto-save & resume filing",
  featureDescription:
    "Persists a checklist progress token so a user who abandons a return mid-filing (very common with FBR IRIS timeouts) can resume exactly where they left off instead of restarting.",
  core({ completedSteps }: { completedSteps: string[] }) {
    const REQUIRED_STEPS = [
      "personal-info",
      "income-sources",
      "deductions",
      "wealth-statement",
      "review",
      "submit",
    ];
    const remaining = REQUIRED_STEPS.filter((s) => !completedSteps.includes(s));
    return {
      requiredSteps: REQUIRED_STEPS,
      completedSteps,
      remaining,
      percentComplete: Math.round(
        ((REQUIRED_STEPS.length - remaining.length) / REQUIRED_STEPS.length) * 100
      ),
      nextStep: remaining[0] ?? null,
    };
  },
  uniqueFeature({
    userId,
    completedSteps,
  }: {
    userId: string;
    completedSteps: string[];
  }) {
    const resumeToken = Buffer.from(`${userId}:${completedSteps.join(",")}`).toString(
      "base64"
    );
    return {
      resumeToken,
      resumeAt: completedSteps.at(-1) ?? "personal-info",
      message: "Progress saved. Use resumeToken to restore this session on any device.",
    };
  },
};

export const gstInvoiceKit: ProductModule = {
  slug: "gst-invoice-kit",
  title: "GST Invoice Kit",
  category: "tax-tools",
  tagline: "Excel + PDF templates for FBR-compliant sales tax invoicing",
  pricePkr: 3000,
  featureName: "Duplicate invoice-number guard",
  featureDescription:
    "Detects reused or colliding invoice numbers across a batch before export, preventing FBR sales-tax filing rejections caused by duplicate invoice IDs.",
  core({ items }: { items: { description: string; amount: number }[] }) {
    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const gst = +(subtotal * 0.18).toFixed(2);
    return { items, subtotal, gstRate: 0.18, gst, total: +(subtotal + gst).toFixed(2) };
  },
  uniqueFeature({ invoiceNumbers }: { invoiceNumbers: string[] }) {
    const seen = new Map<string, number>();
    invoiceNumbers.forEach((n) => seen.set(n, (seen.get(n) ?? 0) + 1));
    const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([n]) => n);
    return {
      totalInvoices: invoiceNumbers.length,
      duplicates,
      isBatchClean: duplicates.length === 0,
    };
  },
};

const NISAB_GRAMS_SILVER = 612.36;

export const zakatPlanner: ProductModule = {
  slug: "zakat-planner",
  title: "Zakat Planner",
  category: "tax-tools",
  tagline: "Annual zakat calculation and disbursement planner",
  pricePkr: 3000,
  featureName: "Nisab auto-updater",
  featureDescription:
    "Recomputes the current nisab threshold from live gold/silver rates instead of a stale hard-coded figure, so users always know whether zakat is actually due this year.",
  core({
    cash,
    gold,
    silver,
    investments,
    liabilities,
  }: {
    cash: number;
    gold: number;
    silver: number;
    investments: number;
    liabilities: number;
  }) {
    const eligibleAssets = cash + gold + silver + investments - liabilities;
    const zakatDue = eligibleAssets > 0 ? +(eligibleAssets * 0.025).toFixed(2) : 0;
    return { eligibleAssets, zakatRate: 0.025, zakatDue };
  },
  uniqueFeature({
    silverPricePerGram,
    eligibleAssets,
  }: {
    silverPricePerGram: number;
    eligibleAssets: number;
  }) {
    const nisabThreshold = +(NISAB_GRAMS_SILVER * silverPricePerGram).toFixed(2);
    const isZakatDue = eligibleAssets >= nisabThreshold;
    return {
      nisabThreshold,
      nisabBasis: `${NISAB_GRAMS_SILVER}g silver`,
      isZakatDue,
      shortfallToNisab: isZakatDue ? 0 : +(nisabThreshold - eligibleAssets).toFixed(2),
    };
  },
};

export const taxToolsProducts: ProductModule[] = [
  paktaxCalculator,
  fbrReturnAssistant,
  gstInvoiceKit,
  zakatPlanner,
];
