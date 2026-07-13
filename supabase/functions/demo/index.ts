// Instant no-signup demo sandbox. Frontend flow:
//   1. await supabase.auth.signInAnonymously()
//   2. call this function with the anonymous session's JWT
// It onboards that anonymous user into a fresh, fully-unlocked demo
// organization pre-loaded with sample data. Demo orgs expire after 2 hours
// and are deleted by the dsr-demo-cleanup cron job (cascades wipe all data).
import { errorResponse, handleOptions, HttpError, json, requireUser, serviceClient } from "../_shared/helpers.ts";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user } = await requireUser(req);
    const db = serviceClient();

    const { data: existingProfile } = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (existingProfile) throw new HttpError(409, "This session already has a workspace");

    const expiresAt = new Date(Date.now() + TWO_HOURS_MS).toISOString();

    const { data: org, error: orgError } = await db
      .from("organizations")
      .insert({ name: "Demo Workspace", plan: "ENTERPRISE", is_demo: true, demo_expires_at: expiresAt })
      .select("id").single();
    if (orgError) throw new HttpError(500, orgError.message);

    await db.from("profiles").insert({ id: user.id, organization_id: org.id, name: "Demo User", role: "OWNER" });
    await db.from("integrations").insert({ organization_id: org.id });
    await db.from("subscriptions").insert({
      organization_id: org.id, product: "BUNDLE", tier: "ENTERPRISE",
      status: "ACTIVE", current_period_end: expiresAt,
    });

    const { data: contacts } = await db.from("contacts").insert([
      { organization_id: org.id, name: "Layla Haddad", email: "layla@gulfretail.ae", company: "Gulf Retail Group", status: "QUALIFIED" },
      { organization_id: org.id, name: "James Whitfield", email: "james@northbridge.co.uk", company: "Northbridge Logistics", status: "CONTACTED" },
      { organization_id: org.id, name: "Sarah Chen", email: "sarah@maplecapital.ca", company: "Maple Capital", status: "NEW" },
    ]).select("id, name");

    const layla = contacts?.[0]?.id;
    const james = contacts?.[1]?.id;

    await db.from("deals").insert([
      { organization_id: org.id, title: "Retail POS rollout", value: 42000, stage: "PROPOSAL", contact_id: layla, owner_id: user.id },
      { organization_id: org.id, title: "Logistics automation contract", value: 18500, stage: "WON", contact_id: james, owner_id: user.id },
      { organization_id: org.id, title: "Enterprise onboarding", value: 65000, stage: "NEGOTIATION", owner_id: user.id },
    ]);

    const { data: project } = await db.from("projects")
      .insert({ organization_id: org.id, name: "Q3 Website Relaunch", description: "Refresh marketing site and demo funnel" })
      .select("id").single();
    if (project) {
      await db.from("tasks").insert([
        { project_id: project.id, title: "Design new pricing page", status: "DONE", assignee_id: user.id },
        { project_id: project.id, title: "Write launch announcement", status: "IN_PROGRESS", assignee_id: user.id },
        { project_id: project.id, title: "QA checkout flow", status: "TODO" },
      ]);
    }

    const inTenDays = new Date(Date.now() + 10 * 86400_000).toISOString();
    const { data: invoice } = await db.from("invoices").insert({
      organization_id: org.id, number: "INV-1001", client_name: "Gulf Retail Group",
      client_email: "layla@gulfretail.ae", contact_id: layla, due_date: inTenDays,
      subtotal: 4200, tax: 210, total: 4410, status: "SENT",
    }).select("id").single();
    if (invoice) {
      await db.from("invoice_items").insert({
        invoice_id: invoice.id, description: "Automation setup — Phase 1", quantity: 1, unit_price: 4200, amount: 4200,
      });
    }

    const { data: automation } = await db.from("automations").insert({
      organization_id: org.id,
      name: "Welcome new leads",
      description: "Sends a welcome email whenever a new contact is created.",
      trigger_type: "CONTACT_CREATED",
      actions: [{ type: "send_email", config: { to: "{{contact.email}}", subject: "Welcome!", body: "Hi {{contact.name}}, thanks for connecting." } }],
    }).select("id").single();
    if (automation) {
      await db.from("automation_runs").insert({
        automation_id: automation.id, status: "SUCCESS",
        log: [{ type: "send_email", ok: true, detail: "Email sent to layla@gulfretail.ae" }],
        triggered_by: "event:CONTACT_CREATED",
      });
    }
    await db.from("automations").insert({
      organization_id: org.id,
      name: "Flag overdue invoices in Slack",
      description: "Posts to #finance whenever an invoice becomes overdue.",
      trigger_type: "INVOICE_OVERDUE",
      actions: [{ type: "slack_notify", config: { message: "Invoice {{invoice.number}} is overdue." } }],
    });

    return json({ organization_id: org.id, demo: true, expires_at: expiresAt }, 201);
  } catch (err) {
    return errorResponse(err);
  }
});
