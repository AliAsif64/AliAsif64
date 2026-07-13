// Automation engine. Invoked three ways:
// 1. Postgres triggers via notify_automation() -> {event, payload} with the
//    x-internal-secret header (deploy with --no-verify-jwt).
// 2. pg_cron SCHEDULE_TICK every 5 minutes -> runs due SCHEDULE automations.
// 3. Authenticated users -> {automation_id, context} for manual "Run now".
import { claude, errorResponse, handleOptions, HttpError, interpolate, json, serviceClient, userClient } from "../_shared/helpers.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Action {
  type: string;
  config: Record<string, string>;
}
interface StepResult {
  type: string;
  ok: boolean;
  detail: string;
}

async function runAction(
  db: SupabaseClient,
  action: Action,
  context: Record<string, unknown>,
  organizationId: string,
): Promise<StepResult> {
  try {
    switch (action.type) {
      case "send_email": {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (!resendKey) return { type: action.type, ok: false, detail: "Email not configured. Set the RESEND_API_KEY secret." };
        const { data: integration } = await db.from("integrations").select("smtp_from").eq("organization_id", organizationId).single();
        const to = interpolate(action.config.to ?? "", context);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: integration?.smtp_from || Deno.env.get("EMAIL_FROM") || "DSR Solutions <onboarding@resend.dev>",
            to: [to],
            subject: interpolate(action.config.subject ?? "", context),
            html: `<p>${interpolate(action.config.body ?? "", context)}</p>`,
          }),
        });
        return res.ok
          ? { type: action.type, ok: true, detail: `Email sent to ${to}` }
          : { type: action.type, ok: false, detail: `Email failed (${res.status}): ${await res.text()}` };
      }
      case "create_task": {
        const { data: project } = await db
          .from("projects").select("id")
          .eq("id", action.config.projectId).eq("organization_id", organizationId).single();
        if (!project) return { type: action.type, ok: false, detail: "Project not found in this organization" };
        const title = interpolate(action.config.title || "New task", context);
        const { error } = await db.from("tasks").insert({ project_id: project.id, title });
        return error
          ? { type: action.type, ok: false, detail: error.message }
          : { type: action.type, ok: true, detail: `Created task "${title}"` };
      }
      case "webhook": {
        const url = interpolate(action.config.url ?? "", context);
        const res = await fetch(url, {
          method: action.config.method || "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(context),
        });
        return { type: action.type, ok: res.ok, detail: `Webhook responded ${res.status}` };
      }
      case "slack_notify": {
        const { data: integration } = await db.from("integrations").select("slack_webhook_url").eq("organization_id", organizationId).single();
        if (!integration?.slack_webhook_url) {
          return { type: action.type, ok: false, detail: "No Slack webhook configured in Settings" };
        }
        const res = await fetch(integration.slack_webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: interpolate(action.config.message ?? "", context) }),
        });
        return { type: action.type, ok: res.ok, detail: `Slack notified (${res.status})` };
      }
      case "ai_generate": {
        const output = await claude(interpolate(action.config.prompt ?? "", context));
        (context as Record<string, unknown>).ai = { output };
        return { type: action.type, ok: true, detail: output.slice(0, 300) };
      }
      default:
        return { type: action.type, ok: false, detail: `Unknown action type: ${action.type}` };
    }
  } catch (err) {
    return { type: action.type, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function execute(
  db: SupabaseClient,
  automation: { id: string; organization_id: string; actions: Action[] },
  context: Record<string, unknown>,
  triggeredBy: string,
) {
  const results: StepResult[] = [];
  for (const action of automation.actions ?? []) {
    results.push(await runAction(db, action, context, automation.organization_id));
  }
  const status = results.every((r) => r.ok) ? "SUCCESS" : results.some((r) => r.ok) ? "PARTIAL" : "FAILED";
  await db.from("automation_runs").insert({ automation_id: automation.id, status, log: results, triggered_by: triggeredBy });
  await db.from("automations").update({ last_run_at: new Date().toISOString() }).eq("id", automation.id);
  return { status, results };
}

/** Minimal 5-field cron matcher (minute hour dom month dow), supports * , - and steps. */
function cronMatches(expr: string, date: Date): boolean {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const values = [date.getUTCMinutes(), date.getUTCHours(), date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCDay()];
  return fields.every((field, i) =>
    field.split(",").some((part) => {
      const [range, stepStr] = part.split("/");
      const step = stepStr ? parseInt(stepStr, 10) : 1;
      let lo: number, hi: number;
      if (range === "*" || range === "") [lo, hi] = [0, 59 + 40];
      else if (range.includes("-")) [lo, hi] = range.split("-").map((n) => parseInt(n, 10)) as [number, number];
      else { lo = hi = parseInt(range, 10); }
      const v = values[i];
      return v >= lo && v <= hi && (v - lo) % step === 0;
    })
  );
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const body = await req.json();
    const internalSecret = req.headers.get("x-internal-secret");
    const db = serviceClient();

    if (internalSecret) {
      const { data: cfg } = await db.from("app_config").select("internal_secret").eq("id", 1).single();
      if (!cfg?.internal_secret || cfg.internal_secret !== internalSecret) {
        throw new HttpError(401, "Bad internal secret");
      }

      if (body.event === "SCHEDULE_TICK") {
        const now = new Date();
        const { data: automations } = await db
          .from("automations").select("*")
          .eq("trigger_type", "SCHEDULE").eq("active", true);
        let ran = 0;
        for (const automation of automations ?? []) {
          const cron = automation.trigger_config?.cron;
          const last = automation.last_run_at ? new Date(automation.last_run_at) : null;
          // Fire if the cron matches any minute in the 5-minute tick window we
          // just passed, and we haven't already run inside that window.
          const due = [...Array(5).keys()].some((m) => cronMatches(cron ?? "", new Date(now.getTime() - m * 60_000)));
          if (cron && due && (!last || now.getTime() - last.getTime() > 4 * 60_000)) {
            await execute(db, automation, { triggered_at: now.toISOString() }, "schedule");
            ran++;
          }
        }
        return json({ ok: true, ran });
      }

      // Domain event from a Postgres trigger
      const { event, payload } = body;
      const { data: automations } = await db
        .from("automations").select("*")
        .eq("organization_id", payload.organization_id)
        .eq("trigger_type", event).eq("active", true);
      for (const automation of automations ?? []) {
        const stageFilter = automation.trigger_config?.stage;
        if (event === "DEAL_STAGE_CHANGED" && stageFilter && stageFilter !== payload.deal?.stage) continue;
        await execute(db, automation, payload, `event:${event}`);
      }
      return json({ ok: true, matched: (automations ?? []).length });
    }

    // Manual run by an authenticated user — verify via RLS-scoped read first.
    const asUser = userClient(req);
    const { data: auth } = await asUser.auth.getUser();
    if (!auth.user) throw new HttpError(401, "Not authenticated");
    const { data: automation } = await asUser.from("automations").select("*").eq("id", body.automation_id).single();
    if (!automation) throw new HttpError(404, "Automation not found");
    const result = await execute(db, automation, body.context ?? {}, "manual");
    return json(result);
  } catch (err) {
    return errorResponse(err);
  }
});
