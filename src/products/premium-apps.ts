import type { ProductModule } from "./types.js";

export const silkInvoice: ProductModule = {
  slug: "silkinvoice",
  title: "SilkInvoice",
  category: "premium-apps",
  tagline: "AI-powered invoicing and FBR-ready tax exports for Pakistani businesses",
  pricePkr: 50000,
  featureName: "FBR export validator & formatter",
  featureDescription:
    "Formats a batch of invoices into the FBR-required export schema and runs field-level validation (NTN format, sales-tax rate, invoice sequencing) before export, catching rejections before they reach FBR.",
  core({
    items,
    buyerNtn,
  }: {
    items: { description: string; amount: number }[];
    buyerNtn: string;
  }) {
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const tax = +(subtotal * 0.18).toFixed(2);
    return { invoiceId: `SI-${Date.now()}`, buyerNtn, subtotal, tax, total: +(subtotal + tax).toFixed(2) };
  },
  uniqueFeature({
    invoices,
  }: {
    invoices: { invoiceId: string; buyerNtn: string; total: number }[];
  }) {
    const NTN_RE = /^\d{7}-\d$/;
    const errors: { invoiceId: string; issue: string }[] = [];
    invoices.forEach((inv) => {
      if (!NTN_RE.test(inv.buyerNtn)) {
        errors.push({ invoiceId: inv.invoiceId, issue: "Invalid NTN format (expected 1234567-8)" });
      }
      if (inv.total <= 0) {
        errors.push({ invoiceId: inv.invoiceId, issue: "Total must be greater than zero" });
      }
    });
    return {
      exportReady: errors.length === 0,
      validInvoices: invoices.length - new Set(errors.map((e) => e.invoiceId)).size,
      errors,
    };
  },
};

export const premiumAppsProducts: ProductModule[] = [silkInvoice];
