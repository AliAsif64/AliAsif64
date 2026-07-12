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

export async function generateText(prompt: string, system?: string): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) {
    throw new Error(
      "AI is not configured. Set ANTHROPIC_API_KEY in the server environment to enable the AI Assistant and AI-powered automation actions."
    );
  }
  const message = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 1024,
    system: system || "You are a helpful business operations assistant embedded in DSR Solutions.",
    messages: [{ role: "user", content: prompt }],
  });
  const block = message.content[0];
  return block && block.type === "text" ? block.text : "";
}

export async function chat(
  history: { role: "user" | "assistant"; content: string }[],
  system?: string
): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) {
    throw new Error(
      "AI is not configured. Set ANTHROPIC_API_KEY in the server environment to enable the AI Assistant."
    );
  }
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
