// Subscription billing: Stripe Checkout + Billing Portal.
// Plans/prices are defined here (single source of truth for the Supabase
// backend). Prices are created in Stripe on demand, keyed by lookup_key.
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { errorResponse, handleOptions, HttpError, json, requireUser, serviceClient } from "../_shared/helpers.ts";

const PLANS: Record<string, { name: string; monthly: number; annual: number }> = {
  BUSINESS_OS_SME: { name: "Business OS — SME", monthly: 49, annual: 470 },
  BUSINESS_OS_ENTERPRISE: { name: "Business OS — Enterprise", monthly: 199, annual: 1990 },
  AI_SUITE_SME: { name: "AI Automation Suite — SME", monthly: 79, annual: 790 },
  AI_SUITE_ENTERPRISE: { name: "AI Automation Suite — Enterprise", monthly: 249, annual: 2490 },
  BUNDLE_SME: { name: "Full Suite — SME", monthly: 99, annual: 990 },
  BUNDLE_ENTERPRISE: { name: "Full Suite — Enterprise", monthly: 349, annual: 3490 },
};

function stripeClient(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new HttpError(400, "Billing is not configured. Set the STRIPE_SECRET_KEY secret.");
  return new Stripe(key);
}

async function resolvePriceId(stripe: Stripe, product: string, tier: string, period: string): Promise<string> {
  const planKey = `${product}_${tier}`;
  const plan = PLANS[planKey];
  if (!plan) throw new HttpError(422, `Unknown plan: ${planKey}`);
  const lookupKey = `${planKey}_${period}`.toLowerCase();

  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;

  const products = await stripe.products.search({ query: `name:'${plan.name}'`, limit: 1 });
  const stripeProduct = products.data[0] ?? (await stripe.products.create({ name: plan.name }));
  const price = await stripe.prices.create({
    product: stripeProduct.id,
    currency: "usd",
    unit_amount: Math.round((period === "ANNUAL" ? plan.annual : plan.monthly) * 100),
    recurring: { interval: period === "ANNUAL" ? "year" : "month" },
    lookup_key: lookupKey,
  });
  return price.id;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { supabase, user } = await requireUser(req);
    const body = await req.json();
    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:5173";

    const { data: profile } = await supabase
      .from("profiles").select("organization_id, role, name, organizations(name)").eq("id", user.id).single();
    if (!profile) throw new HttpError(403, "No workspace profile");
    if (!["OWNER", "ADMIN"].includes(profile.role)) throw new HttpError(403, "Only owners and admins can manage billing");

    const db = serviceClient();
    const { data: subscription } = await db
      .from("subscriptions").select("*").eq("organization_id", profile.organization_id).single();
    const stripe = stripeClient();

    if (body.action === "checkout") {
      const { product, tier, billingPeriod = "MONTHLY" } = body;
      if (!PLANS[`${product}_${tier}`]) throw new HttpError(422, "Unknown plan");

      let customerId = subscription?.stripe_customer_id as string | null;
      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId).catch(() => null);
        if (!customer || (customer as { deleted?: boolean }).deleted) customerId = null;
      }
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          name: (profile.organizations as { name?: string } | null)?.name ?? profile.name,
        });
        customerId = customer.id;
      }

      const priceId = await resolvePriceId(stripe, product, tier, billingPeriod);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${siteUrl}/billing?checkout=success`,
        cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
        metadata: { organization_id: profile.organization_id, product, tier, billing_period: billingPeriod },
      });
      return json({ url: session.url });
    }

    if (body.action === "portal") {
      if (!subscription?.stripe_customer_id) {
        throw new HttpError(400, "No billing account on file yet. Start a subscription first.");
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${siteUrl}/billing`,
      });
      return json({ url: session.url });
    }

    throw new HttpError(400, `Unknown action: ${body.action}`);
  } catch (err) {
    return errorResponse(err);
  }
});
