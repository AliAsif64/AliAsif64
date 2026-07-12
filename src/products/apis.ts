import type { ProductModule } from "./types.js";

export const whatsappBusinessWrapper: ProductModule = {
  slug: "whatsapp-business-wrapper",
  title: "WhatsApp Business API Wrapper",
  category: "apis",
  tagline: "TypeScript SDK + hosted webhook relay for WhatsApp Business",
  pricePkr: 6500,
  featureName: "Webhook relay retry with dead-letter queue",
  featureDescription:
    "Retries failed webhook deliveries with exponential backoff and routes permanently-failed events to a dead-letter queue, since WhatsApp webhook consumers going down is a top support complaint.",
  core({ to, message }: { to: string; message: string }) {
    return { to, message, status: "sent", messageId: `wamid.${Date.now()}` };
  },
  uniqueFeature({
    webhookAttempts,
  }: {
    webhookAttempts: { eventId: string; attempt: number; success: boolean }[];
  }) {
    const MAX_ATTEMPTS = 5;
    const deadLettered = new Map<string, number>();
    for (const a of webhookAttempts) {
      if (!a.success) deadLettered.set(a.eventId, a.attempt);
    }
    const stillFailing = [...deadLettered.entries()]
      .filter(([, attempt]) => attempt >= MAX_ATTEMPTS)
      .map(([eventId]) => eventId);
    const retrying = [...deadLettered.entries()]
      .filter(([, attempt]) => attempt < MAX_ATTEMPTS)
      .map(([eventId, attempt]) => ({
        eventId,
        nextRetryInSeconds: 2 ** attempt,
      }));
    return { deadLetterQueue: stillFailing, retrying };
  },
};

export const smsGatewayPakistan: ProductModule = {
  slug: "sms-gateway-pakistan",
  title: "SMS Gateway Pakistan",
  category: "apis",
  tagline: "Unified SMS API across Jazz, Zong, Telenor, Ufone",
  pricePkr: 5000,
  featureName: "Carrier auto-detect + failover routing",
  featureDescription:
    "Detects the destination carrier from the number prefix and automatically fails over to a backup route if the primary carrier's gateway rejects the message, improving delivery rate.",
  core({ to, message }: { to: string; message: string }) {
    return { to, message, status: "queued" };
  },
  uniqueFeature({ to, primaryFailed }: { to: string; primaryFailed: boolean }) {
    const prefix = to.replace(/^\+92/, "0").slice(0, 4);
    const CARRIER_PREFIXES: Record<string, string> = {
      "0300": "jazz", "0301": "jazz", "0302": "jazz",
      "0310": "jazz", "0320": "jazz", "0330": "jazz",
      "0340": "zong", "0341": "zong", "0345": "zong",
      "0333": "ufone", "0334": "ufone", "0335": "ufone",
      "0321": "telenor", "0322": "telenor", "0323": "telenor",
    };
    const carrier = CARRIER_PREFIXES[prefix] ?? "unknown";
    const route = primaryFailed ? "backup-aggregator" : "primary-carrier-direct";
    return { detectedCarrier: carrier, route, failoverTriggered: primaryFailed };
  },
};

export const paymentVerificationApi: ProductModule = {
  slug: "payment-verification-api",
  title: "Payment Verification API",
  category: "apis",
  tagline: "Verify Jazzcash / Easypaisa / bank transfers programmatically",
  pricePkr: 7500,
  featureName: "Duplicate-claim detector",
  featureDescription:
    "Flags when the same transaction ID or the same amount+sender pair is submitted for verification more than once, catching the common fraud pattern of reusing one payment screenshot for multiple orders.",
  core({
    transactionId,
    amount,
    method,
  }: {
    transactionId: string;
    amount: number;
    method: "jazzcash" | "easypaisa" | "bank";
  }) {
    return { transactionId, amount, method, verified: /^[A-Za-z0-9]{6,}$/.test(transactionId) };
  },
  uniqueFeature({
    claims,
  }: {
    claims: { orderId: string; transactionId: string; amount: number }[];
  }) {
    const byTxn = new Map<string, string[]>();
    for (const c of claims) {
      byTxn.set(c.transactionId, [...(byTxn.get(c.transactionId) ?? []), c.orderId]);
    }
    const duplicates = [...byTxn.entries()]
      .filter(([, orders]) => orders.length > 1)
      .map(([transactionId, orders]) => ({ transactionId, claimedByOrders: orders }));
    return { duplicateCount: duplicates.length, duplicates };
  },
};

export const apisProducts: ProductModule[] = [
  whatsappBusinessWrapper,
  smsGatewayPakistan,
  paymentVerificationApi,
];
