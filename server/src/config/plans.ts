export type Product = "BUSINESS_OS" | "AI_SUITE" | "BUNDLE";
export type Tier = "SME" | "ENTERPRISE";
export type BillingPeriod = "MONTHLY" | "ANNUAL";

export interface PlanDefinition {
  product: Product;
  tier: Tier;
  name: string;
  tagline: string;
  monthlyUsd: number;
  annualUsd: number; // ~2 months free vs monthly x12
  features: string[];
}

/**
 * Placeholder USD pricing — flat global plans, always charged in USD via
 * Stripe regardless of the customer's region. Adjust these before taking
 * real payments; nothing else in the billing flow needs to change since
 * prices are resolved by (product, tier, billingPeriod) at checkout time.
 */
export const PLANS: PlanDefinition[] = [
  {
    product: "BUSINESS_OS",
    tier: "SME",
    name: "Business OS — SME",
    tagline: "CRM, invoicing, projects and team tools for growing teams",
    monthlyUsd: 49,
    annualUsd: 470,
    features: ["CRM & deal pipeline", "Invoicing with online payments", "Projects & tasks", "Up to 10 team members"],
  },
  {
    product: "BUSINESS_OS",
    tier: "ENTERPRISE",
    name: "Business OS — Enterprise",
    tagline: "Unlimited scale, roles, and priority support",
    monthlyUsd: 199,
    annualUsd: 1990,
    features: ["Everything in SME", "Unlimited team members", "Advanced roles & permissions", "Priority support"],
  },
  {
    product: "AI_SUITE",
    tier: "SME",
    name: "AI Automation Suite — SME",
    tagline: "No-code automations and an AI assistant for lean teams",
    monthlyUsd: 79,
    annualUsd: 790,
    features: ["Visual automation builder", "AI Assistant (Claude)", "Email, Slack & webhook actions", "Run history & logs"],
  },
  {
    product: "AI_SUITE",
    tier: "ENTERPRISE",
    name: "AI Automation Suite — Enterprise",
    tagline: "Unlimited automations at enterprise scale",
    monthlyUsd: 249,
    annualUsd: 2490,
    features: ["Everything in SME", "Unlimited automations", "Custom integrations", "Priority support"],
  },
  {
    product: "BUNDLE",
    tier: "SME",
    name: "Full Suite — SME",
    tagline: "Business OS + AI Automation Suite, bundled and discounted",
    monthlyUsd: 99,
    annualUsd: 990,
    features: ["Everything in both suites", "Up to 10 team members", "Best value for growing SMEs"],
  },
  {
    product: "BUNDLE",
    tier: "ENTERPRISE",
    name: "Full Suite — Enterprise",
    tagline: "The complete DSR platform, unlimited scale",
    monthlyUsd: 349,
    annualUsd: 3490,
    features: ["Everything in both suites", "Unlimited team members", "Dedicated onboarding", "Priority support"],
  },
];

export const TRIAL_DAYS = 14;

export function findPlan(product: Product, tier: Tier): PlanDefinition | undefined {
  return PLANS.find((p) => p.product === product && p.tier === tier);
}

export function amountForPeriod(plan: PlanDefinition, period: BillingPeriod): number {
  return period === "ANNUAL" ? plan.annualUsd : plan.monthlyUsd;
}

/**
 * Indicative display-only conversion rates from USD. Actual billing is
 * always in USD via Stripe — these only affect what a visitor sees on the
 * pricing page for their region. Replace with a live FX feed if precise
 * localized pricing is required.
 */
export const REGIONS: { code: string; label: string; currency: string; usdRate: number }[] = [
  { code: "US", label: "United States", currency: "USD", usdRate: 1 },
  { code: "GB", label: "United Kingdom", currency: "GBP", usdRate: 0.79 },
  { code: "CA", label: "Canada", currency: "CAD", usdRate: 1.37 },
  { code: "AU", label: "Australia", currency: "AUD", usdRate: 1.53 },
  { code: "AE", label: "United Arab Emirates", currency: "AED", usdRate: 3.67 },
  { code: "SA", label: "Saudi Arabia", currency: "SAR", usdRate: 3.75 },
  { code: "QA", label: "Qatar", currency: "QAR", usdRate: 3.64 },
  { code: "KW", label: "Kuwait", currency: "KWD", usdRate: 0.31 },
];
