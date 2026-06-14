import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import { ORDER_STATUS_LABELS, type OrderStatus } from "../types";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Select";
import { StatusBadge } from "../components/ui/StatusBadge";

export function StatusPage() {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("IN_PROGRESS");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.orders.list({ sort_by: "created_at", sort_order: "desc" }),
  });

  const selectedOrder = orders.data?.find((o) => o.id === selectedOrderId);

  const mutation = useMutation({
    mutationFn: () => api.orders.updateStatus(selectedOrderId!, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      setMessage({ type: "success", text: "Status atualizado com sucesso!" });
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const activeOrders = orders.data?.filter((o) => o.status !== "PAID" && o.status !== "CANCELED");

  return (
    <div className="space-y-6">
      <h2 className="page-title">Gerenciar status dos pedidos</h2>

      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="section-card">
          <h3 className="mb-4 font-semibold text-brand-pink-deep">Pedidos ativos</h3>
          <div className="max-h-[500px] space-y-2 overflow-y-auto">
            {activeOrders?.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setNewStatus(order.status);
                  setMessage(null);
                }}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedOrderId === order.id
                    ? "border-brand-pink-deep bg-brand-pink/20"
                    : "border-gray-200 hover:border-brand-pink/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Pedido #{order.number}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDate(order.created_at)} · {formatCurrency(order.total)}
                </p>
              </button>
            ))}
            {!activeOrders?.length && (
              <p className="text-sm text-gray-400">Nenhum pedido ativo no momento.</p>
            )}
          </div>
        </div>

        <div className="section-card">
          {selectedOrder ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-brand-pink-deep">
                Pedido #{selectedOrder.number}
              </h3>
              <p className="text-sm">
                Total: <strong>{formatCurrency(selectedOrder.total)}</strong>
              </p>

              <Select
                label="Novo status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                options={statusOptions}
              />

              <Button
                onClick={() => mutation.mutate()}
                loading={mutation.isPending}
                disabled={newStatus === selectedOrder.status}
              >
                Atualizar status
              </Button>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-600">Histórico</h4>
                <ul className="space-y-1 text-sm">
                  {selectedOrder.status_history.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2">
                      <StatusBadge status={entry.status} />
                      <span className="text-gray-500">{formatDate(entry.changed_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Selecione um pedido para alterar o status.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
