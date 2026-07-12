import type { ProductModule } from "./types.js";

export const examGenius: ProductModule = {
  slug: "examgenius",
  title: "ExamGenius",
  category: "ai-automation",
  tagline: "AI tutor & mock-exam platform for MDCAT, ECAT, CSS, and NTS",
  pricePkr: 45000,
  featureName: "Weak-area detector",
  featureDescription:
    "Analyzes a student's answer history per topic and surfaces the specific weak areas to drill next, instead of just returning a raw score after each mock exam.",
  core({ exam, subject }: { exam: string; subject: string }) {
    return { exam, subject, questionCount: 20, generatedAt: new Date().toISOString() };
  },
  uniqueFeature({
    answers,
  }: {
    answers: { topic: string; correct: boolean }[];
  }) {
    const byTopic = new Map<string, { correct: number; total: number }>();
    for (const a of answers) {
      const s = byTopic.get(a.topic) ?? { correct: 0, total: 0 };
      s.total += 1;
      if (a.correct) s.correct += 1;
      byTopic.set(a.topic, s);
    }
    const weakAreas = [...byTopic.entries()]
      .map(([topic, s]) => ({ topic, accuracy: +(s.correct / s.total).toFixed(2) }))
      .filter((t) => t.accuracy < 0.6)
      .sort((a, b) => a.accuracy - b.accuracy);
    return { weakAreas };
  },
};

export const sehatLink: ProductModule = {
  slug: "sehatlink",
  title: "SehatLink",
  category: "ai-automation",
  tagline: "End-to-end telehealth platform for Pakistani clinics and doctors",
  pricePkr: 60000,
  featureName: "Symptom triage urgency scorer",
  featureDescription:
    "Scores intake symptom text into an urgency tier so the appointment queue prioritizes potentially serious cases instead of pure first-come-first-served booking.",
  core({ patientId, doctorId, slot }: { patientId: string; doctorId: string; slot: string }) {
    return { patientId, doctorId, slot, status: "booked" };
  },
  uniqueFeature({ symptoms }: { symptoms: string[] }) {
    const RED_FLAGS = ["chest pain", "shortness of breath", "severe bleeding", "loss of consciousness"];
    const hasRedFlag = symptoms.some((s) =>
      RED_FLAGS.some((flag) => s.toLowerCase().includes(flag))
    );
    const urgency = hasRedFlag ? "emergency" : symptoms.length > 2 ? "urgent" : "routine";
    return { urgency, queuePriority: urgency === "emergency" ? 1 : urgency === "urgent" ? 2 : 3 };
  },
};

export const whatsBizAi: ProductModule = {
  slug: "whatsbiz-ai",
  title: "WhatsBiz AI",
  category: "ai-automation",
  tagline: "WhatsApp AI assistant that qualifies leads, books meetings, and sells 24/7",
  pricePkr: 55000,
  featureName: "Lead scoring engine",
  featureDescription:
    "Scores each inbound conversation on budget/authority/need/timeline signals so sales reps see hot leads first instead of a flat unordered chat list.",
  core({ from, message }: { from: string; message: string }) {
    return { from, message, intent: /price|cost|buy/i.test(message) ? "purchase-intent" : "inquiry" };
  },
  uniqueFeature({
    transcript,
  }: {
    transcript: string[];
  }) {
    const text = transcript.join(" ").toLowerCase();
    let score = 0;
    if (/budget|price|cost/.test(text)) score += 30;
    if (/urgent|asap|this week/.test(text)) score += 30;
    if (/decision|owner|ceo|manager/.test(text)) score += 20;
    if (/need|looking for|require/.test(text)) score += 20;
    return { leadScore: score, tier: score >= 60 ? "hot" : score >= 30 ? "warm" : "cold" };
  },
};

export const agriSilk: ProductModule = {
  slug: "agrisilk",
  title: "AgriSilk",
  category: "ai-automation",
  tagline: "AI advisory + marketplace for Pakistani farmers",
  pricePkr: 65000,
  featureName: "Best-buyer price matcher",
  featureDescription:
    "Matches a farmer's harvest listing against active buyer bids by crop, quantity, and distance to surface the best net price, rather than listing produce with no price guidance.",
  core({ soilPh, crop }: { soilPh: number; crop: string }) {
    const advice =
      soilPh < 6 ? "Add lime to raise soil pH before planting." :
      soilPh > 7.5 ? "Add sulfur to lower soil pH." :
      "Soil pH is optimal for most crops.";
    return { crop, soilPh, advice };
  },
  uniqueFeature({
    crop,
    quantityKg,
    farmerLocation,
    buyers,
  }: {
    crop: string;
    quantityKg: number;
    farmerLocation: string;
    buyers: { name: string; crop: string; pricePerKg: number; location: string; maxQtyKg: number }[];
  }) {
    const matches = buyers
      .filter((b) => b.crop === crop && b.maxQtyKg >= quantityKg)
      .map((b) => ({
        ...b,
        netValue: +(b.pricePerKg * quantityKg).toFixed(2),
        sameRegion: b.location === farmerLocation,
      }))
      .sort((a, b) => b.netValue - a.netValue);
    return { bestMatch: matches[0] ?? null, allMatches: matches };
  },
};

export const emailReplyBot: ProductModule = {
  slug: "email-reply-bot",
  title: "Email Reply Bot",
  category: "ai-automation",
  tagline: "GPT-powered assistant that drafts replies in your voice",
  pricePkr: 4000,
  featureName: "Tone-matching profile",
  featureDescription:
    "Builds a lightweight tone profile (formality, sentence length, sign-off style) from a user's past sent emails so drafted replies actually sound like them, not a generic assistant.",
  core({ subject, body }: { subject: string; body: string }) {
    return { subject, draftReply: `Thanks for reaching out about "${subject}". ${body.slice(0, 40)}...` };
  },
  uniqueFeature({ pastEmails }: { pastEmails: string[] }) {
    const avgLength = pastEmails.reduce((s, e) => s + e.split(/\s+/).length, 0) / (pastEmails.length || 1);
    const formalCount = pastEmails.filter((e) => /regards|sincerely|dear/i.test(e)).length;
    const formality = formalCount / (pastEmails.length || 1) > 0.5 ? "formal" : "casual";
    return { toneProfile: { formality, avgSentenceLength: Math.round(avgLength) } };
  },
};

export const socialPostScheduler: ProductModule = {
  slug: "social-post-scheduler",
  title: "Social Post Scheduler",
  category: "ai-automation",
  tagline: "AI captions + scheduling for IG, FB, LinkedIn, and X",
  pricePkr: 5500,
  featureName: "Best-time-to-post recommender",
  featureDescription:
    "Recommends the optimal posting time per platform from a user's own historical engagement data, rather than scheduling posts at fixed generic slots.",
  core({ platform, content }: { platform: string; content: string }) {
    return { platform, caption: content.slice(0, 100), scheduledFor: null };
  },
  uniqueFeature({
    platform,
    engagementHistory,
  }: {
    platform: string;
    engagementHistory: { hour: number; engagementRate: number }[];
  }) {
    const best = [...engagementHistory].sort((a, b) => b.engagementRate - a.engagementRate)[0];
    return { platform, recommendedHour: best?.hour ?? 9, expectedEngagementRate: best?.engagementRate ?? 0 };
  },
};

export const leadEnricher: ProductModule = {
  slug: "lead-enricher",
  title: "Lead Enricher",
  category: "ai-automation",
  tagline: "Enrich raw lead lists with company + email data",
  pricePkr: 4500,
  featureName: "Per-field confidence scoring",
  featureDescription:
    "Attaches a confidence score to each enriched field (email, company, title) instead of returning one blended row, so sales teams know which fields to trust versus manually verify.",
  core({ name, domain }: { name: string; domain: string }) {
    return { name, domain, email: `${name.toLowerCase().replace(/\s+/g, ".")}@${domain}`, company: domain.split(".")[0] };
  },
  uniqueFeature({
    email,
    company,
    title,
  }: {
    email: string;
    company: string;
    title: string;
  }) {
    return {
      confidence: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 0.9 : 0.3,
        company: company ? 0.8 : 0.1,
        title: title ? 0.7 : 0.1,
      },
    };
  },
};

export const meetingTranscriber: ProductModule = {
  slug: "meeting-transcriber",
  title: "Meeting Transcriber",
  category: "ai-automation",
  tagline: "Zoom/Meet transcription + AI action items in Urdu/English",
  pricePkr: 6500,
  featureName: "Urdu/English code-switch tagger",
  featureDescription:
    "Tags each transcript segment with its detected language (Urdu, English, or code-switched) since Pakistani business meetings routinely mix both within a single sentence.",
  core({ audioUrl }: { audioUrl: string }) {
    return { audioUrl, transcript: "[transcription pending]", actionItems: [] };
  },
  uniqueFeature({ segments }: { segments: string[] }) {
    const URDU_RE = /[؀-ۿ]/;
    const tagged = segments.map((s) => {
      const hasUrdu = URDU_RE.test(s);
      const hasEnglish = /[a-zA-Z]/.test(s);
      const language = hasUrdu && hasEnglish ? "code-switched" : hasUrdu ? "urdu" : "english";
      return { segment: s, language };
    });
    return { tagged };
  },
};

export const contentForgeAi: ProductModule = {
  slug: "contentforge-ai",
  title: "ContentForge AI",
  category: "ai-automation",
  tagline: "One article in → five platform-native assets out",
  pricePkr: 12999,
  featureName: "Platform tone adapter",
  featureDescription:
    "Rewrites the same core message with a distinct tone per platform (formal for LinkedIn, punchy for X, narrative for a newsletter) instead of copy-pasting one tone everywhere.",
  core({ article }: { article: string }) {
    const summary = article.slice(0, 200);
    return {
      linkedin: summary,
      twitter: summary.slice(0, 280),
      newsletter: article,
      instagramCaption: summary.slice(0, 150),
      facebook: summary,
    };
  },
  uniqueFeature({ platform, message }: { platform: string; message: string }) {
    const TONE: Record<string, (m: string) => string> = {
      linkedin: (m) => `${m}\n\n#leadership #growth`,
      twitter: (m) => `${m.slice(0, 250)} 🧵`,
      newsletter: (m) => `Hi there,\n\n${m}\n\nBest,\nThe Team`,
    };
    return { platform, adapted: (TONE[platform] ?? ((m: string) => m))(message) };
  },
};

export const dataSentryKpi: ProductModule = {
  slug: "datasentry-kpi",
  title: "DataSentry — KPI Brief",
  category: "ai-automation",
  tagline: "A founder-grade KPI brief in your inbox every morning at 7",
  pricePkr: 12999,
  featureName: "Anomaly flagging",
  featureDescription:
    "Flags any KPI whose value deviates significantly from its trailing 7-day average, so the morning brief highlights what actually changed instead of a flat metrics dump.",
  core({ metrics }: { metrics: Record<string, number> }) {
    return { generatedAt: new Date().toISOString(), metrics };
  },
  uniqueFeature({
    metric,
    todayValue,
    trailingValues,
  }: {
    metric: string;
    todayValue: number;
    trailingValues: number[];
  }) {
    const avg = trailingValues.reduce((s, v) => s + v, 0) / (trailingValues.length || 1);
    const deviationPct = avg ? +(((todayValue - avg) / avg) * 100).toFixed(1) : 0;
    return { metric, todayValue, trailingAverage: +avg.toFixed(2), deviationPct, isAnomaly: Math.abs(deviationPct) > 25 };
  },
};

export const inboxTriage: ProductModule = {
  slug: "inboxtriage",
  title: "InboxTriage",
  category: "ai-automation",
  tagline: "Your inbox, pre-sorted — with replies already drafted",
  pricePkr: 15999,
  featureName: "Priority-drafted replies",
  featureDescription:
    "Auto-drafts replies only for the top-priority emails first, so the highest-value responses are ready before the assistant spends budget drafting low-priority ones.",
  core({ emails }: { emails: { subject: string; from: string }[] }) {
    return { sorted: emails.map((e, i) => ({ ...e, rank: i + 1 })) };
  },
  uniqueFeature({
    emails,
  }: {
    emails: { subject: string; from: string; isVip: boolean; hasDeadline: boolean }[];
  }) {
    const prioritized = [...emails].sort((a, b) => {
      const scoreOf = (e: typeof a) => (e.isVip ? 2 : 0) + (e.hasDeadline ? 1 : 0);
      return scoreOf(b) - scoreOf(a);
    });
    const topDrafted = prioritized.slice(0, 3).map((e) => ({
      ...e,
      draftReply: `Hi, thanks for your email about "${e.subject}". I'll follow up shortly.`,
    }));
    return { draftedForTopN: topDrafted };
  },
};

export const invoiceReaderAi: ProductModule = {
  slug: "invoicereader-ai",
  title: "InvoiceReader AI",
  category: "ai-automation",
  tagline: "Invoices in, clean CSV out — humans only check exceptions",
  pricePkr: 19999,
  featureName: "Low-confidence exception flagging",
  featureDescription:
    "Flags individual extracted fields below a confidence threshold for human review instead of silently guessing, so errors don't quietly propagate into the accounting CSV.",
  core({ invoiceText }: { invoiceText: string }) {
    const amountMatch = invoiceText.match(/(\d+[.,]?\d*)/);
    return { extractedAmount: amountMatch ? Number(amountMatch[0].replace(",", "")) : null };
  },
  uniqueFeature({
    fields,
  }: {
    fields: { name: string; value: string; confidence: number }[];
  }) {
    const exceptions = fields.filter((f) => f.confidence < 0.75);
    return { needsReview: exceptions.length > 0, exceptions };
  },
};

export const leadPilot: ProductModule = {
  slug: "leadpilot",
  title: "LeadPilot",
  category: "ai-automation",
  tagline: "Every lead answered in 30 seconds, scored, and logged",
  pricePkr: 24999,
  featureName: "30-second SLA tracker",
  featureDescription:
    "Measures actual response latency against the promised 30-second SLA and auto-escalates breaches to a human, turning the marketing promise into an enforced backend guarantee.",
  core({ leadId, message }: { leadId: string; message: string }) {
    return { leadId, respondedAt: new Date().toISOString(), autoReply: "Thanks! A specialist will follow up." };
  },
  uniqueFeature({
    leadId,
    receivedAt,
    respondedAt,
  }: {
    leadId: string;
    receivedAt: string;
    respondedAt: string;
  }) {
    const latencyMs = new Date(respondedAt).getTime() - new Date(receivedAt).getTime();
    const breached = latencyMs > 30_000;
    return { leadId, latencyMs, slaBreached: breached, escalate: breached };
  },
};

export const meetingScribe: ProductModule = {
  slug: "meetingscribe",
  title: "MeetingScribe",
  category: "ai-automation",
  tagline: "Transcripts → decisions, owners, and deadlines. Automatically.",
  pricePkr: 12999,
  featureName: "Owner + deadline extractor",
  featureDescription:
    "Parses action-item sentences into structured {owner, task, deadline} records instead of a flat bullet list, so items can be pushed straight into a task tracker.",
  core({ transcript }: { transcript: string }) {
    return { summary: transcript.slice(0, 200) };
  },
  uniqueFeature({ sentences }: { sentences: string[] }) {
    const items = sentences
      .map((s) => {
        const ownerMatch = s.match(/(\w+) will/i);
        const deadlineMatch = s.match(/by (\w+ ?\d*)/i);
        if (!ownerMatch) return null;
        return { task: s, owner: ownerMatch[1], deadline: deadlineMatch?.[1] ?? null };
      })
      .filter(Boolean);
    return { actionItems: items };
  },
};

export const reviewGuard: ProductModule = {
  slug: "reviewguard",
  title: "ReviewGuard",
  category: "ai-automation",
  tagline: "Every review answered in your voice — before it costs you customers",
  pricePkr: 12999,
  featureName: "Negative-sentiment escalation",
  featureDescription:
    "Escalates strongly negative reviews to a human immediately instead of auto-posting a templated reply, since a tone-deaf automated response to an angry review does more damage than none.",
  core({ reviewText, rating }: { reviewText: string; rating: number }) {
    return { draftReply: rating >= 4 ? "Thank you so much for the kind words!" : "Thanks for your feedback, we'll look into this." };
  },
  uniqueFeature({ reviewText, rating }: { reviewText: string; rating: number }) {
    const NEGATIVE_SIGNALS = ["scam", "terrible", "worst", "refund", "never again"];
    const hasStrongNegative = NEGATIVE_SIGNALS.some((w) => reviewText.toLowerCase().includes(w));
    const escalate = rating <= 2 || hasStrongNegative;
    return { escalate, reason: escalate ? "Low rating or strong negative language detected" : null };
  },
};

export const ai_automation_batch_1: ProductModule[] = [
  examGenius,
  sehatLink,
  whatsBizAi,
  agriSilk,
  emailReplyBot,
  socialPostScheduler,
  leadEnricher,
  meetingTranscriber,
  contentForgeAi,
  dataSentryKpi,
  inboxTriage,
  invoiceReaderAi,
  leadPilot,
  meetingScribe,
  reviewGuard,
];
