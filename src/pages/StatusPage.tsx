import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order, type OrderStatus } from "../types";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { StatusBadge } from "../components/ui/StatusBadge";

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

const statusOptions = ALL_STATUSES.map((value) => ({
  value,
  label: ORDER_STATUS_LABELS[value],
}));

export function StatusPage() {
  const queryClient = useQueryClient();

  // left panel filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "">("");
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  // right panel state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("IN_PROGRESS");
  const [changedAt, setChangedAt] = useState("");   // optional manual date
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.orders.list({ sort_by: "created_at", sort_order: "desc" }),
  });

  const customers = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => api.customers.list(),
  });
  const customerMap = new Map(customers.data?.map((c) => [c.id, c]) ?? []);

  const selectedOrder = orders.data?.find((o) => o.id === selectedOrderId);

  const mutation = useMutation({
    mutationFn: () =>
      api.orders.updateStatus(
        selectedOrderId!,
        newStatus,
        changedAt ? `${changedAt}T12:00:00` : undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      setMessage({ type: "success", text: "Status atualizado com sucesso!" });
      setChangedAt("");
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  // Filter orders
  const filtered = (orders.data ?? []).filter((o) => {
    if (showOnlyActive && (o.status === "PAID" || o.status === "CANCELED")) return false;
    if (filterStatus && o.status !== filterStatus) return false;
    if (search) {
      const lower = search.toLowerCase();
      const customerName = customerMap.get(o.customer_id)?.name?.toLowerCase() ?? "";
      if (
        !String(o.number).includes(search) &&
        !customerName.includes(lower)
      ) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <h2 className="page-title">Gerenciar status dos pedidos</h2>

      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left panel — order list */}
        <div className="section-card space-y-4">
          <h3 className="font-semibold text-brand-pink-deep">Pedidos</h3>

          {/* Filters */}
          <div className="space-y-2">
            <Input
              placeholder="Buscar por nº ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                    filterStatus === s ? "ring-2 ring-brand-pink-deep" : "opacity-75 hover:opacity-100"
                  } ${ORDER_STATUS_COLORS[s]}`}
                >
                  {ORDER_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOnlyActive}
                onChange={(e) => setShowOnlyActive(e.target.checked)}
                className="rounded"
              />
              Somente pedidos ativos (excluir Pagos e Cancelados)
            </label>
          </div>

          <p className="text-xs text-gray-400">
            {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}
          </p>

          <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setNewStatus(order.status);
                  setChangedAt("");
                  setMessage(null);
                }}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedOrderId === order.id
                    ? "border-brand-pink-deep bg-brand-pink/20"
                    : "border-gray-200 hover:border-brand-pink/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">
                    Pedido #{order.number}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {customerMap.get(order.customer_id)?.name
                    ? `👤 ${customerMap.get(order.customer_id)!.name} · `
                    : ""}
                  {formatDate(order.created_at)} · {formatCurrency(order.total)}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400">
                Nenhum pedido encontrado.
              </p>
            )}
          </div>
        </div>

        {/* Right panel — update status */}
        <div className="section-card">
          {selectedOrder ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-brand-pink-deep">
                Pedido #{selectedOrder.number}
              </h3>

              {/* Customer info */}
              {customerMap.get(selectedOrder.customer_id) && (
                <div className="rounded-xl bg-brand-yellow/20 px-4 py-2 text-sm">
                  <p className="text-xs text-gray-400 font-medium">Cliente</p>
                  <p className="font-semibold text-brand-pink-deep">
                    {customerMap.get(selectedOrder.customer_id)!.name}
                  </p>
                </div>
              )}

              <div className="flex gap-2 text-sm">
                <span className="text-gray-500">Total:</span>
                <strong>{formatCurrency(selectedOrder.total)}</strong>
              </div>

              <Select
                label="Novo status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                options={statusOptions}
              />

              {/* Manual date entry */}
              <Input
                label="Data da mudança (opcional)"
                type="date"
                value={changedAt}
                onChange={(e) => setChangedAt(e.target.value)}
                hint="Deixe em branco para usar a data/hora atual"
              />

              <Button
                onClick={() => mutation.mutate()}
                loading={mutation.isPending}
                disabled={newStatus === selectedOrder.status && !changedAt}
              >
                Atualizar status
              </Button>

              {/* Status history */}
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
              Selecione um pedido à esquerda para alterar o status.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
