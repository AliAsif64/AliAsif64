import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Receipt,
  Building2,
  Workflow,
  Bot,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

const businessOsLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/crm", label: "CRM & Deals", icon: Users },
  { to: "/invoicing", label: "Invoicing", icon: Receipt },
  { to: "/projects", label: "Projects", icon: KanbanSquare },
  { to: "/team", label: "Team", icon: Building2 },
];

const aiSuiteLinks = [
  { to: "/automations", label: "Automations", icon: Workflow },
  { to: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function NavSection({ title, links }: { title: string; links: typeof businessOsLinks }) {
  return (
    <div className="mb-6">
      <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</div>
      <div className="space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, organization, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white p-4">
        <div className="mb-6 px-2">
          <div className="text-lg font-bold text-brand-700">DSR Solutions</div>
          <div className="text-xs text-slate-500">{organization?.name}</div>
        </div>
        <NavSection title="Business OS" links={businessOsLinks} />
        <NavSection title="AI Automation Suite" links={aiSuiteLinks} />
        <div className="mt-auto border-t border-slate-200 pt-4">
          <div className="mb-2 px-2 text-sm">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-slate-500">{user?.role}</div>
          </div>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <Outlet />
      </main>
    </div>
  );
}
