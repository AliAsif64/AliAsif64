import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { requireEntitlement } from "../middleware/entitlement";
import { executeAutomation, scheduleAutomation, unscheduleAutomation } from "../services/automationEngine";

const router = Router();
router.use(requireAuth);
router.use(requireEntitlement("AI_SUITE"));

const actionSchema = z.object({
  type: z.enum(["send_email", "create_task", "webhook", "slack_notify", "ai_generate"]),
  config: z.record(z.any()).default({}),
});

const automationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.enum([
    "CONTACT_CREATED",
    "DEAL_STAGE_CHANGED",
    "INVOICE_OVERDUE",
    "TASK_COMPLETED",
    "SCHEDULE",
    "MANUAL",
  ]),
  triggerConfig: z.record(z.any()).default({}),
  actions: z.array(actionSchema).default([]),
  active: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const automations = await prisma.automation.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      include: { runs: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
    res.json(automations);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = automationSchema.parse(req.body);
    const automation = await prisma.automation.create({
      data: {
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: JSON.stringify(data.triggerConfig),
        actions: JSON.stringify(data.actions),
        active: data.active ?? true,
        organizationId: req.auth!.organizationId,
      },
    });
    if (automation.triggerType === "SCHEDULE") scheduleAutomation(automation);
    res.status(201).json(automation);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = automationSchema.partial().parse(req.body);
    const automation = await prisma.automation.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.triggerType !== undefined && { triggerType: data.triggerType }),
        ...(data.triggerConfig !== undefined && { triggerConfig: JSON.stringify(data.triggerConfig) }),
        ...(data.actions !== undefined && { actions: JSON.stringify(data.actions) }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    if (automation.triggerType === "SCHEDULE") scheduleAutomation(automation);
    else unscheduleAutomation(automation.id);
    res.json(automation);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    unscheduleAutomation(req.params.id);
    await prisma.automation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

router.post(
  "/:id/run",
  asyncHandler(async (req: AuthedRequest, res) => {
    await executeAutomation(req.params.id, req.body.context || {}, "manual");
    const runs = await prisma.automationRun.findMany({
      where: { automationId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    res.json(runs[0]);
  })
);

router.get(
  "/:id/runs",
  asyncHandler(async (req: AuthedRequest, res) => {
    const runs = await prisma.automationRun.findMany({
      where: { automationId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(runs);
  })
);

export default router;
