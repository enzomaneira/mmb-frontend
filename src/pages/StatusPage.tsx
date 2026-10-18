import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type OrderStatus, type SortOrder } from "../types";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { SortToggle } from "../components/ui/SortToggle";
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
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // right panel state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("IN_PROGRESS");
  const [changedAt, setChangedAt] = useState("");   // optional manual date
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // payment form state
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");

  const orders = useQuery({
    queryKey: ["orders", sortBy, sortOrder],
    queryFn: () => api.orders.list({ sort_by: sortBy, sort_order: sortOrder }),
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

  // payment mutations
  const addPaymentMutation = useMutation({
    mutationFn: () =>
      api.payments.create(selectedOrderId!, {
        amount: Number(payAmount),
        paid_at: payDate ? `${payDate}T12:00:00` : undefined,
        note: payNote || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setPayAmount("");
      setPayDate("");
      setPayNote("");
      setPayError("");
      setMessage({ type: "success", text: "Pagamento registrado!" });
    },
    onError: (err: Error) => {
      setPayError(err.message);
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) =>
      api.payments.delete(selectedOrderId!, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setMessage({ type: "success", text: "Pagamento removido." });
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
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-brand-pink-deep">Pedidos</h3>
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: "created_at", label: "Data" },
                  { value: "total", label: "Total" },
                  { value: "number", label: "Número" },
                  { value: "status", label: "Status" },
                ]}
              />
              <SortToggle value={sortOrder} onChange={setSortOrder} />
            </div>
          </div>

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

              {/* Products */}
              {selectedOrder.items.length > 0 && (
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
                  <p className="mb-2 text-xs font-medium text-gray-400">Produtos</p>
                  <ul className="space-y-1.5">
                    {selectedOrder.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-gray-700">
                          {item.product_name
                            ? `#${item.product_number} — ${item.product_name}`
                            : `Produto #${item.product_id}`}
                          <span className="ml-1 text-gray-400">×{item.quantity}</span>
                        </span>
                        <span className="shrink-0 text-gray-500">
                          {formatCurrency(item.unit_price)} → <strong>{formatCurrency(item.subtotal)}</strong>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 text-sm">
                <span className="text-gray-500">Total:</span>
                <strong>{formatCurrency(selectedOrder.total)}</strong>
              </div>

              {/* Payments section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-600">Pagamentos</h4>

                {/* Existing payments list */}
                {selectedOrder.payments.length > 0 && (
                  <ul className="space-y-1.5">
                    {selectedOrder.payments.map((pay) => (
                      <li
                        key={pay.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-green-50 px-3 py-1.5 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-green-700">
                            {formatCurrency(pay.amount)}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {formatDate(pay.paid_at)}
                          </span>
                          {pay.note && (
                            <span className="ml-1 truncate text-xs text-gray-400">
                              · {pay.note}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deletePaymentMutation.mutate(pay.id)}
                          className="shrink-0 rounded p-1 text-gray-400 transition hover:bg-red-100 hover:text-red-500"
                          title="Remover pagamento"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Payment summary */}
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
                  <span className="text-gray-500">Total pago:</span>
                  <span className="font-bold text-green-700">
                    {formatCurrency(selectedOrder.paid_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-brand-pink/5 px-3 py-2 text-sm">
                  <span className="text-gray-500">Saldo devedor:</span>
                  <span
                    className={`font-bold ${
                      parseFloat(selectedOrder.paid_amount) >= parseFloat(selectedOrder.total)
                        ? "text-green-600"
                        : "text-brand-pink-deep"
                    }`}
                  >
                    {formatCurrency(
                      parseFloat(selectedOrder.total) - parseFloat(selectedOrder.paid_amount),
                    )}
                  </span>
                </div>

                {/* Add payment form */}
                <div className="space-y-2 rounded-xl border border-gray-200 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      label="Valor (R$)"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0,00"
                      value={payAmount}
                      error={payError}
                      onChange={(e) => {
                        setPayAmount(e.target.value.replace(/[^0-9.]/g, ""));
                        if (payError) setPayError("");
                      }}
                    />
                    <Input
                      label="Data (opcional)"
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      hint="Em branco = hoje"
                    />
                  </div>
                  <Input
                    label="Observação (opcional)"
                    type="text"
                    placeholder="Ex: Sinal, Parcela 1..."
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full py-2 text-sm"
                    loading={addPaymentMutation.isPending}
                    disabled={!payAmount || Number(payAmount) <= 0}
                    onClick={() => {
                      if (!payAmount || Number(payAmount) <= 0) {
                        setPayError("Informe um valor válido");
                        return;
                      }
                      addPaymentMutation.mutate();
                    }}
                  >
                    💰 Registrar pagamento
                  </Button>
                </div>
              </div>

              <Select
                label="Novo status"
                value={newStatus}
                onChange={(e) => {
                  const status = e.target.value as OrderStatus;
                  setNewStatus(status);
                  // Payment usually happens on delivery: suggest that date (still editable)
                  const delivered = selectedOrder.status_history.find((h) => h.status === "DELIVERED");
                  setChangedAt(status === "PAID" && delivered ? delivered.changed_at.slice(0, 10) : "");
                }}
                options={statusOptions}
              />

              {/* Manual date entry */}
              <Input
                label="Data da mudança (opcional)"
                type="date"
                value={changedAt}
                onChange={(e) => setChangedAt(e.target.value)}
                hint={
                  newStatus === selectedOrder.status
                    ? "Mesmo status: informe uma data para sobrescrever a data registrada"
                    : "Deixe em branco para usar a data/hora atual"
                }
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
