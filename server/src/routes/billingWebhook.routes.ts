import { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { stripeClient } from "../lib/stripeBilling";
import { TRIAL_DAYS } from "../config/plans";

const router = Router();

// Mounted with express.raw() in index.ts so req.body is a Buffer for signature verification.
router.post("/", async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !signature) {
    return res.status(400).json({ error: "Webhook not configured" });
  }

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(req.body as Buffer, signature as string, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${(err as Error).message}` });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organizationId;
      if (organizationId && session.subscription) {
        const stripe = stripeClient();
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await prisma.subscription.upsert({
          where: { organizationId },
          update: {
            product: session.metadata?.product,
            tier: session.metadata?.tier,
            billingPeriod: session.metadata?.billingPeriod,
            status: "ACTIVE",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price.id,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
          create: {
            organizationId,
            product: session.metadata?.product || "BUNDLE",
            tier: session.metadata?.tier || "SME",
            billingPeriod: session.metadata?.billingPeriod || "MONTHLY",
            status: "ACTIVE",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price.id,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
          },
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
      if (existing) {
        const status = sub.status === "active" ? "ACTIVE" : sub.status === "past_due" ? "PAST_DUE" : sub.status === "canceled" ? "CANCELED" : existing.status;
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: invoice.subscription as string } });
        if (existing) {
          await prisma.subscription.update({ where: { id: existing.id }, data: { status: "PAST_DUE" } });
        }
      }
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

export default router;
