import { Router } from "express";
import { z } from "zod";
import PDFDocument from "pdfkit";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { sendMail } from "../lib/mailer";

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative().default(0),
});

const invoiceSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal("")),
  contactId: z.string().optional(),
  dueDate: z.string(),
  tax: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

function computeTotals(items: { quantity: number; unitPrice: number }[], tax: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal + tax;
  return { subtotal, total };
}

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "desc" },
      include: { items: true, contact: true },
    });
    res.json(invoices);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { items: true, contact: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  })
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = invoiceSchema.parse(req.body);
    const { subtotal, total } = computeTotals(data.items, data.tax);
    const count = await prisma.invoice.count({ where: { organizationId: req.auth!.organizationId } });
    const number = `INV-${String(count + 1).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: req.auth!.organizationId,
        number,
        clientName: data.clientName,
        clientEmail: data.clientEmail || undefined,
        contactId: data.contactId || undefined,
        dueDate: new Date(data.dueDate),
        subtotal,
        tax: data.tax,
        total,
        notes: data.notes,
        items: { create: data.items.map((i) => ({ ...i, amount: i.quantity * i.unitPrice })) },
      },
      include: { items: true },
    });
    res.status(201).json(invoice);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const statusSchema = z.object({ status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"]).optional() });
    const data = statusSchema.parse(req.body);
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { ...data, paidAt: data.status === "PAID" ? new Date() : undefined },
      include: { items: true },
    });
    res.json(invoice);
  })
);

router.post(
  "/:id/send",
  asyncHandler(async (req: AuthedRequest, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { items: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!invoice.clientEmail) return res.status(400).json({ error: "Invoice has no client email on file" });

    const lines = invoice.items
      .map((i) => `${i.description} — ${i.quantity} x $${i.unitPrice.toFixed(2)} = $${i.amount.toFixed(2)}`)
      .join("<br/>");
    const result = await sendMail({
      organizationId: req.auth!.organizationId,
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.number} from your provider`,
      html: `<p>Invoice ${invoice.number}</p><p>${lines}</p><p><strong>Total: $${invoice.total.toFixed(2)}</strong></p><p>Due: ${invoice.dueDate.toDateString()}</p>`,
    });
    if (!result.sent) return res.status(400).json({ error: result.reason });

    const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "SENT" } });
    res.json(updated);
  })
);

router.get(
  "/:id/pdf",
  asyncHandler(async (req: AuthedRequest, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { items: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.number}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);
    doc.fontSize(20).text(`Invoice ${invoice.number}`, { align: "right" });
    doc.moveDown();
    doc.fontSize(12).text(`Bill to: ${invoice.clientName}`);
    if (invoice.clientEmail) doc.text(invoice.clientEmail);
    doc.text(`Issue date: ${invoice.issueDate.toDateString()}`);
    doc.text(`Due date: ${invoice.dueDate.toDateString()}`);
    doc.moveDown();

    invoice.items.forEach((item) => {
      doc.text(`${item.description}   ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${item.amount.toFixed(2)}`);
    });
    doc.moveDown();
    doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`);
    doc.text(`Tax: $${invoice.tax.toFixed(2)}`);
    doc.fontSize(14).text(`Total: $${invoice.total.toFixed(2)}`, { underline: true });
    if (invoice.notes) {
      doc.moveDown();
      doc.fontSize(10).text(`Notes: ${invoice.notes}`);
    }
    doc.end();
  })
);

router.post(
  "/:id/checkout",
  asyncHandler(async (req: AuthedRequest, res) => {
    const integration = await prisma.integration.findUnique({ where: { organizationId: req.auth!.organizationId } });
    const secretKey = integration?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return res.status(400).json({
        error: "Stripe is not configured for this organization. Add a Stripe secret key in Settings > Integrations to enable online payments.",
      });
    }
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Invoice ${invoice.number}` },
            unit_amount: Math.round(invoice.total * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_ORIGIN}/invoicing/${invoice.id}?paid=1`,
      cancel_url: `${process.env.CLIENT_ORIGIN}/invoicing/${invoice.id}`,
    });
    await prisma.invoice.update({ where: { id: invoice.id }, data: { stripeSessionId: session.id } });
    res.json({ url: session.url });
  })
);

export default router;
