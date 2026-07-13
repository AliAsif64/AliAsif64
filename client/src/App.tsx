import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/marketing/Landing";
import Pricing from "./pages/marketing/Pricing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import Contacts from "./pages/crm/Contacts";
import Invoicing from "./pages/invoicing/Invoicing";
import InvoiceDetail from "./pages/invoicing/InvoiceDetail";
import Projects from "./pages/projects/Projects";
import Team from "./pages/team/Team";
import Automations from "./pages/automations/Automations";
import AutomationDetail from "./pages/automations/AutomationDetail";
import AIAssistant from "./pages/ai/AIAssistant";
import Settings from "./pages/settings/Settings";
import Billing from "./pages/billing/Billing";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/crm" element={<Contacts />} />
        <Route path="/invoicing" element={<Invoicing />} />
        <Route path="/invoicing/:id" element={<InvoiceDetail />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/team" element={<Team />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/automations/:id" element={<AutomationDetail />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/billing" element={<Billing />} />
      </Route>
    </Routes>
  );
}
