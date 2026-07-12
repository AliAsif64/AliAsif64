import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { requireEntitlement } from "../middleware/entitlement";
import { chat, generateJSON, isAIConfigured } from "../lib/ai";
import { buildBusinessSnapshot } from "../services/businessSnapshot";

const router = Router();
router.use(requireAuth);
router.use(requireEntitlement("AI_SUITE"));

function aiNotConfigured(res: any): boolean {
  if (!isAIConfigured()) {
    res.status(400).json({ error: "AI features are not configured. Ask an admin to set ANTHROPIC_API_KEY on the server." });
    return true;
  }
  return false;
}

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json({ configured: isAIConfigured() });
  })
);

// ---------- Assistant chat (data-aware) ----------

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
    if (aiNotConfigured(res)) return;
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

    const snapshot = await buildBusinessSnapshot(req.auth!.organizationId);
    const reply = await chat(
      history,
      `You are the DSR Solutions AI Assistant, embedded in the user's Business OS and AI Automation Suite workspace. ` +
        `Use the live business data below to give specific, grounded answers — cite actual numbers, deal names, and invoice numbers when relevant. ` +
        `Be concise and practical. Suggest concrete next steps or automations the platform can run (email, task, webhook, Slack, AI text actions).\n\n` +
        `LIVE BUSINESS DATA:\n${snapshot}`
    );

    await prisma.aIMessage.create({
      data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
    });

    res.json({ conversationId: conversation.id, reply });
  })
);

// ---------- AI business insights (dashboard) ----------

router.post(
  "/insights",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (aiNotConfigured(res)) return;
    const snapshot = await buildBusinessSnapshot(req.auth!.organizationId);
    const result = await generateJSON<{ insights: { title: string; detail: string; priority: string }[] }>(
      `You are a business analyst reviewing this company's live operational data:\n\n${snapshot}\n\n` +
        `Produce 3-5 sharp, specific insights with recommended actions. Each insight must reference the actual data ` +
        `(names, amounts, counts) — no generic advice. Where an automation would help, say exactly which trigger and action to set up.\n` +
        `JSON shape: {"insights":[{"title":"...","detail":"...","priority":"HIGH|MEDIUM|LOW"}]}`
    );
    const insights = (result.insights || []).slice(0, 6).map((i) => ({
      title: String(i.title || ""),
      detail: String(i.detail || ""),
      priority: ["HIGH", "MEDIUM", "LOW"].includes(i.priority) ? i.priority : "MEDIUM",
    }));
    res.json({ insights });
  })
);

// ---------- AI lead scoring ----------

router.post(
  "/score-lead/:contactId",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (aiNotConfigured(res)) return;
    const contact = await prisma.contact.findFirst({
      where: { id: req.params.contactId, organizationId: req.auth!.organizationId },
      include: { deals: true, invoices: true },
    });
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const dealLines = contact.deals
      .map((d) => `- "${d.title}": $${d.value.toLocaleString()}, stage ${d.stage}`)
      .join("\n");
    const invoiceLines = contact.invoices
      .map((i) => `- ${i.number}: $${i.total.toLocaleString()}, status ${i.status}`)
      .join("\n");

    const result = await generateJSON<{ score: number; rationale: string }>(
      `Score this sales lead from 0 (dead) to 100 (ready to close) based on the data below. ` +
        `Consider engagement status, deal pipeline presence and stages, deal value, and payment history.\n\n` +
        `Lead: ${contact.name}${contact.company ? ` at ${contact.company}` : ""}\n` +
        `Status: ${contact.status}\n` +
        `Email on file: ${contact.email ? "yes" : "no"} | Phone on file: ${contact.phone ? "yes" : "no"}\n` +
        `Notes: ${contact.notes || "none"}\n` +
        `Deals:\n${dealLines || "none"}\n` +
        `Invoices:\n${invoiceLines || "none"}\n\n` +
        `JSON shape: {"score": <0-100 integer>, "rationale": "<2-3 sentence explanation>"}`
    );

    const score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));
    const rationale = String(result.rationale || "").slice(0, 1000);
    const updated = await prisma.contact.update({
      where: { id: contact.id },
      data: { aiScore: score, aiScoreRationale: rationale },
    });
    res.json({ score: updated.aiScore, rationale: updated.aiScoreRationale });
  })
);

// ---------- AI email drafting ----------

const draftEmailSchema = z.object({
  contactId: z.string(),
  goal: z.string().min(3).max(500),
});

router.post(
  "/draft-email",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (aiNotConfigured(res)) return;
    const data = draftEmailSchema.parse(req.body);
    const contact = await prisma.contact.findFirst({
      where: { id: data.contactId, organizationId: req.auth!.organizationId },
      include: { deals: true, invoices: true, organization: true },
    });
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const context = [
      `Recipient: ${contact.name}${contact.company ? ` at ${contact.company}` : ""} (lead status: ${contact.status})`,
      contact.deals.length
        ? `Their deals with us: ${contact.deals.map((d) => `"${d.title}" ($${d.value.toLocaleString()}, ${d.stage})`).join("; ")}`
        : "",
      contact.invoices.length
        ? `Their invoices: ${contact.invoices.map((i) => `${i.number} ($${i.total.toLocaleString()}, ${i.status})`).join("; ")}`
        : "",
      `Sender company: ${contact.organization.name}`,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await generateJSON<{ subject: string; body: string }>(
      `Draft a professional, warm business email.\n\nGoal: ${data.goal}\n\nContext:\n${context}\n\n` +
        `Keep it under 150 words, no placeholder brackets — write it ready to send. ` +
        `JSON shape: {"subject":"...","body":"..."}`
    );
    res.json({ subject: String(result.subject || ""), body: String(result.body || "") });
  })
);

// ---------- Natural-language automation builder ----------

const generatedAutomationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  triggerType: z.enum(["CONTACT_CREATED", "DEAL_STAGE_CHANGED", "INVOICE_OVERDUE", "TASK_COMPLETED", "SCHEDULE", "MANUAL"]),
  triggerConfig: z.record(z.any()).default({}),
  actions: z
    .array(
      z.object({
        type: z.enum(["send_email", "create_task", "webhook", "slack_notify", "ai_generate"]),
        config: z.record(z.any()).default({}),
      })
    )
    .min(1),
});

router.post(
  "/generate-automation",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (aiNotConfigured(res)) return;
    const { prompt } = z.object({ prompt: z.string().min(5).max(1000) }).parse(req.body);

    const projects = await prisma.project.findMany({
      where: { organizationId: req.auth!.organizationId },
      select: { id: true, name: true },
    });
    const projectCatalog = projects.map((p) => `- ${p.name}: projectId "${p.id}"`).join("\n") || "none";

    const result = await generateJSON<unknown>(
      `Convert this request into an automation for the DSR platform:\n"${prompt}"\n\n` +
        `Available triggerType values and their triggerConfig:\n` +
        `- CONTACT_CREATED: {} (context: {{contact.name}}, {{contact.email}}, {{contact.company}})\n` +
        `- DEAL_STAGE_CHANGED: {"stage":"NEW|QUALIFIED|PROPOSAL|NEGOTIATION|WON|LOST"} to filter, or {} for any (context: {{deal.title}}, {{deal.value}}, {{deal.stage}})\n` +
        `- INVOICE_OVERDUE: {} (context: {{invoice.number}}, {{invoice.clientName}}, {{invoice.total}})\n` +
        `- TASK_COMPLETED: {} (context: {{task.title}})\n` +
        `- SCHEDULE: {"cron":"<5-field cron expression>"}\n` +
        `- MANUAL: {}\n\n` +
        `Available action types and their config:\n` +
        `- send_email: {"to","subject","body"} — placeholders allowed in all fields\n` +
        `- create_task: {"projectId","title"} — projectId MUST be one of the org's real projects:\n${projectCatalog}\n` +
        `- webhook: {"url","method"}\n` +
        `- slack_notify: {"message"}\n` +
        `- ai_generate: {"prompt"} — its output becomes {{ai.output}} for later actions\n\n` +
        `Rules: use only listed types/keys; if the request needs a task but no project exists, use a different action and note it in the description.\n` +
        `JSON shape: {"name":"...","description":"...","triggerType":"...","triggerConfig":{...},"actions":[{"type":"...","config":{...}}]}`
    );

    const parsed = generatedAutomationSchema.safeParse(result);
    if (!parsed.success) {
      return res.status(422).json({ error: "The AI produced an invalid automation. Try rephrasing your request." });
    }
    res.json(parsed.data);
  })
);

export default router;
