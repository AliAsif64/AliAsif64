import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthedRequest, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get(
  "/overview",
  asyncHandler(async (req: AuthedRequest, res) => {
    const organizationId = req.auth!.organizationId;

    const [contactsCount, openDeals, wonDeals, invoices, tasks, automations, runs] = await Promise.all([
      prisma.contact.count({ where: { organizationId } }),
      prisma.deal.findMany({ where: { organizationId, stage: { notIn: ["WON", "LOST"] } } }),
      prisma.deal.findMany({ where: { organizationId, stage: "WON" } }),
      prisma.invoice.findMany({ where: { organizationId } }),
      prisma.task.findMany({ where: { project: { organizationId } } }),
      prisma.automation.count({ where: { organizationId } }),
      prisma.automationRun.findMany({
        where: { automation: { organizationId } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const revenue = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.total, 0);
    const outstanding = invoices
      .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
      .reduce((sum, i) => sum + i.total, 0);
    const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);

    const revenueByMonth: Record<string, number> = {};
    invoices
      .filter((i) => i.status === "PAID" && i.paidAt)
      .forEach((i) => {
        const key = i.paidAt!.toISOString().slice(0, 7);
        revenueByMonth[key] = (revenueByMonth[key] || 0) + i.total;
      });

    res.json({
      contactsCount,
      openDealsCount: openDeals.length,
      wonDealsCount: wonDeals.length,
      pipelineValue,
      revenue,
      outstanding,
      tasksTotal: tasks.length,
      tasksDone: tasks.filter((t) => t.status === "DONE").length,
      automationsCount: automations,
      automationRunsRecent: runs.length,
      automationSuccessRate:
        runs.length === 0 ? null : runs.filter((r) => r.status === "SUCCESS").length / runs.length,
      revenueByMonth,
    });
  })
);

export default router;
