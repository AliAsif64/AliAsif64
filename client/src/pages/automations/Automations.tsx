import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { api } from "../../api/client";
import Modal from "../../components/Modal";
import Badge from "../../components/Badge";

interface AutomationDraft {
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  actions: { type: string; config: Record<string, unknown> }[];
}

function AICreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [prompt, setPrompt] = useState("");

  const generate = useMutation({
    mutationFn: async () => (await api.post<AutomationDraft>("/ai/generate-automation", { prompt })).data,
  });

  const create = useMutation({
    mutationFn: async (draft: AutomationDraft) => (await api.post("/automations", draft)).data,
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  return (
    <Modal title="Create automation with AI" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          generate.mutate();
        }}
      >
        <div>
          <label className="label">Describe what you want to automate</label>
          <textarea
            className="input"
            rows={3}
            placeholder='e.g. "When a deal is won, send a thank-you email to the contact and post the win in Slack"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            minLength={5}
          />
        </div>
        <button className="btn-primary w-full justify-center" disabled={generate.isPending}>
          <Sparkles size={16} /> {generate.isPending ? "Generating…" : generate.data ? "Regenerate" : "Generate automation"}
        </button>
      </form>

      {generate.isError && (
        <p className="mt-3 text-sm text-red-600">
          {(generate.error as any)?.response?.data?.error || "Generation failed. Try rephrasing."}
        </p>
      )}

      {generate.data && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-sm font-semibold text-slate-800">{generate.data.name}</div>
            {generate.data.description && <p className="mb-2 text-xs text-slate-500">{generate.data.description}</p>}
            <div className="text-xs text-slate-600">
              <span className="font-medium">When:</span> {generate.data.triggerType.replace(/_/g, " ").toLowerCase()}
              {Object.keys(generate.data.triggerConfig).length > 0 && (
                <span className="text-slate-400"> ({JSON.stringify(generate.data.triggerConfig)})</span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-600">
              <span className="font-medium">Then:</span>
              <ol className="ml-4 list-decimal">
                {generate.data.actions.map((a, i) => (
                  <li key={i}>
                    {a.type.replace(/_/g, " ")}{" "}
                    <span className="text-slate-400">{JSON.stringify(a.config)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <button
            className="btn-primary w-full justify-center"
            onClick={() => create.mutate(generate.data)}
            disabled={create.isPending}
          >
            {create.isPending ? "Creating…" : "Create this automation"}
          </button>
          {create.isError && (
            <p className="text-sm text-red-600">{(create.error as any)?.response?.data?.error || "Creation failed."}</p>
          )}
        </div>
      )}
    </Modal>
  );
}

interface Automation {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  active: boolean;
  runs: { id: string; status: string; createdAt: string }[];
}

interface ActionDraft {
  type: "send_email" | "create_task" | "webhook" | "slack_notify" | "ai_generate";
  config: Record<string, string>;
}

const TRIGGERS = [
  { value: "CONTACT_CREATED", label: "A new contact is created" },
  { value: "DEAL_STAGE_CHANGED", label: "A deal moves to a stage" },
  { value: "INVOICE_OVERDUE", label: "An invoice becomes overdue" },
  { value: "TASK_COMPLETED", label: "A task is completed" },
  { value: "SCHEDULE", label: "On a schedule (cron)" },
  { value: "MANUAL", label: "Run manually only" },
];

const ACTION_TYPES: { value: ActionDraft["type"]; label: string }[] = [
  { value: "send_email", label: "Send an email" },
  { value: "create_task", label: "Create a task" },
  { value: "webhook", label: "Call a webhook" },
  { value: "slack_notify", label: "Post to Slack" },
  { value: "ai_generate", label: "Generate text with AI" },
];

function ActionFields({ action, onChange }: { action: ActionDraft; onChange: (config: Record<string, string>) => void }) {
  const set = (key: string, value: string) => onChange({ ...action.config, [key]: value });
  switch (action.type) {
    case "send_email":
      return (
        <>
          <input className="input" placeholder="To (e.g. {{contact.email}})" value={action.config.to || ""} onChange={(e) => set("to", e.target.value)} />
          <input className="input" placeholder="Subject" value={action.config.subject || ""} onChange={(e) => set("subject", e.target.value)} />
          <textarea className="input" placeholder="Body (use {{contact.name}} etc.)" value={action.config.body || ""} onChange={(e) => set("body", e.target.value)} />
        </>
      );
    case "create_task":
      return (
        <>
          <input className="input" placeholder="Project ID" value={action.config.projectId || ""} onChange={(e) => set("projectId", e.target.value)} />
          <input className="input" placeholder="Task title" value={action.config.title || ""} onChange={(e) => set("title", e.target.value)} />
        </>
      );
    case "webhook":
      return <input className="input" placeholder="https://example.com/webhook" value={action.config.url || ""} onChange={(e) => set("url", e.target.value)} />;
    case "slack_notify":
      return <textarea className="input" placeholder="Message (uses Slack webhook from Settings)" value={action.config.message || ""} onChange={(e) => set("message", e.target.value)} />;
    case "ai_generate":
      return <textarea className="input" placeholder="Prompt for the AI, e.g. Draft a follow-up email for {{contact.name}}" value={action.config.prompt || ""} onChange={(e) => set("prompt", e.target.value)} />;
  }
}

export default function Automations() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showAIForm, setShowAIForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("CONTACT_CREATED");
  const [cron, setCron] = useState("0 9 * * *");
  const [stage, setStage] = useState("WON");
  const [actions, setActions] = useState<ActionDraft[]>([{ type: "send_email", config: {} }]);

  const { data: automations = [] } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => (await api.get<Automation[]>("/automations")).data,
  });

  const createAutomation = useMutation({
    mutationFn: async () =>
      (
        await api.post("/automations", {
          name,
          description,
          triggerType,
          triggerConfig: triggerType === "SCHEDULE" ? { cron } : triggerType === "DEAL_STAGE_CHANGED" ? { stage } : {},
          actions,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      setShowForm(false);
      setName("");
      setDescription("");
      setActions([{ type: "send_email", config: {} }]);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => (await api.patch(`/automations/${id}`, { active })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/automations/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-sm text-slate-500">Trigger actions automatically across your business — no code required.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowAIForm(true)}>
            <Sparkles size={16} /> Create with AI
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New automation
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {automations.map((a) => (
          <div key={a.id} className="card flex items-center justify-between p-4">
            <div>
              <Link to={`/automations/${a.id}`} className="font-medium text-brand-600">
                {a.name}
              </Link>
              <div className="text-xs text-slate-500">{a.description}</div>
              <div className="mt-1 text-xs text-slate-400">Trigger: {a.triggerType.replace(/_/g, " ")}</div>
            </div>
            <div className="flex items-center gap-3">
              {a.runs[0] && <Badge>{a.runs[0].status}</Badge>}
              <button className="btn-secondary text-xs" onClick={() => toggleActive.mutate({ id: a.id, active: !a.active })}>
                {a.active ? "Pause" : "Activate"}
              </button>
              <button className="text-slate-400 hover:text-red-500" onClick={() => remove.mutate(a.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {automations.length === 0 && <div className="card p-8 text-center text-slate-400">No automations yet.</div>}
      </div>

      {showForm && (
        <Modal title="New automation" onClose={() => setShowForm(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createAutomation.mutate();
            }}
          >
            <div>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="label">When this happens…</label>
              <select className="input" value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {triggerType === "SCHEDULE" && (
              <div>
                <label className="label">Cron expression</label>
                <input className="input" value={cron} onChange={(e) => setCron(e.target.value)} />
              </div>
            )}
            {triggerType === "DEAL_STAGE_CHANGED" && (
              <div>
                <label className="label">Only when stage becomes</label>
                <select className="input" value={stage} onChange={(e) => setStage(e.target.value)}>
                  {["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">Do this…</label>
              <div className="space-y-3">
                {actions.map((action, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <select
                        className="input"
                        value={action.type}
                        onChange={(e) =>
                          setActions((prev) =>
                            prev.map((a, idx) => (idx === i ? { type: e.target.value as ActionDraft["type"], config: {} } : a))
                          )
                        }
                      >
                        {ACTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="ml-2 text-slate-400 hover:text-red-500"
                        onClick={() => setActions((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <ActionFields
                        action={action}
                        onChange={(config) => setActions((prev) => prev.map((a, idx) => (idx === i ? { ...a, config } : a)))}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-brand-600"
                onClick={() => setActions((prev) => [...prev, { type: "send_email", config: {} }])}
              >
                + Add action
              </button>
            </div>

            <button className="btn-primary w-full justify-center" disabled={createAutomation.isPending}>
              {createAutomation.isPending ? "Saving…" : "Create automation"}
            </button>
          </form>
        </Modal>
      )}

      {showAIForm && (
        <AICreateModal
          onClose={() => setShowAIForm(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["automations"] })}
        />
      )}
    </div>
  );
}
