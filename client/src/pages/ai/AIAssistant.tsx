import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { api } from "../../api/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistant() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: status } = useQuery({
    queryKey: ["ai-status"],
    queryFn: async () => (await api.get<{ configured: boolean }>("/ai/status")).data,
  });

  const send = useMutation({
    mutationFn: async (message: string) =>
      (await api.post<{ conversationId: string; reply: string }>("/ai/chat", { conversationId, message })).data,
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    send.mutate(input);
    setInput("");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-sm text-slate-500">Draft emails, summarize records, and get suggestions — powered by Claude.</p>
      </div>

      {status && !status.configured && (
        <div className="card mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          The AI Assistant isn't configured yet. Ask an admin to set <code>ANTHROPIC_API_KEY</code> on the server
          (Settings &gt; Integrations shows live status).
        </div>
      )}

      <div className="card mb-4 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-sm text-slate-400">
            Try: "Draft a follow-up email for a client who hasn't paid an overdue invoice."
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                m.role === "user"
                  ? "inline-block max-w-[80%] rounded-lg bg-brand-600 px-3 py-2 text-sm text-white"
                  : "inline-block max-w-[80%] whitespace-pre-wrap rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {send.isPending && <div className="text-sm text-slate-400">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          className="input"
          placeholder="Ask the AI Assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!status?.configured}
        />
        <button className="btn-primary" disabled={!status?.configured || send.isPending}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
