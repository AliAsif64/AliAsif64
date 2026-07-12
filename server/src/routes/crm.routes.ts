import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { requireEntitlement } from "../middleware/entitlement";
import { emitEvent } from "../services/automationEngine";

const router = Router();
router.use(requireAuth);
router.use(requireEntitlement("BUSINESS_OS"));

// ---------- Contacts ----------

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "UNQUALIFIED"]).optional(),
  notes: z.string().optional(),
});

router.get(
  "/contacts",
  asyncHandler(async (req: AuthedRequest, res) => {
    const contacts = await prisma.contact.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      include: { deals: true },
    });
    res.json(contacts);
  })
);

router.post(
  "/contacts",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = contactSchema.parse(req.body);
    const contact = await prisma.contact.create({
      data: { ...data, organizationId: req.auth!.organizationId },
    });
    await emitEvent(req.auth!.organizationId, "CONTACT_CREATED", { contact });
    res.status(201).json(contact);
  })
);

router.patch(
  "/contacts/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = contactSchema.partial().parse(req.body);
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data,
    });
    res.json(contact);
  })
);

router.delete(
  "/contacts/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// ---------- Deals ----------

const dealSchema = z.object({
  title: z.string().min(1),
  value: z.number().nonnegative().optional(),
  stage: z.enum(["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]).optional(),
  contactId: z.string().optional(),
  ownerId: z.string().optional(),
  expectedCloseDate: z.string().optional(),
});

router.get(
  "/deals",
  asyncHandler(async (req: AuthedRequest, res) => {
    const deals = await prisma.deal.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      include: { contact: true, owner: true },
    });
    res.json(deals);
  })
);

router.post(
  "/deals",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = dealSchema.parse(req.body);
    const deal = await prisma.deal.create({
      data: {
        ...data,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
        organizationId: req.auth!.organizationId,
      },
    });
    res.status(201).json(deal);
  })
);

router.patch(
  "/deals/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = dealSchema.partial().parse(req.body);
    const existing = await prisma.deal.findUnique({ where: { id: req.params.id } });
    const deal = await prisma.deal.update({
      where: { id: req.params.id },
      data: {
        ...data,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
      },
      include: { contact: true, owner: true },
    });
    if (data.stage && existing && data.stage !== existing.stage) {
      await emitEvent(req.auth!.organizationId, "DEAL_STAGE_CHANGED", { deal, previousStage: existing.stage });
    }
    res.json(deal);
  })
);

router.delete(
  "/deals/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.deal.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
