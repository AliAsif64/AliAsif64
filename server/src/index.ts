import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import authRoutes from "./routes/auth.routes";
import crmRoutes from "./routes/crm.routes";
import invoiceRoutes from "./routes/invoices.routes";
import projectRoutes from "./routes/projects.routes";
import teamRoutes from "./routes/team.routes";
import analyticsRoutes from "./routes/analytics.routes";
import automationRoutes from "./routes/automations.routes";
import aiRoutes from "./routes/ai.routes";
import integrationRoutes from "./routes/integrations.routes";
import billingRoutes from "./routes/billing.routes";
import billingWebhookRoutes from "./routes/billingWebhook.routes";
import demoRoutes from "./routes/demo.routes";
import { errorHandler } from "./middleware/errorHandler";
import { bootstrapScheduledAutomations, startInvoiceOverdueWatcher } from "./services/automationEngine";
import { cleanupExpiredDemos } from "./services/demoService";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));

// Mounted before express.json() — Stripe webhook signature verification needs the raw body.
app.use("/api/billing/webhook", express.raw({ type: "application/json" }), billingWebhookRoutes);

app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/automations", automationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/demo", demoRoutes);

app.use(errorHandler);

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, () => {
  console.log(`DSR Solutions API listening on port ${PORT}`);
  bootstrapScheduledAutomations().catch((err) => console.error("Failed to bootstrap scheduled automations", err));
  startInvoiceOverdueWatcher();
  cron.schedule("*/30 * * * *", () => {
    cleanupExpiredDemos().catch((err) => console.error("Failed to clean up expired demo orgs", err));
  });
});
