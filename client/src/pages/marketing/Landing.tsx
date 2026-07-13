import { Link, Navigate } from "react-router-dom";
import { Bot, Workflow, Users, Receipt, KanbanSquare, Building2, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useStartDemo } from "../../api/useStartDemo";

export default function Landing() {
  const { user, loading } = useAuth();
  const businessOsDemo = useStartDemo("/crm");
  const aiSuiteDemo = useStartDemo("/automations");

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="text-lg font-bold text-brand-700">DSR Solutions</div>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link to="/pricing" className="hover:text-slate-900">Pricing</Link>
          <Link to="/login" className="hover:text-slate-900">Sign in</Link>
          <Link to="/register" className="btn-primary">Start free trial</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <Sparkles size={14} /> Trusted by SMEs and Enterprises across the GCC, UK, USA, Canada &amp; Australia
        </div>
        <h1 className="mb-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Run your business and automate it — in one platform
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-500">
          Business OS and the AI Automation Suite give growing companies and enterprises everywhere the CRM,
          invoicing, project management, and AI-powered automation they need to scale — without stitching together
          a dozen tools.
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/register" className="btn-primary px-6 py-3 text-base">
            Start your 14-day free trial <ArrowRight size={18} />
          </Link>
          <Link to="/pricing" className="btn-secondary px-6 py-3 text-base">
            View pricing
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-2">
        <div className="card p-8">
          <div className="mb-3 flex items-center gap-2 text-brand-700">
            <Building2 size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">Business OS</span>
          </div>
          <h2 className="mb-3 text-2xl font-bold">Everything to run daily operations</h2>
          <ul className="mb-6 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2"><Users size={16} className="text-brand-500" /> CRM with a visual deal pipeline</li>
            <li className="flex items-center gap-2"><Receipt size={16} className="text-brand-500" /> Invoicing with PDF export &amp; online payment</li>
            <li className="flex items-center gap-2"><KanbanSquare size={16} className="text-brand-500" /> Projects &amp; task boards</li>
            <li className="flex items-center gap-2"><Users size={16} className="text-brand-500" /> Team management with roles</li>
          </ul>
          <button
            className="btn-secondary w-full justify-center"
            onClick={() => businessOsDemo.mutate()}
            disabled={businessOsDemo.isPending}
          >
            {businessOsDemo.isPending ? "Launching demo…" : "Try Business OS live demo"}
          </button>
        </div>

        <div className="card p-8">
          <div className="mb-3 flex items-center gap-2 text-brand-700">
            <Workflow size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">AI Automation Suite</span>
          </div>
          <h2 className="mb-3 text-2xl font-bold">Automate the busywork with AI</h2>
          <ul className="mb-6 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2"><Workflow size={16} className="text-brand-500" /> No-code trigger → action automation builder</li>
            <li className="flex items-center gap-2"><Bot size={16} className="text-brand-500" /> AI Assistant powered by Claude</li>
            <li className="flex items-center gap-2"><Workflow size={16} className="text-brand-500" /> Email, Slack &amp; webhook actions</li>
            <li className="flex items-center gap-2"><Workflow size={16} className="text-brand-500" /> Full run history &amp; audit logs</li>
          </ul>
          <button
            className="btn-secondary w-full justify-center"
            onClick={() => aiSuiteDemo.mutate()}
            disabled={aiSuiteDemo.isPending}
          >
            {aiSuiteDemo.isPending ? "Launching demo…" : "Try AI Automation Suite live demo"}
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        DSR Solutions — Business OS &amp; AI Automation Suite. No credit card required to start.
      </footer>
    </div>
  );
}
