import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const NOT_CONFIGURED_MESSAGE =
  "AI is not configured. Set ANTHROPIC_API_KEY in the server environment to enable AI features.";

export async function generateText(prompt: string, system?: string): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) throw new Error(NOT_CONFIGURED_MESSAGE);
  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 1024,
    system: system || "You are a helpful business operations assistant embedded in DSR Solutions.",
    messages: [{ role: "user", content: prompt }],
  });
  const block = message.content[0];
  return block && block.type === "text" ? block.text : "";
}

/**
 * Asks the model for a JSON object and parses it leniently (tolerating
 * markdown fences or surrounding prose). Throws if no JSON object is found.
 */
export async function generateJSON<T>(prompt: string, system?: string): Promise<T> {
  const text = await generateText(
    `${prompt}\n\nRespond with a single JSON object only — no prose before or after it.`,
    system
  );
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The AI response did not contain valid JSON.");
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

export async function chat(
  history: { role: "user" | "assistant"; content: string }[],
  system?: string
): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) throw new Error(NOT_CONFIGURED_MESSAGE);
  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 1024,
    system:
      system ||
      "You are the DSR Solutions AI Assistant. Help the user run their business: drafting communications, summarizing data, and suggesting automations. Be concise and practical.",
    messages: history,
  });
  const block = message.content[0];
  return block && block.type === "text" ? block.text : "";
}
