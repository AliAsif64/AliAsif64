import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

interface IntegrationStatus {
  smtpHost: string;
  smtpPort: number | null;
  smtpUser: string;
  smtpFrom: string;
  smtpConfigured: boolean;
  slackConfigured: boolean;
  stripeConfigured: boolean;
  aiConfigured: boolean;
}

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      {ok ? "Connected" : "Not configured"}
    </span>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => (await api.get<IntegrationStatus>("/integrations")).data,
  });

  const [smtp, setSmtp] = useState({ smtpHost: "", smtpPort: "", smtpUser: "", smtpPass: "", smtpFrom: "" });
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");

  useEffect(() => {
    if (data) {
      setSmtp({
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort ? String(data.smtpPort) : "",
        smtpUser: data.smtpUser,
        smtpPass: "",
        smtpFrom: data.smtpFrom,
      });
    }
  }, [data]);

  const saveSmtp = useMutation({
    mutationFn: async () =>
      api.put("/integrations", { ...smtp, smtpPort: smtp.smtpPort ? Number(smtp.smtpPort) : undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const saveSlack = useMutation({
    mutationFn: async () => api.put("/integrations", { slackWebhookUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setSlackWebhookUrl("");
    },
  });

  const saveStripe = useMutation({
    mutationFn: async () => api.put("/integrations", { stripeSecretKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setStripeSecretKey("");
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings &amp; Integrations</h1>
        <p className="text-sm text-slate-500">Connect the external services that power automations and the AI Assistant.</p>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">AI Assistant (Anthropic Claude)</h2>
          <StatusPill ok={Boolean(data?.aiConfigured)} />
        </div>
        <p className="text-sm text-slate-500">
          Set <code>ANTHROPIC_API_KEY</code> in the server environment. Get a key at{" "}
          <span className="font-medium">console.anthropic.com</span>. This powers the AI Assistant chat and the
          "Generate text with AI" automation action.
        </p>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Outbound email (SMTP)</h2>
          <StatusPill ok={Boolean(data?.smtpConfigured)} />
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Required for "Send email" automation actions, invoice emails, and team invites. Works with SendGrid, Postmark,
          Mailgun, Amazon SES, or a Gmail App Password.
        </p>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveSmtp.mutate();
          }}
        >
          <input className="input" placeholder="SMTP host" value={smtp.smtpHost} onChange={(e) => setSmtp({ ...smtp, smtpHost: e.target.value })} />
          <input className="input" placeholder="Port (e.g. 587)" value={smtp.smtpPort} onChange={(e) => setSmtp({ ...smtp, smtpPort: e.target.value })} />
          <input className="input" placeholder="Username" value={smtp.smtpUser} onChange={(e) => setSmtp({ ...smtp, smtpUser: e.target.value })} />
          <input className="input" type="password" placeholder="Password / API key" value={smtp.smtpPass} onChange={(e) => setSmtp({ ...smtp, smtpPass: e.target.value })} />
          <input className="input" placeholder='From (e.g. "Acme Co <no-reply@acme.com>")' value={smtp.smtpFrom} onChange={(e) => setSmtp({ ...smtp, smtpFrom: e.target.value })} />
          <button className="btn-primary" disabled={saveSmtp.isPending}>
            {saveSmtp.isPending ? "Saving…" : "Save"}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Slack notifications</h2>
          <StatusPill ok={Boolean(data?.slackConfigured)} />
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Create an Incoming Webhook in your Slack workspace and paste the URL here to enable the "Post to Slack"
          automation action.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveSlack.mutate();
          }}
        >
          <input className="input" placeholder="https://hooks.slack.com/services/…" value={slackWebhookUrl} onChange={(e) => setSlackWebhookUrl(e.target.value)} />
          <button className="btn-primary" disabled={saveSlack.isPending}>
            Save
          </button>
        </form>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Payments (Stripe)</h2>
          <StatusPill ok={Boolean(data?.stripeConfigured)} />
        </div>
        <p className="mb-3 text-sm text-slate-500">
          Add a Stripe secret key to enable "Pay online" on invoices. Get one from your Stripe Dashboard.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveStripe.mutate();
          }}
        >
          <input className="input" type="password" placeholder="sk_live_…" value={stripeSecretKey} onChange={(e) => setStripeSecretKey(e.target.value)} />
          <button className="btn-primary" disabled={saveStripe.isPending}>
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
