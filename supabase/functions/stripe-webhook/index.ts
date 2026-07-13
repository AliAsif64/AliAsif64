// Stripe webhook receiver. Deploy with --no-verify-jwt; authenticity is
// enforced by Stripe signature verification instead.
// Events to enable in the Stripe dashboard: checkout.session.completed,
// customer.subscription.updated, customer.subscription.deleted,
// invoice.payment_failed.
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { json, serviceClient } from "../_shared/helpers.ts";

Deno.serve(async (req) => {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const signature = req.headers.get("stripe-signature");
  if (!secretKey || !webhookSecret || !signature) return json({ error: "Webhook not configured" }, 400);

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, webhookSecret);
  } catch (err) {
    return json({ error: `Signature verification failed: ${(err as Error).message}` }, 400);
  }

  const db = serviceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organization_id;
      if (organizationId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await db.from("subscriptions").upsert({
          organization_id: organizationId,
          product: session.metadata?.product ?? "BUNDLE",
          tier: session.metadata?.tier ?? "SME",
          billing_period: session.metadata?.billing_period ?? "MONTHLY",
          status: "ACTIVE",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: sub.id,
          stripe_price_id: sub.items.data[0]?.price.id,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id" });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const status = sub.status === "active" ? "ACTIVE" : sub.status === "past_due" ? "PAST_DUE" : sub.status === "canceled" ? "CANCELED" : null;
      const update: Record<string, unknown> = {
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      };
      if (status) update.status = status;
      await db.from("subscriptions").update(update).eq("stripe_subscription_id", sub.id);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await db.from("subscriptions")
          .update({ status: "PAST_DUE", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", invoice.subscription as string);
      }
      break;
    }
  }

  return json({ received: true });
});
