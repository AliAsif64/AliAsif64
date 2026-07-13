import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import Badge from "../../components/Badge";

interface Subscription {
  product: string;
  tier: string;
  billingPeriod: string;
  status: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string | null;
}

const PRODUCT_LABEL: Record<string, string> = {
  BUSINESS_OS: "Business OS",
  AI_SUITE: "AI Automation Suite",
  BUNDLE: "Full Suite (Business OS + AI Automation Suite)",
};

export default function Billing() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => (await api.get<Subscription | null>("/billing/subscription")).data,
  });

  const portal = useMutation({
    mutationFn: async () => (await api.post<{ url: string }>("/billing/portal")).data,
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const trialDaysLeft =
    subscription?.status === "TRIALING" && subscription.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Billing &amp; Subscription</h1>
      <p className="mb-6 text-sm text-slate-500">Manage your plan and payment details.</p>

      {isLoading ? (
        <div className="text-slate-400">Loading…</div>
      ) : !subscription ? (
        <div className="card p-6">
          <p className="mb-4 text-sm text-slate-600">You don't have a subscription yet.</p>
          <Link to="/pricing" className="btn-primary">View plans</Link>
        </div>
      ) : (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{PRODUCT_LABEL[subscription.product] || subscription.product}</div>
              <div className="text-sm text-slate-500">{subscription.tier} · {subscription.billingPeriod.toLowerCase()}</div>
            </div>
            <Badge>{subscription.status}</Badge>
          </div>

          {trialDaysLeft !== null && (
            <div className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
              {trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your free trial.`
                : "Your trial has ended. Upgrade to keep access."}
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              Your subscription is set to cancel at the end of the current billing period.
            </div>
          )}

          {subscription.currentPeriodEnd && (
            <p className="mb-4 text-sm text-slate-500">
              {subscription.cancelAtPeriodEnd ? "Access ends" : "Renews"} on{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}

          <div className="flex gap-3">
            <Link to="/pricing" className="btn-secondary">Change plan</Link>
            {subscription.stripeSubscriptionId ? (
              <button className="btn-primary" onClick={() => portal.mutate()} disabled={portal.isPending}>
                {portal.isPending ? "Redirecting…" : "Manage billing"}
              </button>
            ) : (
              <Link to="/pricing" className="btn-primary">Subscribe now</Link>
            )}
          </div>
          {portal.isError && <p className="mt-3 text-sm text-red-600">{(portal.error as any)?.response?.data?.error}</p>}
        </div>
      )}
    </div>
  );
}
