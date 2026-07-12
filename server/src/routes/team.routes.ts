import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth";
import { sendMail } from "../lib/mailer";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const members = await prisma.user.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, department: true, title: true, active: true, createdAt: true },
    });
    res.json(members);
  })
);

const inviteSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).default("MEMBER"),
  department: z.string().optional(),
  title: z.string().optional(),
});

router.post(
  "/invite",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = inviteSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: "A user with this email already exists" });

    const tempPassword = crypto.randomBytes(6).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const user = await prisma.user.create({
      data: { ...data, passwordHash, organizationId: req.auth!.organizationId },
    });

    const mailResult = await sendMail({
      organizationId: req.auth!.organizationId,
      to: data.email,
      subject: "You've been invited to DSR Solutions",
      html: `<p>You've been added to your team's workspace.</p><p>Temporary password: <strong>${tempPassword}</strong></p><p>Sign in and change it right away.</p>`,
    });

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      emailSent: mailResult.sent,
      temporaryPassword: mailResult.sent ? undefined : tempPassword,
    });
  })
);

const updateSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  active: z.boolean().optional(),
});

router.patch(
  "/:id",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = updateSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, department: true, title: true, active: true },
    });
    res.json(user);
  })
);

export default router;
