export interface PlanDefinition {
  product: "BUSINESS_OS" | "AI_SUITE" | "BUNDLE";
  tier: "SME" | "ENTERPRISE";
  name: string;
  tagline: string;
  monthlyUsd: number;
  annualUsd: number;
  features: string[];
}

export interface Region {
  code: string;
  label: string;
  currency: string;
  usdRate: number;
}

export interface PlansResponse {
  plans: PlanDefinition[];
  regions: Region[];
  trialDays: number;
  configured: boolean;
}
