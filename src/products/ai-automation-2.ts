import type { ProductModule } from "./types.js";

export const supportDeskAgent: ProductModule = {
  slug: "supportdesk-agent",
  title: "SupportDesk Agent",
  category: "ai-automation",
  tagline: "AI support agent that knows when to hand off to a human",
  pricePkr: 24999,
  featureName: "Handoff decision engine",
  featureDescription:
    "Decides, using a confidence threshold plus topic sensitivity (billing disputes, cancellations), whether to answer automatically or escalate to a human agent — the core trust mechanism of the product.",
  core({ ticket }: { ticket: string }) {
    return { ticket, draftAnswer: "Here is how you can resolve this..." };
  },
  uniqueFeature({
    confidence,
    topic,
  }: {
    confidence: number;
    topic: string;
  }) {
    const SENSITIVE_TOPICS = ["billing", "refund", "cancellation", "legal"];
    const isSensitive = SENSITIVE_TOPICS.includes(topic.toLowerCase());
    const handoff = confidence < 0.7 || isSensitive;
    return { handoff, reason: handoff ? (isSensitive ? "sensitive topic" : "low confidence") : "auto-resolved" };
  },
};

export const bookingBot: ProductModule = {
  slug: "bookingbot",
  title: "BookingBot",
  category: "ai-automation",
  tagline: "WhatsApp appointment booking that fills your calendar while you sleep",
  pricePkr: 24999,
  featureName: "No-show risk predictor",
  featureDescription:
    "Predicts no-show risk from a customer's booking history and sends an extra reminder to high-risk bookings, directly protecting calendar utilization.",
  core({ customerId, slot }: { customerId: string; slot: string }) {
    return { customerId, slot, status: "confirmed" };
  },
  uniqueFeature({
    pastBookings,
  }: {
    pastBookings: { attended: boolean }[];
  }) {
    const total = pastBookings.length || 1;
    const noShowRate = pastBookings.filter((b) => !b.attended).length / total;
    const risk = noShowRate > 0.3 ? "high" : noShowRate > 0.1 ? "medium" : "low";
    return { noShowRate: +noShowRate.toFixed(2), risk, extraReminder: risk !== "low" };
  },
};

export const cartRescue: ProductModule = {
  slug: "cartrescue",
  title: "CartRescue",
  category: "ai-automation",
  tagline: "Abandoned checkouts recovered with a personalized 3-touch sequence",
  pricePkr: 19999,
  featureName: "Personalized 3-touch sequencer",
  featureDescription:
    "Schedules a 3-touch follow-up (reminder, social proof, discount) with the discount amount scaled to cart value and elapsed time, rather than one generic blast email.",
  core({ cartId, items }: { cartId: string; items: { price: number }[] }) {
    return { cartId, total: items.reduce((s, i) => s + i.price, 0), abandonedAt: new Date().toISOString() };
  },
  uniqueFeature({ cartValue, hoursSinceAbandoned }: { cartValue: number; hoursSinceAbandoned: number }) {
    const touches = [
      { touch: 1, delayHours: 1, message: "You left something in your cart!", discountPct: 0 },
      { touch: 2, delayHours: 24, message: "Still thinking it over? Here's what others loved.", discountPct: 5 },
      {
        touch: 3,
        delayHours: 72,
        message: "Last chance — here's a discount.",
        discountPct: cartValue > 10_000 ? 15 : 10,
      },
    ];
    const nextTouch = touches.find((t) => hoursSinceAbandoned < t.delayHours) ?? touches.at(-1);
    return { sequence: touches, currentStage: nextTouch };
  },
};

export const onboardFlow: ProductModule = {
  slug: "onboardflow",
  title: "OnboardFlow",
  category: "ai-automation",
  tagline: "Client onboarding on rails: welcome, forms, reminders, zero chasing",
  pricePkr: 19999,
  featureName: "Stalled-client detector",
  featureDescription:
    "Flags clients stuck at the same onboarding step past its SLA and auto-sends a nudge, since silent stalls (not missing steps) are what actually kill onboarding completion rates.",
  core({ clientId, step }: { clientId: string; step: string }) {
    return { clientId, step, updatedAt: new Date().toISOString() };
  },
  uniqueFeature({
    clientId,
    step,
    enteredStepAt,
    slaHoursPerStep,
  }: {
    clientId: string;
    step: string;
    enteredStepAt: string;
    slaHoursPerStep: number;
  }) {
    const hoursElapsed = (Date.now() - new Date(enteredStepAt).getTime()) / 3_600_000;
    const stalled = hoursElapsed > slaHoursPerStep;
    return { clientId, step, hoursElapsed: +hoursElapsed.toFixed(1), stalled, nudgeSent: stalled };
  },
};

export const feedbackMiner: ProductModule = {
  slug: "feedbackminer",
  title: "FeedbackMiner",
  category: "ai-automation",
  tagline: "1,000 feedback items → the 5 things that actually matter",
  pricePkr: 15999,
  featureName: "Impact ranking (frequency × severity)",
  featureDescription:
    "Ranks clustered feedback themes by frequency multiplied by severity rather than frequency alone, so a rare but severe complaint doesn't get buried under common minor gripes.",
  core({ feedbackItems }: { feedbackItems: string[] }) {
    return { totalItems: feedbackItems.length, themesDetected: Math.min(5, feedbackItems.length) };
  },
  uniqueFeature({
    themes,
  }: {
    themes: { name: string; frequency: number; severity: number }[];
  }) {
    const ranked = themes
      .map((t) => ({ ...t, impactScore: t.frequency * t.severity }))
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5);
    return { top5: ranked };
  },
};

export const formFiller: ProductModule = {
  slug: "formfiller",
  title: "FormFiller",
  category: "ai-automation",
  tagline: "Messy exports → clean import files, mapped by AI",
  pricePkr: 15999,
  featureName: "Field-mapping confidence flags",
  featureDescription:
    "Assigns a confidence score to each AI-guessed column mapping and flags ambiguous ones for manual confirmation, preventing silently wrong imports.",
  core({ sourceColumns, targetSchema }: { sourceColumns: string[]; targetSchema: string[] }) {
    const mapping = sourceColumns.map((c) => ({
      source: c,
      target: targetSchema.find((t) => t.toLowerCase() === c.toLowerCase()) ?? null,
    }));
    return { mapping };
  },
  uniqueFeature({
    mappings,
  }: {
    mappings: { source: string; target: string; similarity: number }[];
  }) {
    const flagged = mappings.filter((m) => m.similarity < 0.7);
    return { autoAccepted: mappings.length - flagged.length, needsConfirmation: flagged };
  },
};

export const churnWatch: ProductModule = {
  slug: "churnwatch",
  title: "ChurnWatch",
  category: "ai-automation",
  tagline: "At-risk customers spotted early, win-back drafts ready",
  pricePkr: 34999,
  featureName: "Reason-tailored win-back draft generator",
  featureDescription:
    "Generates a win-back email tailored to the detected churn driver (usage drop, support complaints, price sensitivity) rather than one generic 'we miss you' template.",
  core({ usageTrend, supportTickets }: { usageTrend: number[]; supportTickets: number }) {
    const declining = usageTrend.length >= 2 && usageTrend.at(-1)! < usageTrend[0];
    const churnRisk = declining || supportTickets > 3 ? "high" : "low";
    return { churnRisk };
  },
  uniqueFeature({
    churnReason,
    customerName,
  }: {
    churnReason: "usage-drop" | "support-complaints" | "price-sensitivity";
    customerName: string;
  }) {
    const DRAFTS: Record<string, string> = {
      "usage-drop": `Hi ${customerName}, we noticed you haven't been around — here's a quick guide to get more value.`,
      "support-complaints": `Hi ${customerName}, we know we let you down recently. Here's how we've fixed it.`,
      "price-sensitivity": `Hi ${customerName}, here's a limited-time discount to keep you with us.`,
    };
    return { draft: DRAFTS[churnReason] };
  },
};

export const complianceCheck: ProductModule = {
  slug: "compliancecheck",
  title: "ComplianceCheck",
  category: "ai-automation",
  tagline: "Contracts screened against your checklist — before you sign",
  pricePkr: 34999,
  featureName: "Risk-clause highlighter with severity",
  featureDescription:
    "Highlights specific risky clauses (auto-renewal, unlimited liability, unilateral termination) with a severity rating and plain-English explanation, not just a pass/fail checklist match.",
  core({ contractText, checklist }: { contractText: string; checklist: string[] }) {
    const matched = checklist.filter((c) => contractText.toLowerCase().includes(c.toLowerCase()));
    return { checklistMatched: matched, missing: checklist.filter((c) => !matched.includes(c)) };
  },
  uniqueFeature({ contractText }: { contractText: string }) {
    const RISK_CLAUSES: { pattern: RegExp; label: string; severity: "high" | "medium" | "low" }[] = [
      { pattern: /auto.?renew/i, label: "Auto-renewal clause", severity: "medium" },
      { pattern: /unlimited liability/i, label: "Unlimited liability", severity: "high" },
      { pattern: /sole discretion/i, label: "Unilateral termination", severity: "high" },
      { pattern: /non.?compete/i, label: "Non-compete clause", severity: "medium" },
    ];
    const found = RISK_CLAUSES.filter((r) => r.pattern.test(contractText));
    return { risksFound: found.map(({ label, severity }) => ({ label, severity })) };
  },
};

export const proposalDrafter: ProductModule = {
  slug: "proposaldrafter",
  title: "ProposalDrafter",
  category: "ai-automation",
  tagline: "Discovery-call notes → structured, persuasive proposal in minutes",
  pricePkr: 22999,
  featureName: "Scope-based pricing tier suggester",
  featureDescription:
    "Suggests a pricing tier by matching scope keywords from discovery notes against a rate card, so proposals aren't priced by guesswork.",
  core({ notes }: { notes: string }) {
    return { outline: ["Overview", "Scope", "Timeline", "Pricing", "Terms"], notesLength: notes.length };
  },
  uniqueFeature({ notes }: { notes: string }) {
    const text = notes.toLowerCase();
    let tier = "starter";
    if (/enterprise|multi.?location|integration/.test(text)) tier = "enterprise";
    else if (/team|multiple users|ongoing/.test(text)) tier = "growth";
    const PRICING: Record<string, number> = { starter: 50_000, growth: 150_000, enterprise: 400_000 };
    return { suggestedTier: tier, suggestedPricePkr: PRICING[tier] };
  },
};

export const recruitScreen: ProductModule = {
  slug: "recruitscreen",
  title: "RecruitScreen",
  category: "ai-automation",
  tagline: "Score every CV against your job spec — ranked shortlist + interview probes",
  pricePkr: 24999,
  featureName: "Gap-based interview probe generator",
  featureDescription:
    "Generates targeted interview questions for exactly the gaps found between a candidate's CV and the job spec, instead of a generic question bank.",
  core({ cvSkills, requiredSkills }: { cvSkills: string[]; requiredSkills: string[] }) {
    const matched = requiredSkills.filter((s) => cvSkills.includes(s));
    return { matchScore: +(matched.length / requiredSkills.length).toFixed(2), matched };
  },
  uniqueFeature({ cvSkills, requiredSkills }: { cvSkills: string[]; requiredSkills: string[] }) {
    const gaps = requiredSkills.filter((s) => !cvSkills.includes(s));
    const probes = gaps.map((g) => `Tell me about a time you worked with ${g}, or how you'd approach learning it quickly.`);
    return { gaps, interviewProbes: probes };
  },
};

export const researchRunner: ProductModule = {
  slug: "researchrunner",
  title: "ResearchRunner",
  category: "ai-automation",
  tagline: "Weekly competitor + market intel digest — sourced, with a so-what",
  pricePkr: 15999,
  featureName: "'So-what' business-implication synthesizer",
  featureDescription:
    "Attaches a concrete business implication to every raw finding in the digest, turning a news summary into something a founder can act on directly.",
  core({ competitors }: { competitors: string[] }) {
    return { competitors, findingsCount: competitors.length * 2 };
  },
  uniqueFeature({ finding }: { finding: string }) {
    const soWhat = /pric(e|ing)/i.test(finding)
      ? "Consider reviewing your own pricing tiers this week."
      : /launch|feature/i.test(finding)
      ? "Evaluate whether this closes a gap versus your roadmap."
      : "Monitor for follow-on moves before reacting.";
    return { finding, soWhat };
  },
};

export const seoScout: ProductModule = {
  slug: "seoscout",
  title: "SEOScout",
  category: "ai-automation",
  tagline: "Any keyword → full SEO brief with intent, outline, FAQs, entities",
  pricePkr: 19999,
  featureName: "Search-intent classifier",
  featureDescription:
    "Classifies the keyword's search intent (informational, transactional, navigational) first, so the generated outline structure actually matches what searchers want instead of a one-size-fits-all brief.",
  core({ keyword }: { keyword: string }) {
    return { keyword, outline: ["Intro", "Key sections", "FAQs"], entities: [] };
  },
  uniqueFeature({ keyword }: { keyword: string }) {
    const k = keyword.toLowerCase();
    let intent: "informational" | "transactional" | "navigational" = "informational";
    if (/buy|price|best|vs|review/.test(k)) intent = "transactional";
    else if (/login|website|official/.test(k)) intent = "navigational";
    const OUTLINES: Record<string, string[]> = {
      informational: ["What is it", "How it works", "Examples", "FAQs"],
      transactional: ["Top picks", "Comparison table", "Pricing", "How to buy"],
      navigational: ["Official link", "Login help", "Contact"],
    };
    return { intent, recommendedOutline: OUTLINES[intent] };
  },
};

export const socialListener: ProductModule = {
  slug: "socialistener",
  title: "SocialListener",
  category: "ai-automation",
  tagline: "Daily brand + competitor news digest with sentiment and response flags",
  pricePkr: 18999,
  featureName: "Public-response-needed flag engine",
  featureDescription:
    "Flags which mentions actually need a public response (negative sentiment + high visibility) versus which can be silently logged, protecting response bandwidth.",
  core({ mentions }: { mentions: { text: string; sentiment: "positive" | "neutral" | "negative" }[] }) {
    const bySentiment = { positive: 0, neutral: 0, negative: 0 };
    mentions.forEach((m) => bySentiment[m.sentiment]++);
    return { total: mentions.length, bySentiment };
  },
  uniqueFeature({
    mentions,
  }: {
    mentions: { text: string; sentiment: "positive" | "neutral" | "negative"; reach: number }[];
  }) {
    const flagged = mentions.filter((m) => m.sentiment === "negative" && m.reach > 1000);
    return { needsResponse: flagged.map((m) => ({ text: m.text, reach: m.reach })) };
  },
};

export const stockAlert: ProductModule = {
  slug: "stockalert",
  title: "StockAlert",
  category: "ai-automation",
  tagline: "Daily inventory reorder digest — today vs this-week action list",
  pricePkr: 13999,
  featureName: "Today-vs-this-week prioritizer",
  featureDescription:
    "Splits the reorder list into an urgent 'order today' bucket (stock-out imminent) and a 'this week' bucket, instead of one flat undifferentiated reorder list.",
  core({ inventory }: { inventory: { sku: string; qty: number; reorderPoint: number }[] }) {
    return { belowReorderPoint: inventory.filter((i) => i.qty <= i.reorderPoint) };
  },
  uniqueFeature({
    inventory,
  }: {
    inventory: { sku: string; qty: number; dailyUsage: number }[];
  }) {
    const daysLeft = (i: (typeof inventory)[number]) => (i.dailyUsage ? i.qty / i.dailyUsage : Infinity);
    const today = inventory.filter((i) => daysLeft(i) <= 2);
    const thisWeek = inventory.filter((i) => daysLeft(i) > 2 && daysLeft(i) <= 7);
    return { orderToday: today.map((i) => i.sku), orderThisWeek: thisWeek.map((i) => i.sku) };
  },
};

export const translateFlow: ProductModule = {
  slug: "translateflow",
  title: "TranslateFlow",
  category: "ai-automation",
  tagline: "Detect language, translate, draft replies in customer's language + English",
  pricePkr: 14999,
  featureName: "Dual-language reply output",
  featureDescription:
    "Returns the drafted reply in both the customer's detected language and English side by side, so a support agent who doesn't speak the customer's language can still verify before sending.",
  core({ message }: { message: string }) {
    const URDU_RE = /[؀-ۿ]/;
    return { detectedLanguage: URDU_RE.test(message) ? "urdu" : "english" };
  },
  uniqueFeature({ message, detectedLanguage }: { message: string; detectedLanguage: string }) {
    return {
      replyInCustomerLanguage: `[${detectedLanguage}] Thank you, we'll respond shortly.`,
      replyInEnglish: "Thank you, we'll respond shortly.",
    };
  },
};

export const ai_automation_batch_2: ProductModule[] = [
  supportDeskAgent,
  bookingBot,
  cartRescue,
  onboardFlow,
  feedbackMiner,
  formFiller,
  churnWatch,
  complianceCheck,
  proposalDrafter,
  recruitScreen,
  researchRunner,
  seoScout,
  socialListener,
  stockAlert,
  translateFlow,
];
