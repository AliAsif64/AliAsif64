import { Router } from "express";
import { signToken } from "../lib/jwt";
import { asyncHandler } from "../middleware/errorHandler";
import { createDemoOrganization } from "../services/demoService";
import { prisma } from "../lib/prisma";

const router = Router();

router.post(
  "/session",
  asyncHandler(async (_req, res) => {
    const { organizationId, userId, role } = await createDemoOrganization();
    const [user, organization] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    ]);
    const token = signToken({ userId, organizationId, role });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      organization: { id: organization.id, name: organization.name, plan: organization.plan },
      demo: true,
      expiresAt: organization.demoExpiresAt,
    });
  })
);

export default router;
