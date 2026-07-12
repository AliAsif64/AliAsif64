import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "../../api/client";
import Modal from "../../components/Modal";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  title?: string;
  active: boolean;
}

export default function Team() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "MEMBER", department: "", title: "" });
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["team"],
    queryFn: async () => (await api.get<Member[]>("/team")).data,
  });

  const invite = useMutation({
    mutationFn: async () => (await api.post("/team/invite", form)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setShowForm(false);
      setForm({ name: "", email: "", role: "MEMBER", department: "", title: "" });
      if (data.temporaryPassword) {
        setInviteResult(`No SMTP configured — share this temporary password with them: ${data.temporaryPassword}`);
      } else {
        setInviteResult("Invite email sent.");
      }
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => (await api.patch(`/team/${id}`, { role })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-slate-500">Manage your workspace members and roles.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Invite member
        </button>
      </div>

      {inviteResult && <div className="card mb-4 p-3 text-sm text-slate-600">{inviteResult}</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Title / Dept</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-slate-500">{m.email}</td>
                <td className="px-4 py-3 text-slate-500">
                  {[m.title, m.department].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3">
                  {m.role === "OWNER" ? (
                    m.role
                  ) : (
                    <select
                      className="rounded border border-slate-200 text-xs"
                      value={m.role}
                      onChange={(e) => updateRole.mutate({ id: m.id, role: e.target.value })}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="MEMBER">MEMBER</option>
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="Invite member" onClose={() => setShowForm(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
          >
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="MEMBER">MEMBER</option>
              </select>
            </div>
            {invite.isError && <div className="text-sm text-red-600">{(invite.error as any)?.response?.data?.error}</div>}
            <button className="btn-primary w-full justify-center" disabled={invite.isPending}>
              {invite.isPending ? "Inviting…" : "Send invite"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
