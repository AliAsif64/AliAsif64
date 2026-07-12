import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import Modal from "../../components/Modal";
import Badge from "../../components/Badge";

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  status: string;
  total: number;
  dueDate: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function Invoicing() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [tax, setTax] = useState("0");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await api.get<Invoice[]>("/invoices")).data,
  });

  const createInvoice = useMutation({
    mutationFn: async () =>
      (
        await api.post("/invoices", {
          clientName,
          clientEmail: clientEmail || undefined,
          dueDate,
          tax: Number(tax) || 0,
          items,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setShowForm(false);
      setClientName("");
      setClientEmail("");
      setDueDate("");
      setTax("0");
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
    },
  });

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoicing</h1>
          <p className="text-sm text-slate-500">Create, send, and collect payment on invoices.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New invoice
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Due date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link to={`/invoicing/${inv.id}`} className="font-medium text-brand-600">
                    {inv.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{inv.clientName}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">${inv.total.toLocaleString()}</td>
                <td className="px-4 py-3"><Badge>{inv.status}</Badge></td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="New invoice" onClose={() => setShowForm(false)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createInvoice.mutate();
            }}
          >
            <div>
              <label className="label">Client name</label>
              <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Client email (optional)</label>
              <input className="input" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Due date</label>
              <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Line items</label>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      required
                    />
                    <input
                      className="input w-20"
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                    />
                    <input
                      className="input w-24"
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                    />
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-500"
                      onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-brand-600"
                onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}
              >
                + Add line item
              </button>
            </div>
            <div>
              <label className="label">Tax ($)</label>
              <input className="input" type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
            <button className="btn-primary w-full justify-center" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? "Creating…" : "Create invoice"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
