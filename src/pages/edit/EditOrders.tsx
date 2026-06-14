import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useState } from "react";

export function EditOrders() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.orders.list({ sort_by: "created_at", sort_order: "desc" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.orders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      setMessage({ type: "success", text: "Pedido removido!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  return (
    <div className="space-y-6">
      <h3 className="page-title">Excluir pedidos</h3>
      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      <p className="text-sm text-gray-600">
        Ao excluir um pedido pago, os contadores de cliente, produto e receita serão ajustados automaticamente.
      </p>

      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Total</th>
              <th className="px-4 py-3 text-left">Itens</th>
              <th className="px-4 py-3 text-left">Ação</th>
            </tr>
          </thead>
          <tbody>
            {orders.data?.map((order) => (
              <tr key={order.id} className="border-t border-gray-100">
                <td className="px-4 py-3">#{order.number}</td>
                <td className="px-4 py-3">{formatDate(order.created_at)}</td>
                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                <td className="px-4 py-3">{formatCurrency(order.total)}</td>
                <td className="px-4 py-3">{order.items.length}</td>
                <td className="px-4 py-3">
                  <Button
                    variant="danger"
                    className="text-xs"
                    onClick={() => {
                      if (confirm(`Remover pedido #${order.number}?`)) {
                        deleteMutation.mutate(order.id);
                      }
                    }}
                    loading={deleteMutation.isPending}
                  >
                    Excluir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
