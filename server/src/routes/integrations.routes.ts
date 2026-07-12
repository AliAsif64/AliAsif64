import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth";
import { isAIConfigured } from "../lib/ai";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const integration = await prisma.integration.findUnique({ where: { organizationId: req.auth!.organizationId } });
    res.json({
      smtpHost: integration?.smtpHost || "",
      smtpPort: integration?.smtpPort || null,
      smtpUser: integration?.smtpUser || "",
      smtpFrom: integration?.smtpFrom || "",
      smtpConfigured: Boolean(integration?.smtpHost) || Boolean(process.env.SMTP_HOST),
      slackWebhookUrl: integration?.slackWebhookUrl ? "••••••••" : "",
      slackConfigured: Boolean(integration?.slackWebhookUrl),
      stripeConfigured: Boolean(integration?.stripeSecretKey) || Boolean(process.env.STRIPE_SECRET_KEY),
      aiConfigured: isAIConfigured(),
    });
  })
);

const updateSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFrom: z.string().optional(),
  slackWebhookUrl: z.string().optional(),
  stripeSecretKey: z.string().optional(),
});

router.put(
  "/",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = updateSchema.parse(req.body);
    const integration = await prisma.integration.upsert({
      where: { organizationId: req.auth!.organizationId },
      update: data,
      create: { ...data, organizationId: req.auth!.organizationId },
    });
    res.json({ ok: true, updatedAt: integration.updatedAt });
  })
);

export default router;
