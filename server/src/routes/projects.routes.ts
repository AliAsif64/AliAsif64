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

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const projects = await prisma.project.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      include: { tasks: { include: { assignee: true } } },
    });
    res.json(projects);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = projectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: { ...data, organizationId: req.auth!.organizationId },
    });
    res.status(201).json(project);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = projectSchema.partial().parse(req.body);
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) return res.status(404).json({ error: "Project not found" });
    const project = await prisma.project.update({ where: { id: existing.id }, data });
    res.json(project);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { count } = await prisma.project.deleteMany({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (count === 0) return res.status(404).json({ error: "Project not found" });
    res.status(204).send();
  })
);

const taskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

router.post(
  "/tasks",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = taskSchema.parse(req.body);
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, organizationId: req.auth!.organizationId },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    const task = await prisma.task.create({
      data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
    res.status(201).json(task);
  })
);

router.patch(
  "/tasks/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = taskSchema.partial().omit({ projectId: true }).parse(req.body);
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, project: { organizationId: req.auth!.organizationId } },
    });
    if (!existing) return res.status(404).json({ error: "Task not found" });
    const task = await prisma.task.update({
      where: { id: existing.id },
      data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
      include: { project: true },
    });
    if (data.status === "DONE" && existing.status !== "DONE") {
      await emitEvent(task.project.organizationId, "TASK_COMPLETED", { task });
    }
    res.json(task);
  })
);

router.delete(
  "/tasks/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { count } = await prisma.task.deleteMany({
      where: { id: req.params.id, project: { organizationId: req.auth!.organizationId } },
    });
    if (count === 0) return res.status(404).json({ error: "Task not found" });
    res.status(204).send();
  })
);

export default router;
