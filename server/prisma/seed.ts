import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@dsrsolutions.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo data already seeded.");
    return;
  }

  const passwordHash = await bcrypt.hash("Demo1234!", 10);

  const org = await prisma.organization.create({
    data: {
      name: "Acme Trading Co.",
      plan: "SME",
      users: { create: { email, passwordHash, name: "Demo Owner", role: "OWNER" } },
      integration: { create: {} },
      subscription: {
        create: {
          product: "BUNDLE",
          tier: "ENTERPRISE",
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
    include: { users: true },
  });

  const contact = await prisma.contact.create({
    data: {
      organizationId: org.id,
      name: "Sarah Khan",
      email: "sarah@example.com",
      company: "Khan Textiles",
      status: "QUALIFIED",
    },
  });

  await prisma.deal.create({
    data: {
      organizationId: org.id,
      title: "Textiles bulk order",
      value: 15000,
      stage: "PROPOSAL",
      contactId: contact.id,
      ownerId: org.users[0].id,
    },
  });

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: "Website Relaunch",
      description: "Refresh the corporate site and onboarding flow",
    },
  });

  await prisma.task.create({
    data: { projectId: project.id, title: "Draft new homepage copy", assigneeId: org.users[0].id },
  });

  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      number: "INV-0001",
      clientName: "Khan Textiles",
      clientEmail: "sarah@example.com",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      subtotal: 1500,
      tax: 150,
      total: 1650,
      status: "SENT",
      items: { create: [{ description: "Consulting services", quantity: 10, unitPrice: 150, amount: 1500 }] },
    },
  });

  await prisma.automation.create({
    data: {
      organizationId: org.id,
      name: "Welcome new leads",
      description: "Sends a welcome email whenever a new contact is created.",
      triggerType: "CONTACT_CREATED",
      triggerConfig: "{}",
      actions: JSON.stringify([
        {
          type: "send_email",
          config: {
            to: "{{contact.email}}",
            subject: "Welcome!",
            body: "Hi {{contact.name}}, thanks for connecting with us. Our team will be in touch shortly.",
          },
        },
      ]),
    },
  });

  console.log("Seeded demo organization.");
  console.log(`Login with: ${email} / Demo1234!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
