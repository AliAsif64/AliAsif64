import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useStartDemo } from "../../api/useStartDemo";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const demo = useStartDemo();
  const [email, setEmail] = useState("demo@dsrsolutions.com");
  const [password, setPassword] = useState("Demo1234!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="mb-1 text-xl font-bold text-brand-700">DSR Solutions</h1>
        <p className="mb-6 text-sm text-slate-500">Business OS &amp; AI Automation Suite</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account? <Link to="/register" className="font-medium text-brand-600">Create one</Link>
        </p>
        <button
          className="mt-3 w-full text-center text-xs font-medium text-brand-600 hover:underline"
          onClick={() => demo.mutate()}
          disabled={demo.isPending}
        >
          {demo.isPending ? "Launching demo…" : "Or try a live demo — no signup required"}
        </button>
      </div>
    </div>
  );
}
