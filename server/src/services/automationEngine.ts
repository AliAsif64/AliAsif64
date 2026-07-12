import cron, { ScheduledTask } from "node-cron";
import { prisma } from "../lib/prisma";
import { sendMail } from "../lib/mailer";
import { generateText } from "../lib/ai";

type EventName =
  | "CONTACT_CREATED"
  | "DEAL_STAGE_CHANGED"
  | "INVOICE_OVERDUE"
  | "TASK_COMPLETED"
  | "MANUAL";

interface StepResult {
  type: string;
  ok: boolean;
  detail: string;
}

const scheduledJobs = new Map<string, ScheduledTask>();

/** Replaces {{path.to.value}} placeholders in a string using a flat lookup context. */
function interpolate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path: string) => {
    const value = path.split(".").reduce<any>((acc, key) => (acc == null ? acc : acc[key]), context);
    return value === undefined || value === null ? "" : String(value);
  });
}

async function runAction(
  action: { type: string; config: Record<string, any> },
  context: Record<string, any>,
  organizationId: string
): Promise<StepResult> {
  try {
    switch (action.type) {
      case "send_email": {
        const to = interpolate(action.config.to || "", context);
        const subject = interpolate(action.config.subject || "", context);
        const body = interpolate(action.config.body || "", context);
        const result = await sendMail({ organizationId, to, subject, html: `<p>${body}</p>` });
        return { type: action.type, ok: result.sent, detail: result.sent ? `Email sent to ${to}` : result.reason! };
      }
      case "create_task": {
        const project = await prisma.project.findFirst({
          where: { id: action.config.projectId, organizationId },
        });
        if (!project) {
          return { type: action.type, ok: false, detail: "Project not found in this organization" };
        }
        const task = await prisma.task.create({
          data: {
            projectId: project.id,
            title: interpolate(action.config.title || "New task", context),
            description: action.config.description
              ? interpolate(action.config.description, context)
              : undefined,
            assigneeId: action.config.assigneeId || undefined,
          },
        });
        return { type: action.type, ok: true, detail: `Created task "${task.title}"` };
      }
      case "webhook": {
        const url = interpolate(action.config.url || "", context);
        const res = await fetch(url, {
          method: action.config.method || "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...context, payload: action.config.payload }),
        });
        return { type: action.type, ok: res.ok, detail: `Webhook responded ${res.status}` };
      }
      case "slack_notify": {
        const integration = await prisma.integration.findUnique({ where: { organizationId } });
        if (!integration?.slackWebhookUrl) {
          return { type: action.type, ok: false, detail: "No Slack webhook configured in Settings > Integrations" };
        }
        const message = interpolate(action.config.message || "", context);
        const res = await fetch(integration.slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message }),
        });
        return { type: action.type, ok: res.ok, detail: `Slack notified (${res.status})` };
      }
      case "ai_generate": {
        const prompt = interpolate(action.config.prompt || "", context);
        const output = await generateText(prompt);
        context.ai = { ...(context.ai || {}), output };
        return { type: action.type, ok: true, detail: output.slice(0, 300) };
      }
      default:
        return { type: action.type, ok: false, detail: `Unknown action type: ${action.type}` };
    }
  } catch (err) {
    return { type: action.type, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function executeAutomation(
  automationId: string,
  context: Record<string, any>,
  triggeredBy = "system"
) {
  const automation = await prisma.automation.findUnique({ where: { id: automationId } });
  if (!automation || !automation.active) return;

  const actions: { type: string; config: Record<string, any> }[] = JSON.parse(automation.actions || "[]");
  const results: StepResult[] = [];
  for (const action of actions) {
    const result = await runAction(action, context, automation.organizationId);
    results.push(result);
  }

  const status = results.every((r) => r.ok) ? "SUCCESS" : results.some((r) => r.ok) ? "PARTIAL" : "FAILED";
  await prisma.automationRun.create({
    data: {
      automationId,
      status,
      log: JSON.stringify(results),
      triggeredBy,
    },
  });
}

/** Called from domain routes/services whenever a business event happens. */
export async function emitEvent(
  organizationId: string,
  event: EventName,
  context: Record<string, any>
) {
  const triggerType = event;
  const automations = await prisma.automation.findMany({
    where: { organizationId, triggerType: triggerType as any, active: true },
  });

  for (const automation of automations) {
    const config = JSON.parse(automation.triggerConfig || "{}");
    if (event === "DEAL_STAGE_CHANGED" && config.stage && config.stage !== context.deal?.stage) continue;
    await executeAutomation(automation.id, context, `event:${event}`);
  }
}

export function scheduleAutomation(automation: { id: string; triggerConfig: string; active: boolean }) {
  unscheduleAutomation(automation.id);
  if (!automation.active) return;
  const config = JSON.parse(automation.triggerConfig || "{}");
  if (!config.cron || !cron.validate(config.cron)) return;
  const task = cron.schedule(config.cron, () => {
    executeAutomation(automation.id, { triggeredAt: new Date().toISOString() }, "schedule");
  });
  scheduledJobs.set(automation.id, task);
}

export function unscheduleAutomation(automationId: string) {
  const existing = scheduledJobs.get(automationId);
  if (existing) {
    existing.stop();
    scheduledJobs.delete(automationId);
  }
}

/** Loads and schedules all active SCHEDULE-type automations at server boot. */
export async function bootstrapScheduledAutomations() {
  const automations = await prisma.automation.findMany({
    where: { triggerType: "SCHEDULE", active: true },
  });
  for (const automation of automations) scheduleAutomation(automation);
}

/** Hourly housekeeping: flips SENT invoices past due date to OVERDUE and fires the event. */
export function startInvoiceOverdueWatcher() {
  cron.schedule("0 * * * *", async () => {
    const overdue = await prisma.invoice.findMany({
      where: { status: "SENT", dueDate: { lt: new Date() } },
    });
    for (const invoice of overdue) {
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "OVERDUE" },
      });
      await emitEvent(invoice.organizationId, "INVOICE_OVERDUE", { invoice: updated });
    }
  });
}
