import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth";
import { PLANS, REGIONS, TRIAL_DAYS } from "../config/plans";
import { getOrCreateCustomer, isBillingConfigured, resolvePriceId, stripeClient } from "../lib/stripeBilling";

const router = Router();

router.get("/plans", (_req, res) => {
  res.json({ plans: PLANS, regions: REGIONS, trialDays: TRIAL_DAYS, configured: isBillingConfigured() });
});

router.use(requireAuth);

router.get(
  "/subscription",
  asyncHandler(async (req: AuthedRequest, res) => {
    const subscription = await prisma.subscription.findUnique({ where: { organizationId: req.auth!.organizationId } });
    res.json(subscription);
  })
);

const checkoutSchema = z.object({
  product: z.enum(["BUSINESS_OS", "AI_SUITE", "BUNDLE"]),
  tier: z.enum(["SME", "ENTERPRISE"]),
  billingPeriod: z.enum(["MONTHLY", "ANNUAL"]).default("MONTHLY"),
});

router.post(
  "/checkout",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!isBillingConfigured()) {
      return res.status(400).json({ error: "Subscription billing is not configured. Set STRIPE_SECRET_KEY on the server." });
    }
    const data = checkoutSchema.parse(req.body);
    const [org, user, subscription] = await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: req.auth!.organizationId } }),
      prisma.user.findUniqueOrThrow({ where: { id: req.auth!.userId } }),
      prisma.subscription.findUnique({ where: { organizationId: req.auth!.organizationId } }),
    ]);

    const customerId = await getOrCreateCustomer({ customerId: subscription?.stripeCustomerId, email: user.email, name: org.name });
    const priceId = await resolvePriceId(data.product, data.tier, data.billingPeriod);
    const stripe = stripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_ORIGIN}/billing?checkout=success`,
      cancel_url: `${process.env.CLIENT_ORIGIN}/pricing?checkout=cancelled`,
      metadata: { organizationId: org.id, product: data.product, tier: data.tier, billingPeriod: data.billingPeriod },
    });

    res.json({ url: session.url });
  })
);

router.post(
  "/portal",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!isBillingConfigured()) {
      return res.status(400).json({ error: "Subscription billing is not configured." });
    }
    const subscription = await prisma.subscription.findUnique({ where: { organizationId: req.auth!.organizationId } });
    if (!subscription?.stripeCustomerId) {
      return res.status(400).json({ error: "No billing account on file yet. Start a subscription first." });
    }
    const stripe = stripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.CLIENT_ORIGIN}/billing`,
    });
    res.json({ url: session.url });
  })
);

export default router;
