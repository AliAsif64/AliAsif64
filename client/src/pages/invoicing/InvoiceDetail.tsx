import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../api/client";
import Badge from "../../components/Badge";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  clientEmail?: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  items: InvoiceItem[];
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => (await api.get<Invoice>(`/invoices/${id}`)).data,
  });

  const sendInvoice = useMutation({
    mutationFn: async () => (await api.post(`/invoices/${id}/send`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice", id] }),
  });

  const markPaid = useMutation({
    mutationFn: async () => (await api.patch(`/invoices/${id}`, { status: "PAID" })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoice", id] }),
  });

  const checkout = useMutation({
    mutationFn: async () => (await api.post<{ url: string }>(`/invoices/${id}/checkout`)).data,
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  if (isLoading || !invoice) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{invoice.number}</h1>
          <p className="text-sm text-slate-500">{invoice.clientName}</p>
        </div>
        <Badge>{invoice.status}</Badge>
      </div>

      <div className="card mb-6 p-6">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="pb-2">Description</th>
              <th className="pb-2">Qty</th>
              <th className="pb-2">Unit price</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2">{item.description}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">${item.unitPrice.toFixed(2)}</td>
                <td className="py-2 text-right">${item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 space-y-1 text-right text-sm">
          <div>Subtotal: ${invoice.subtotal.toFixed(2)}</div>
          <div>Tax: ${invoice.tax.toFixed(2)}</div>
          <div className="text-lg font-semibold">Total: ${invoice.total.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <a className="btn-secondary" href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
          Download PDF
        </a>
        {invoice.status === "DRAFT" && (
          <button className="btn-primary" onClick={() => sendInvoice.mutate()} disabled={sendInvoice.isPending}>
            {sendInvoice.isPending ? "Sending…" : "Send to client"}
          </button>
        )}
        {invoice.status !== "PAID" && invoice.status !== "VOID" && (
          <>
            <button className="btn-secondary" onClick={() => markPaid.mutate()} disabled={markPaid.isPending}>
              Mark as paid
            </button>
            <button className="btn-secondary" onClick={() => checkout.mutate()} disabled={checkout.isPending}>
              Pay online (Stripe)
            </button>
          </>
        )}
      </div>
      {sendInvoice.isError && (
        <p className="mt-3 text-sm text-red-600">{(sendInvoice.error as any)?.response?.data?.error}</p>
      )}
      {checkout.isError && (
        <p className="mt-3 text-sm text-red-600">{(checkout.error as any)?.response?.data?.error}</p>
      )}
    </div>
  );
}
