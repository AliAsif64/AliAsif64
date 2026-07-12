import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { requireEntitlement } from "../middleware/entitlement";
import { chat, isAIConfigured } from "../lib/ai";

const router = Router();
router.use(requireAuth);
router.use(requireEntitlement("AI_SUITE"));

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json({ configured: isAIConfigured() });
  })
);

router.get(
  "/conversations",
  asyncHandler(async (req: AuthedRequest, res) => {
    const conversations = await prisma.aIConversation.findMany({
      where: { organizationId: req.auth!.organizationId, userId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(conversations);
  })
);

router.get(
  "/conversations/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    res.json(conversation);
  })
);

const messageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
});

router.post(
  "/chat",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!isAIConfigured()) {
      return res.status(400).json({
        error: "AI Assistant is not configured. Ask an admin to set ANTHROPIC_API_KEY on the server.",
      });
    }
    const data = messageSchema.parse(req.body);

    let conversation = data.conversationId
      ? await prisma.aIConversation.findFirst({
          where: { id: data.conversationId, organizationId: req.auth!.organizationId },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : null;

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          organizationId: req.auth!.organizationId,
          userId: req.auth!.userId,
          title: data.message.slice(0, 60),
        },
        include: { messages: true },
      });
    }

    await prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: "USER", content: data.message },
    });

    const history = [
      ...conversation.messages.map((m) => ({
        role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: data.message },
    ];

    const reply = await chat(history);

    await prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
    });

    res.json({ conversationId: conversation.id, reply });
  })
);

export default router;
