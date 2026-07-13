import { prisma } from "../lib/prisma";

/**
 * A compact, privacy-conscious summary of an organization's live data,
 * injected into AI prompts so answers reflect the actual business instead of
 * generic advice. Only aggregates and a handful of top records are included.
 */
export async function buildBusinessSnapshot(organizationId: string): Promise<string> {
  const [org, contactsCount, deals, invoices, tasks, automations] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    prisma.contact.count({ where: { organizationId } }),
    prisma.deal.findMany({ where: { organizationId }, orderBy: { value: "desc" }, take: 50 }),
    prisma.invoice.findMany({ where: { organizationId } }),
    prisma.task.findMany({ where: { project: { organizationId } } }),
    prisma.automation.findMany({ where: { organizationId }, include: { runs: { orderBy: { createdAt: "desc" }, take: 20 } } }),
  ]);

  const openDeals = deals.filter((d) => !["WON", "LOST"].includes(d.stage));
  const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const wonValue = deals.filter((d) => d.stage === "WON").reduce((sum, d) => sum + d.value, 0);
  const overdue = invoices.filter((i) => i.status === "OVERDUE");
  const outstanding = invoices
    .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.total, 0);
  const paidRevenue = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.total, 0);
  const runs = automations.flatMap((a) => a.runs);
  const failedRuns = runs.filter((r) => r.status !== "SUCCESS").length;

  const topDeals = openDeals
    .slice(0, 5)
    .map((d) => `- "${d.title}" ($${d.value.toLocaleString()}, stage ${d.stage})`)
    .join("\n");
  const overdueList = overdue
    .slice(0, 5)
    .map((i) => `- ${i.number} to ${i.clientName}: $${i.total.toLocaleString()}, due ${i.dueDate.toISOString().slice(0, 10)}`)
    .join("\n");

  return [
    `Company: ${org.name} (${org.plan} plan)`,
    `Contacts: ${contactsCount}`,
    `Open deals: ${openDeals.length} worth $${pipelineValue.toLocaleString()} | Won to date: $${wonValue.toLocaleString()}`,
    topDeals ? `Top open deals:\n${topDeals}` : "",
    `Invoices: $${paidRevenue.toLocaleString()} collected, $${outstanding.toLocaleString()} outstanding, ${overdue.length} overdue`,
    overdueList ? `Overdue invoices:\n${overdueList}` : "",
    `Tasks: ${tasks.filter((t) => t.status === "DONE").length}/${tasks.length} done`,
    `Automations: ${automations.length} configured (${automations.filter((a) => a.active).length} active), ${failedRuns}/${runs.length} recent runs failed`,
  ]
    .filter(Boolean)
    .join("\n");
}
