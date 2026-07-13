import nodemailer from "nodemailer";
import { prisma } from "./prisma";

interface SendMailArgs {
  organizationId: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Resolves SMTP config with per-organization Integration settings taking
 * priority over the server-wide env vars, so each tenant can bring their
 * own email provider.
 */
async function resolveTransport(organizationId: string) {
  const integration = await prisma.integration.findUnique({ where: { organizationId } });

  const host = integration?.smtpHost || process.env.SMTP_HOST;
  const port = integration?.smtpPort || Number(process.env.SMTP_PORT || 587);
  const user = integration?.smtpUser || process.env.SMTP_USER;
  const pass = integration?.smtpPass || process.env.SMTP_PASS;
  const from = integration?.smtpFrom || process.env.SMTP_FROM || "DSR Solutions <no-reply@example.com>";

  if (!host || !user || !pass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return { transporter, from };
}

export async function sendMail({ organizationId, to, subject, html }: SendMailArgs) {
  const resolved = await resolveTransport(organizationId);
  if (!resolved) {
    return {
      sent: false,
      reason: "No SMTP configuration found. Add SMTP credentials in Settings > Integrations.",
    };
  }
  await resolved.transporter.sendMail({ from: resolved.from, to, subject, html });
  return { sent: true };
}
