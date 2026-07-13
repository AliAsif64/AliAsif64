import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { PlansResponse, PlanDefinition } from "./pricingTypes";

const PRODUCT_LABEL: Record<PlanDefinition["product"], string> = {
  BUSINESS_OS: "Business OS",
  AI_SUITE: "AI Automation Suite",
  BUNDLE: "Full Suite (Bundle)",
};

function formatMoney(amountUsd: number, currency: string, rate: number, locale: string) {
  const amount = amountUsd * rate;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export default function Pricing() {
  const { user } = useAuth();
  const [tier, setTier] = useState<"SME" | "ENTERPRISE">("SME");
  const [period, setPeriod] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [regionCode, setRegionCode] = useState("US");

  const { data } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => (await api.get<PlansResponse>("/billing/plans")).data,
  });

  const region = useMemo(() => data?.regions.find((r) => r.code === regionCode) || data?.regions[0], [data, regionCode]);

  const checkout = useMutation({
    mutationFn: async (plan: PlanDefinition) =>
      (await api.post<{ url: string }>("/billing/checkout", { product: plan.product, tier: plan.tier, billingPeriod: period })).data,
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const plans = data?.plans.filter((p) => p.tier === tier) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="text-lg font-bold text-brand-700">DSR Solutions</Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          {user ? (
            <Link to="/dashboard" className="hover:text-slate-900">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="hover:text-slate-900">Sign in</Link>
              <Link to="/register" className="btn-primary">Start free trial</Link>
            </>
          )}
        </nav>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-20 pt-8 text-center">
        <h1 className="mb-3 text-3xl font-bold">Simple pricing for every market</h1>
        <p className="mb-8 text-slate-500">
          One global price in USD, shown here in your local currency. Every plan starts with a {data?.trialDays ?? 14}-day free trial of the full platform — no card required.
        </p>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${tier === "SME" ? "bg-brand-600 text-white" : "text-slate-600"}`}
              onClick={() => setTier("SME")}
            >
              SME
            </button>
            <button
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${tier === "ENTERPRISE" ? "bg-brand-600 text-white" : "text-slate-600"}`}
              onClick={() => setTier("ENTERPRISE")}
            >
              Enterprise
            </button>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${period === "MONTHLY" ? "bg-brand-600 text-white" : "text-slate-600"}`}
              onClick={() => setPeriod("MONTHLY")}
            >
              Monthly
            </button>
            <button
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${period === "ANNUAL" ? "bg-brand-600 text-white" : "text-slate-600"}`}
              onClick={() => setPeriod("ANNUAL")}
            >
              Annual (2 months free)
            </button>
          </div>
          <select className="input w-auto" value={regionCode} onChange={(e) => setRegionCode(e.target.value)}>
            {data?.regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label} ({r.currency})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const amount = period === "ANNUAL" ? plan.annualUsd : plan.monthlyUsd;
            const isBundle = plan.product === "BUNDLE";
            return (
              <div key={plan.product} className={`card p-6 text-left ${isBundle ? "border-brand-400 ring-1 ring-brand-400" : ""}`}>
                {isBundle && <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">Best value</div>}
                <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{PRODUCT_LABEL[plan.product]}</div>
                <div className="mb-1 text-3xl font-bold">
                  {region ? formatMoney(amount, region.currency, region.usdRate, "en") : `$${amount}`}
                  <span className="text-base font-normal text-slate-400">/{period === "ANNUAL" ? "yr" : "mo"}</span>
                </div>
                <p className="mb-4 text-sm text-slate-500">{plan.tagline}</p>
                <ul className="mb-6 space-y-2 text-sm text-slate-600">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
                {user ? (
                  <button
                    className="btn-primary w-full justify-center"
                    onClick={() => checkout.mutate(plan)}
                    disabled={checkout.isPending || !data?.configured}
                  >
                    {!data?.configured ? "Contact sales" : checkout.isPending ? "Redirecting…" : "Upgrade to this plan"}
                  </button>
                ) : (
                  <Link to="/register" className="btn-primary w-full justify-center">
                    Start free trial
                  </Link>
                )}
              </div>
            );
          })}
        </div>
        {checkout.isError && <p className="mt-4 text-sm text-red-600">{(checkout.error as any)?.response?.data?.error}</p>}
        <p className="mt-8 text-xs text-slate-400">
          All plans billed in USD via Stripe regardless of region. Displayed local-currency prices are indicative.
        </p>
      </div>
    </div>
  );
}
