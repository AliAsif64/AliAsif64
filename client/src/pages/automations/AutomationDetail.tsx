import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import Badge from "../../components/Badge";

interface Run {
  id: string;
  status: string;
  log: string;
  triggeredBy?: string;
  createdAt: string;
}

interface Automation {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  active: boolean;
}

export default function AutomationDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: automations = [] } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => (await api.get<Automation[]>("/automations")).data,
  });
  const automation = automations.find((a) => a.id === id);

  const { data: runs = [] } = useQuery({
    queryKey: ["automation-runs", id],
    queryFn: async () => (await api.get<Run[]>(`/automations/${id}/runs`)).data,
    enabled: Boolean(id),
  });

  const runNow = useMutation({
    mutationFn: async () => (await api.post(`/automations/${id}/run`, { context: {} })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-runs", id] }),
  });

  if (!automation) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{automation.name}</h1>
          <p className="text-sm text-slate-500">{automation.description}</p>
        </div>
        <button className="btn-primary" onClick={() => runNow.mutate()} disabled={runNow.isPending}>
          {runNow.isPending ? "Running…" : "Run now"}
        </button>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Run history</h2>
      <div className="space-y-3">
        {runs.map((run) => {
          const log: { type: string; ok: boolean; detail: string }[] = JSON.parse(run.log || "[]");
          return (
            <div key={run.id} className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge>{run.status}</Badge>
                <span className="text-xs text-slate-400">{new Date(run.createdAt).toLocaleString()}</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                {log.map((step, i) => (
                  <div key={i} className={step.ok ? "" : "text-red-600"}>
                    {step.type}: {step.detail}
                  </div>
                ))}
              </div>
              {run.triggeredBy && <div className="mt-2 text-xs text-slate-400">Triggered by: {run.triggeredBy}</div>}
            </div>
          );
        })}
        {runs.length === 0 && <div className="card p-8 text-center text-slate-400">No runs yet.</div>}
      </div>
    </div>
  );
}
