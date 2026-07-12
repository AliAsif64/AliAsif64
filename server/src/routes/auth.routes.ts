import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  organizationName: z.string().min(2),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  plan: z.enum(["SME", "ENTERPRISE"]).optional(),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const organization = await prisma.organization.create({
      data: {
        name: data.organizationName,
        plan: data.plan || "SME",
        users: {
          create: { email: data.email, passwordHash, name: data.name, role: "OWNER" },
        },
        integration: { create: {} },
      },
      include: { users: true },
    });
    const user = organization.users[0];
    const token = signToken({ userId: user.id, organizationId: organization.id, role: user.role });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      organization: { id: organization.id, name: organization.name, plan: organization.plan },
    });
  })
);

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email }, include: { organization: true } });
    if (!user || !user.active) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ userId: user.id, organizationId: user.organizationId, role: user.role });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      organization: { id: user.organization.id, name: user.organization.name, plan: user.organization.plan },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { organization: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, title: user.title, department: user.department },
      organization: { id: user.organization.id, name: user.organization.name, plan: user.organization.plan },
    });
  })
);

export default router;
