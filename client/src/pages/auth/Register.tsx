import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<"SME" | "ENTERPRISE">("SME");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ organizationName, name, email, password, plan });
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="mb-1 text-xl font-bold text-brand-700">Create your workspace</h1>
        <p className="mb-6 text-sm text-slate-500">Set up Business OS &amp; AI Automation Suite for your company</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Company name</label>
            <input className="input" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Your name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="label">Business size</label>
            <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as "SME" | "ENTERPRISE")}>
              <option value="SME">SME</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? "Creating…" : "Create workspace"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="font-medium text-brand-600">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
