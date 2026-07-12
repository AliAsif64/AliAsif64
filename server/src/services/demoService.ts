import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const DEMO_LIFETIME_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function createDemoOrganization() {
  const suffix = Math.random().toString(36).slice(2, 8);
  const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);

  const org = await prisma.organization.create({
    data: {
      name: "Demo Workspace",
      plan: "ENTERPRISE",
      isDemo: true,
      demoExpiresAt: new Date(Date.now() + DEMO_LIFETIME_MS),
      users: { create: { email: `demo-${suffix}@dsr.demo`, passwordHash, name: "Demo User", role: "OWNER" } },
      integration: { create: {} },
      subscription: {
        create: {
          product: "BUNDLE",
          tier: "ENTERPRISE",
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + DEMO_LIFETIME_MS),
        },
      },
    },
    include: { users: true },
  });

  const owner = org.users[0];

  const contactA = await prisma.contact.create({
    data: { organizationId: org.id, name: "Layla Haddad", email: "layla@gulfretail.ae", company: "Gulf Retail Group", status: "QUALIFIED" },
  });
  const contactB = await prisma.contact.create({
    data: { organizationId: org.id, name: "James Whitfield", email: "james@northbridge.co.uk", company: "Northbridge Logistics", status: "CONTACTED" },
  });
  await prisma.contact.create({
    data: { organizationId: org.id, name: "Sarah Chen", email: "sarah@maplecapital.ca", company: "Maple Capital", status: "NEW" },
  });

  await prisma.deal.create({
    data: { organizationId: org.id, title: "Retail POS rollout", value: 42000, stage: "PROPOSAL", contactId: contactA.id, ownerId: owner.id },
  });
  await prisma.deal.create({
    data: { organizationId: org.id, title: "Logistics automation contract", value: 18500, stage: "WON", contactId: contactB.id, ownerId: owner.id },
  });
  await prisma.deal.create({
    data: { organizationId: org.id, title: "Enterprise onboarding", value: 65000, stage: "NEGOTIATION", ownerId: owner.id },
  });

  const project = await prisma.project.create({
    data: { organizationId: org.id, name: "Q3 Website Relaunch", description: "Refresh marketing site and demo funnel" },
  });
  await prisma.task.create({ data: { projectId: project.id, title: "Design new pricing page", status: "DONE", assigneeId: owner.id } });
  await prisma.task.create({ data: { projectId: project.id, title: "Write launch announcement", status: "IN_PROGRESS", assigneeId: owner.id } });
  await prisma.task.create({ data: { projectId: project.id, title: "QA checkout flow", status: "TODO" } });

  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      number: "INV-1001",
      clientName: "Gulf Retail Group",
      clientEmail: contactA.email,
      contactId: contactA.id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      subtotal: 4200,
      tax: 210,
      total: 4410,
      status: "SENT",
      items: { create: [{ description: "Automation setup — Phase 1", quantity: 1, unitPrice: 4200, amount: 4200 }] },
    },
  });
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      number: "INV-1000",
      clientName: "Northbridge Logistics",
      clientEmail: contactB.email,
      contactId: contactB.id,
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      subtotal: 1800,
      tax: 90,
      total: 1890,
      status: "PAID",
      paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      items: { create: [{ description: "Consulting retainer", quantity: 12, unitPrice: 150, amount: 1800 }] },
    },
  });

  const automation = await prisma.automation.create({
    data: {
      organizationId: org.id,
      name: "Welcome new leads",
      description: "Sends a welcome email whenever a new contact is created.",
      triggerType: "CONTACT_CREATED",
      triggerConfig: "{}",
      actions: JSON.stringify([
        { type: "send_email", config: { to: "{{contact.email}}", subject: "Welcome!", body: "Hi {{contact.name}}, thanks for connecting." } },
      ]),
    },
  });
  await prisma.automationRun.create({
    data: {
      automationId: automation.id,
      status: "SUCCESS",
      log: JSON.stringify([{ type: "send_email", ok: true, detail: "Email sent to layla@gulfretail.ae" }]),
      triggeredBy: "event:CONTACT_CREATED",
    },
  });
  await prisma.automation.create({
    data: {
      organizationId: org.id,
      name: "Flag overdue invoices in Slack",
      description: "Posts to #finance whenever an invoice becomes overdue.",
      triggerType: "INVOICE_OVERDUE",
      triggerConfig: "{}",
      actions: JSON.stringify([{ type: "slack_notify", config: { message: "Invoice {{invoice.number}} is overdue." } }]),
    },
  });

  return { organizationId: org.id, userId: owner.id, role: owner.role };
}

export async function cleanupExpiredDemos() {
  await prisma.organization.deleteMany({ where: { isDemo: true, demoExpiresAt: { lt: new Date() } } });
}
