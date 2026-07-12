import Stripe from "stripe";
import { BillingPeriod, Product, Tier, amountForPeriod, findPlan } from "../config/plans";

let client: Stripe | null = null;

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function getClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Subscription billing is not configured. Set STRIPE_SECRET_KEY on the server.");
  }
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

const priceCache = new Map<string, string>();

/** Resolves (creating if needed) the Stripe Price for a plan, keyed by a deterministic lookup_key. */
export async function resolvePriceId(product: Product, tier: Tier, period: BillingPeriod): Promise<string> {
  const stripe = getClient();
  const lookupKey = `${product}_${tier}_${period}`.toLowerCase();
  const cached = priceCache.get(lookupKey);
  if (cached) return cached;

  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) {
    priceCache.set(lookupKey, existing.data[0].id);
    return existing.data[0].id;
  }

  const plan = findPlan(product, tier);
  if (!plan) throw new Error(`Unknown plan: ${product}/${tier}`);

  const products = await stripe.products.search({ query: `name:'${plan.name}'`, limit: 1 });
  const stripeProduct = products.data[0] || (await stripe.products.create({ name: plan.name, description: plan.tagline }));

  const price = await stripe.prices.create({
    product: stripeProduct.id,
    currency: "usd",
    unit_amount: Math.round(amountForPeriod(plan, period) * 100),
    recurring: { interval: period === "ANNUAL" ? "year" : "month" },
    lookup_key: lookupKey,
  });
  priceCache.set(lookupKey, price.id);
  return price.id;
}

export async function getOrCreateCustomer(params: { customerId?: string | null; email: string; name: string }): Promise<string> {
  const stripe = getClient();
  if (params.customerId) {
    try {
      const customer = await stripe.customers.retrieve(params.customerId);
      if (!customer.deleted) return params.customerId;
    } catch {
      // fall through and create a new one
    }
  }
  const customer = await stripe.customers.create({ email: params.email, name: params.name });
  return customer.id;
}

export function stripeClient(): Stripe {
  return getClient();
}
