import { useMutation, useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Users, TrendingUp, Receipt, Workflow, ListChecks, Trophy, Sparkles } from "lucide-react";
import clsx from "clsx";
import { api } from "../../api/client";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";

interface Insight {
  title: string;
  detail: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

const PRIORITY_STYLE: Record<Insight["priority"], string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-slate-100 text-slate-600",
};

function AIInsightsCard() {
  const insights = useMutation({
    mutationFn: async () => (await api.post<{ insights: Insight[] }>("/ai/insights")).data.insights,
  });

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Sparkles size={16} className="text-brand-500" /> AI Business Insights
        </h2>
        <button className="btn-secondary text-xs" onClick={() => insights.mutate()} disabled={insights.isPending}>
          {insights.isPending ? "Analyzing…" : insights.data ? "Refresh" : "Analyze my business"}
        </button>
      </div>
      {insights.isError && (
        <p className="text-sm text-red-600">{(insights.error as any)?.response?.data?.error || "Something went wrong."}</p>
      )}
      {!insights.data && !insights.isPending && !insights.isError && (
        <p className="text-sm text-slate-400">
          Let the AI review your live pipeline, invoices, tasks, and automations and suggest what to do next.
        </p>
      )}
      {insights.data && (
        <div className="space-y-3">
          {insights.data.map((insight, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_STYLE[insight.priority])}>
                  {insight.priority}
                </span>
                <span className="text-sm font-medium text-slate-800">{insight.title}</span>
              </div>
              <p className="text-sm text-slate-600">{insight.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Overview {
  contactsCount: number;
  openDealsCount: number;
  wonDealsCount: number;
  pipelineValue: number;
  revenue: number;
  outstanding: number;
  tasksTotal: number;
  tasksDone: number;
  automationsCount: number;
  automationRunsRecent: number;
  automationSuccessRate: number | null;
  revenueByMonth: Record<string, number>;
}

export default function Dashboard() {
  const { organization } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () => (await api.get<Overview>("/analytics/overview")).data,
  });

  const chartData = data
    ? Object.entries(data.revenueByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({ month, total }))
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-slate-500">
          {organization?.name} · {organization?.plan === "ENTERPRISE" ? "Enterprise" : "SME"} plan
        </p>
      </div>

      {isLoading || !data ? (
        <div className="text-slate-400">Loading overview…</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Contacts" value={data.contactsCount} icon={Users} />
            <StatCard label="Open pipeline" value={`$${data.pipelineValue.toLocaleString()}`} icon={TrendingUp} hint={`${data.openDealsCount} open deals`} />
            <StatCard label="Deals won" value={data.wonDealsCount} icon={Trophy} />
            <StatCard label="Revenue collected" value={`$${data.revenue.toLocaleString()}`} icon={Receipt} />
            <StatCard label="Outstanding" value={`$${data.outstanding.toLocaleString()}`} icon={Receipt} />
            <StatCard label="Tasks done" value={`${data.tasksDone}/${data.tasksTotal}`} icon={ListChecks} />
          </div>

          <div className="mb-6">
            <AIInsightsCard />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Revenue by month</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="total" fill="#3466f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Workflow size={16} /> AI Automation health
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active automations</span>
                  <span className="font-medium">{data.automationsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Runs (last 100)</span>
                  <span className="font-medium">{data.automationRunsRecent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Success rate</span>
                  <span className="font-medium">
                    {data.automationSuccessRate === null ? "—" : `${Math.round(data.automationSuccessRate * 100)}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
