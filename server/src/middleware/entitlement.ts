import { NextFunction, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "./auth";
import { Product } from "../config/plans";

function isEntitled(subscription: { product: string; status: string; trialEndsAt: Date | null } | null, product: Product): boolean {
  if (!subscription) return false;
  const grantsProduct = subscription.product === product || subscription.product === "BUNDLE";
  if (!grantsProduct) return false;
  if (subscription.status === "ACTIVE") return true;
  if (subscription.status === "TRIALING") return Boolean(subscription.trialEndsAt && subscription.trialEndsAt > new Date());
  return false;
}

export function requireEntitlement(product: Product) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const subscription = await prisma.subscription.findUnique({ where: { organizationId: req.auth!.organizationId } });
    if (!isEntitled(subscription, product)) {
      return res.status(402).json({
        error: `Your plan doesn't include ${product === "BUSINESS_OS" ? "Business OS" : "the AI Automation Suite"}. Upgrade to continue.`,
        code: "SUBSCRIPTION_REQUIRED",
      });
    }
    next();
  };
}
