import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, Mail, Copy } from "lucide-react";
import clsx from "clsx";
import { api } from "../../api/client";
import Modal from "../../components/Modal";
import Badge from "../../components/Badge";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: string;
  aiScore?: number | null;
  aiScoreRationale?: string | null;
  deals: { id: string; value: number; stage: string }[];
}

function scoreColor(score: number) {
  if (score >= 70) return "bg-emerald-100 text-emerald-700";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function DraftEmailModal({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [goal, setGoal] = useState("");
  const [copied, setCopied] = useState(false);

  const draft = useMutation({
    mutationFn: async () =>
      (await api.post<{ subject: string; body: string }>("/ai/draft-email", { contactId: contact.id, goal })).data,
  });

  async function copyDraft() {
    if (!draft.data) return;
    await navigator.clipboard.writeText(`Subject: ${draft.data.subject}\n\n${draft.data.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal title={`Draft email to ${contact.name}`} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          draft.mutate();
        }}
      >
        <div>
          <label className="label">What should this email achieve?</label>
          <input
            className="input"
            placeholder='e.g. "Follow up on the proposal and ask for a decision this week"'
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            required
            minLength={3}
          />
        </div>
        <button className="btn-primary w-full justify-center" disabled={draft.isPending}>
          <Sparkles size={16} /> {draft.isPending ? "Drafting…" : draft.data ? "Redraft" : "Draft with AI"}
        </button>
      </form>
      {draft.isError && (
        <p className="mt-3 text-sm text-red-600">{(draft.error as any)?.response?.data?.error || "Drafting failed."}</p>
      )}
      {draft.data && (
        <div className="mt-4 rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-800">{draft.data.subject}</div>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{draft.data.body}</p>
          <button type="button" className="btn-secondary mt-3 text-xs" onClick={copyDraft}>
            <Copy size={14} /> {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      )}
    </Modal>
  );
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  contact?: { id: string; name: string } | null;
}

const STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

function ContactsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [emailContact, setEmailContact] = useState<Contact | null>(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => (await api.get<Contact[]>("/crm/contacts")).data,
  });

  const createContact = useMutation({
    mutationFn: async () => (await api.post("/crm/contacts", form)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", company: "" });
    },
  });

  const scoreLead = useMutation({
    mutationFn: async (contactId: string) => (await api.post(`/ai/score-lead/${contactId}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add contact
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Deals</th>
              <th className="px-4 py-3">AI Score</th>
              <th className="px-4 py-3">AI Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.company || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{c.email || "—"}</td>
                <td className="px-4 py-3"><Badge>{c.status}</Badge></td>
                <td className="px-4 py-3 text-slate-500">{c.deals.length}</td>
                <td className="px-4 py-3">
                  {c.aiScore != null ? (
                    <span
                      className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", scoreColor(c.aiScore))}
                      title={c.aiScoreRationale || undefined}
                    >
                      {c.aiScore}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      className="text-slate-400 hover:text-brand-600 disabled:opacity-40"
                      title="Score this lead with AI"
                      onClick={() => scoreLead.mutate(c.id)}
                      disabled={scoreLead.isPending}
                    >
                      <Sparkles size={16} />
                    </button>
                    <button
                      className="text-slate-400 hover:text-brand-600"
                      title="Draft an email with AI"
                      onClick={() => setEmailContact(c)}
                    >
                      <Mail size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No contacts yet. Add your first lead to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="Add contact" onClose={() => setShowForm(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createContact.mutate();
            }}
          >
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Company</label>
              <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button className="btn-primary w-full justify-center" disabled={createContact.isPending}>
              {createContact.isPending ? "Saving…" : "Save contact"}
            </button>
          </form>
        </Modal>
      )}

      {emailContact && <DraftEmailModal contact={emailContact} onClose={() => setEmailContact(null)} />}
      {scoreLead.isError && (
        <p className="mt-3 text-sm text-red-600">
          {(scoreLead.error as any)?.response?.data?.error || "Lead scoring failed."}
        </p>
      )}
    </div>
  );
}

function DealsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", value: "" });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => (await api.get<Deal[]>("/crm/deals")).data,
  });

  const createDeal = useMutation({
    mutationFn: async () => (await api.post("/crm/deals", { title: form.title, value: Number(form.value) || 0 })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setShowForm(false);
      setForm({ title: "", value: "" });
    },
  });

  const moveStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) =>
      (await api.patch(`/crm/deals/${id}`, { stage })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }),
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add deal
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((stage) => (
          <div key={stage} className="card min-h-[200px] p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {stage.replace(/_/g, " ")}
            </div>
            <div className="space-y-2">
              {deals
                .filter((d) => d.stage === stage)
                .map((deal) => (
                  <div key={deal.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                    <div className="font-medium text-slate-800">{deal.title}</div>
                    <div className="text-slate-500">${deal.value.toLocaleString()}</div>
                    {deal.contact && <div className="text-slate-400">{deal.contact.name}</div>}
                    <select
                      className="mt-2 w-full rounded border border-slate-200 text-xs"
                      value={deal.stage}
                      onChange={(e) => moveStage.mutate({ id: deal.id, stage: e.target.value })}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title="Add deal" onClose={() => setShowForm(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createDeal.mutate();
            }}
          >
            <div>
              <label className="label">Deal title</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="label">Value ($)</label>
              <input className="input" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <button className="btn-primary w-full justify-center" disabled={createDeal.isPending}>
              {createDeal.isPending ? "Saving…" : "Save deal"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function Contacts() {
  const [tab, setTab] = useState<"contacts" | "deals">("contacts");
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">CRM &amp; Deals</h1>
      <p className="mb-6 text-sm text-slate-500">Track leads and move them through your sales pipeline.</p>
      <div className="mb-6 flex gap-2">
        <button
          className={tab === "contacts" ? "btn-primary" : "btn-secondary"}
          onClick={() => setTab("contacts")}
        >
          Contacts
        </button>
        <button className={tab === "deals" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("deals")}>
          Deal pipeline
        </button>
      </div>
      {tab === "contacts" ? <ContactsTab /> : <DealsTab />}
    </div>
  );
}
