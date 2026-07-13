import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function handleOptions(req: Request): Response | null {
  return req.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders }) : null;
}

/** Client acting as the calling user — all queries go through RLS. */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

/** Privileged client for engine/webhook writes that bypass RLS. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export async function requireUser(req: Request) {
  const supabase = userClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Not authenticated");
  return { supabase, user: data.user };
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  console.error(err);
  return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
}

// ---------- Anthropic ----------

export async function claude(prompt: string, system?: string, history?: { role: string; content: string }[]): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new HttpError(400, "AI is not configured. Set the ANTHROPIC_API_KEY secret.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5",
      max_tokens: 1024,
      system: system || "You are a helpful business operations assistant embedded in DSR Solutions.",
      messages: history ?? [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new HttpError(502, `AI request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const block = data.content?.[0];
  return block?.type === "text" ? block.text : "";
}

/** Asks for a JSON object and parses leniently (fences/prose tolerated). */
export async function claudeJSON<T>(prompt: string, system?: string): Promise<T> {
  const text = await claude(`${prompt}\n\nRespond with a single JSON object only — no prose before or after it.`, system);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new HttpError(502, "The AI response did not contain valid JSON.");
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

// ---------- Templating ----------

/** Replaces {{path.to.value}} placeholders using a nested lookup context. */
export function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const value = path.split(".").reduce<unknown>((acc, key) => {
      if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
      return undefined;
    }, context);
    return value === undefined || value === null ? "" : String(value);
  });
}

// ---------- Business snapshot for AI grounding ----------

export async function buildBusinessSnapshot(supabase: SupabaseClient, organizationId: string): Promise<string> {
  const [org, contacts, deals, invoices, tasks, automations] = await Promise.all([
    supabase.from("organizations").select("name, plan").eq("id", organizationId).single(),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("deals").select("title, value, stage").order("value", { ascending: false }).limit(50),
    supabase.from("invoices").select("number, client_name, status, total, due_date"),
    supabase.from("tasks").select("status"),
    supabase.from("automations").select("active, automation_runs(status)").limit(50),
  ]);

  const dealRows = deals.data ?? [];
  const invoiceRows = invoices.data ?? [];
  const taskRows = tasks.data ?? [];
  const automationRows = (automations.data ?? []) as { active: boolean; automation_runs: { status: string }[] }[];

  const open = dealRows.filter((d) => !["WON", "LOST"].includes(d.stage));
  const pipeline = open.reduce((s, d) => s + Number(d.value), 0);
  const won = dealRows.filter((d) => d.stage === "WON").reduce((s, d) => s + Number(d.value), 0);
  const overdue = invoiceRows.filter((i) => i.status === "OVERDUE");
  const outstanding = invoiceRows.filter((i) => ["SENT", "OVERDUE"].includes(i.status)).reduce((s, i) => s + Number(i.total), 0);
  const paid = invoiceRows.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.total), 0);
  const runs = automationRows.flatMap((a) => a.automation_runs ?? []);

  return [
    `Company: ${org.data?.name} (${org.data?.plan} plan)`,
    `Contacts: ${contacts.count ?? 0}`,
    `Open deals: ${open.length} worth $${pipeline.toLocaleString()} | Won to date: $${won.toLocaleString()}`,
    open.slice(0, 5).map((d) => `- "${d.title}" ($${Number(d.value).toLocaleString()}, stage ${d.stage})`).join("\n"),
    `Invoices: $${paid.toLocaleString()} collected, $${outstanding.toLocaleString()} outstanding, ${overdue.length} overdue`,
    overdue.slice(0, 5).map((i) => `- ${i.number} to ${i.client_name}: $${Number(i.total).toLocaleString()}`).join("\n"),
    `Tasks: ${taskRows.filter((t) => t.status === "DONE").length}/${taskRows.length} done`,
    `Automations: ${automationRows.length} configured (${automationRows.filter((a) => a.active).length} active), ${runs.filter((r) => r.status !== "SUCCESS").length}/${runs.length} recent runs failed`,
  ].filter(Boolean).join("\n");
}
