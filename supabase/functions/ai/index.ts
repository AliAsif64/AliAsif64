// AI features: chat (data-aware assistant), insights, score-lead, draft-email,
// generate-automation. One function, dispatched on body.action.
import {
  buildBusinessSnapshot,
  claude,
  claudeJSON,
  errorResponse,
  handleOptions,
  HttpError,
  json,
  requireUser,
} from "../_shared/helpers.ts";

const TRIGGERS = ["CONTACT_CREATED", "DEAL_STAGE_CHANGED", "INVOICE_OVERDUE", "TASK_COMPLETED", "SCHEDULE", "MANUAL"];
const ACTIONS = ["send_email", "create_task", "webhook", "slack_notify", "ai_generate"];

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { supabase, user } = await requireUser(req);
    const body = await req.json();
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
    if (!profile) throw new HttpError(403, "No workspace profile");
    const orgId = profile.organization_id;

    switch (body.action) {
      case "chat": {
        const message = String(body.message ?? "").trim();
        if (!message) throw new HttpError(422, "message is required");

        let conversationId: string | null = body.conversationId ?? null;
        if (!conversationId) {
          const { data, error } = await supabase
            .from("ai_conversations")
            .insert({ organization_id: orgId, user_id: user.id, title: message.slice(0, 60) })
            .select("id")
            .single();
          if (error) throw new HttpError(400, error.message);
          conversationId = data.id;
        }

        const { data: prior } = await supabase
          .from("ai_messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        await supabase.from("ai_messages").insert({ conversation_id: conversationId, role: "USER", content: message });

        const history = [
          ...(prior ?? []).map((m) => ({ role: m.role === "USER" ? "user" : "assistant", content: m.content })),
          { role: "user", content: message },
        ];
        const snapshot = await buildBusinessSnapshot(supabase, orgId);
        const reply = await claude(
          "",
          `You are the DSR Solutions AI Assistant, embedded in the user's Business OS and AI Automation Suite workspace. ` +
            `Use the live business data below to give specific, grounded answers — cite actual numbers, deal names, and invoice numbers. ` +
            `Be concise and practical.\n\nLIVE BUSINESS DATA:\n${snapshot}`,
          history,
        );

        await supabase.from("ai_messages").insert({ conversation_id: conversationId, role: "ASSISTANT", content: reply });
        return json({ conversationId, reply });
      }

      case "insights": {
        const snapshot = await buildBusinessSnapshot(supabase, orgId);
        const result = await claudeJSON<{ insights: { title: string; detail: string; priority: string }[] }>(
          `You are a business analyst reviewing this company's live operational data:\n\n${snapshot}\n\n` +
            `Produce 3-5 sharp, specific insights with recommended actions. Reference the actual data — no generic advice. ` +
            `Where an automation would help, say exactly which trigger and action to set up.\n` +
            `JSON shape: {"insights":[{"title":"...","detail":"...","priority":"HIGH|MEDIUM|LOW"}]}`,
        );
        const insights = (result.insights ?? []).slice(0, 6).map((i) => ({
          title: String(i.title ?? ""),
          detail: String(i.detail ?? ""),
          priority: ["HIGH", "MEDIUM", "LOW"].includes(i.priority) ? i.priority : "MEDIUM",
        }));
        return json({ insights });
      }

      case "score-lead": {
        const { data: contact } = await supabase
          .from("contacts")
          .select("*, deals(title, value, stage), invoices(number, total, status)")
          .eq("id", body.contactId)
          .single();
        if (!contact) throw new HttpError(404, "Contact not found");

        const result = await claudeJSON<{ score: number; rationale: string }>(
          `Score this sales lead from 0 (dead) to 100 (ready to close).\n\n` +
            `Lead: ${contact.name}${contact.company ? ` at ${contact.company}` : ""}\nStatus: ${contact.status}\n` +
            `Email on file: ${contact.email ? "yes" : "no"} | Phone: ${contact.phone ? "yes" : "no"}\n` +
            `Notes: ${contact.notes || "none"}\n` +
            `Deals: ${(contact.deals ?? []).map((d: { title: string; value: number; stage: string }) => `"${d.title}" ($${d.value}, ${d.stage})`).join("; ") || "none"}\n` +
            `Invoices: ${(contact.invoices ?? []).map((i: { number: string; total: number; status: string }) => `${i.number} ($${i.total}, ${i.status})`).join("; ") || "none"}\n\n` +
            `JSON shape: {"score": <0-100 integer>, "rationale": "<2-3 sentences>"}`,
        );
        const score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));
        const rationale = String(result.rationale ?? "").slice(0, 1000);
        const { error } = await supabase
          .from("contacts")
          .update({ ai_score: score, ai_score_rationale: rationale })
          .eq("id", contact.id);
        if (error) throw new HttpError(400, error.message);
        return json({ score, rationale });
      }

      case "draft-email": {
        const goal = String(body.goal ?? "").trim();
        if (!goal) throw new HttpError(422, "goal is required");
        const { data: contact } = await supabase
          .from("contacts")
          .select("*, deals(title, value, stage), invoices(number, total, status), organizations(name)")
          .eq("id", body.contactId)
          .single();
        if (!contact) throw new HttpError(404, "Contact not found");

        const result = await claudeJSON<{ subject: string; body: string }>(
          `Draft a professional, warm business email.\n\nGoal: ${goal}\n\n` +
            `Recipient: ${contact.name}${contact.company ? ` at ${contact.company}` : ""} (lead status: ${contact.status})\n` +
            `Their deals with us: ${(contact.deals ?? []).map((d: { title: string; value: number; stage: string }) => `"${d.title}" ($${d.value}, ${d.stage})`).join("; ") || "none"}\n` +
            `Their invoices: ${(contact.invoices ?? []).map((i: { number: string; total: number; status: string }) => `${i.number} ($${i.total}, ${i.status})`).join("; ") || "none"}\n` +
            `Sender company: ${contact.organizations?.name ?? "our company"}\n\n` +
            `Under 150 words, no placeholder brackets — ready to send. JSON shape: {"subject":"...","body":"..."}`,
        );
        return json({ subject: String(result.subject ?? ""), body: String(result.body ?? "") });
      }

      case "generate-automation": {
        const prompt = String(body.prompt ?? "").trim();
        if (prompt.length < 5) throw new HttpError(422, "Describe the automation in at least a few words");
        const { data: projects } = await supabase.from("projects").select("id, name");
        const catalog = (projects ?? []).map((p) => `- ${p.name}: projectId "${p.id}"`).join("\n") || "none";

        const result = await claudeJSON<Record<string, unknown>>(
          `Convert this request into an automation for the DSR platform:\n"${prompt}"\n\n` +
            `triggerType values and triggerConfig:\n` +
            `- CONTACT_CREATED: {} (context: {{contact.name}}, {{contact.email}}, {{contact.company}})\n` +
            `- DEAL_STAGE_CHANGED: {"stage":"NEW|QUALIFIED|PROPOSAL|NEGOTIATION|WON|LOST"} or {} for any (context: {{deal.title}}, {{deal.value}}, {{deal.stage}})\n` +
            `- INVOICE_OVERDUE: {} (context: {{invoice.number}}, {{invoice.client_name}}, {{invoice.total}})\n` +
            `- TASK_COMPLETED: {} (context: {{task.title}})\n` +
            `- SCHEDULE: {"cron":"<5-field cron>"}\n- MANUAL: {}\n\n` +
            `Action types and config:\n` +
            `- send_email: {"to","subject","body"} — placeholders allowed\n` +
            `- create_task: {"projectId","title"} — projectId MUST be one of:\n${catalog}\n` +
            `- webhook: {"url","method"}\n- slack_notify: {"message"}\n` +
            `- ai_generate: {"prompt"} — output becomes {{ai.output}} for later actions\n\n` +
            `JSON shape: {"name":"...","description":"...","triggerType":"...","triggerConfig":{...},"actions":[{"type":"...","config":{...}}]}`,
        );

        const triggerType = String(result.triggerType ?? "");
        const actions = Array.isArray(result.actions) ? result.actions : [];
        if (
          !result.name || !TRIGGERS.includes(triggerType) || actions.length === 0 ||
          !actions.every((a: { type?: string }) => a && ACTIONS.includes(String(a.type)))
        ) {
          throw new HttpError(422, "The AI produced an invalid automation. Try rephrasing your request.");
        }
        return json({
          name: String(result.name),
          description: String(result.description ?? ""),
          trigger_type: triggerType,
          trigger_config: result.triggerConfig ?? {},
          actions,
        });
      }

      default:
        throw new HttpError(400, `Unknown action: ${body.action}`);
    }
  } catch (err) {
    return errorResponse(err);
  }
});
