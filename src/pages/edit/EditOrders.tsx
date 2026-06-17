import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type Order, type OrderStatus } from "../../types";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";

const statusOptions = [
  { value: "", label: "Todos os status" },
  ...Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

export function EditOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMinTotal, setFilterMinTotal] = useState("");
  const [filterMaxTotal, setFilterMaxTotal] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
      setSelectedOrder(null);
      setMessage({ type: "success", text: "Pedido removido com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const filtered = (orders.data ?? []).filter((o) => {
    const matchSearch =
      String(o.number).includes(search) ||
      String(o.customer_id).includes(search);
    const matchStatus = !filterStatus || o.status === filterStatus;
    const total = parseFloat(o.total);
    const matchMin = !filterMinTotal || total >= parseFloat(filterMinTotal);
    const matchMax = !filterMaxTotal || total <= parseFloat(filterMaxTotal);
    const created = o.created_at.slice(0, 10);
    const matchStart = !filterStartDate || created >= filterStartDate;
    const matchEnd = !filterEndDate || created <= filterEndDate;
    return matchSearch && matchStatus && matchMin && matchMax && matchStart && matchEnd;
  });

  // Counts by status for quick summary
  const statusCounts = (orders.data ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <h3 className="page-title">Gerenciar pedidos</h3>

      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {/* Status pills summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
              filterStatus === status
                ? "ring-2 ring-brand-pink-deep"
                : "opacity-80 hover:opacity-100"
            } ${ORDER_STATUS_COLORS[status as OrderStatus]}`}
          >
            {label} {statusCounts[status] ? `(${statusCounts[status]})` : "(0)"}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="rounded-xl border border-brand-pink/20 bg-brand-pink/5 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Filtros avançados</p>
        <div className="flex flex-wrap gap-3">
          <Input label="Buscar (nº pedido)" value={search}
            onChange={(e) => setSearch(e.target.value)} className="min-w-[160px]" placeholder="#número..." />
          <Select label="Status" value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)} options={statusOptions} />
          <Input label="Total mínimo (R$)" type="number" step="0.01" value={filterMinTotal}
            onChange={(e) => setFilterMinTotal(e.target.value)} className="w-36" />
          <Input label="Total máximo (R$)" type="number" step="0.01" value={filterMaxTotal}
            onChange={(e) => setFilterMaxTotal(e.target.value)} className="w-36" />
          <Input label="Data início" type="date" value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)} />
          <Input label="Data fim" type="date" value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)} />
          <div className="flex items-end">
            <Button variant="ghost" className="text-xs" onClick={() => {
              setSearch(""); setFilterStatus(""); setFilterMinTotal("");
              setFilterMaxTotal(""); setFilterStartDate(""); setFilterEndDate("");
            }}>Limpar filtros</Button>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {filtered.length} pedido{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}.
        Clique em um pedido para ver detalhes.
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Total</th>
              <th className="px-4 py-3 text-left">Itens</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className="cursor-pointer border-t border-gray-100 transition hover:bg-brand-pink/10"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.number}</td>
                <td className="px-4 py-3">{formatDate(o.created_at)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 font-semibold text-brand-pink-deep">{formatCurrency(o.total)}</td>
                <td className="px-4 py-3">{o.items.length} {o.items.length === 1 ? "item" : "itens"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.isLoading && <p className="p-4 text-center text-sm text-gray-400">Carregando...</p>}
        {!orders.isLoading && filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">Nenhum pedido encontrado.</p>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Pedido #${selectedOrder?.number}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-brand-pink/10 p-3 text-center">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-brand-pink-deep">{formatCurrency(selectedOrder.total)}</p>
              </div>
              <div className="rounded-xl bg-gray-100 p-3 text-center">
                <p className="text-xs text-gray-500">Status</p>
                <div className="flex justify-center mt-1"><StatusBadge status={selectedOrder.status} /></div>
              </div>
              <div className="rounded-xl bg-brand-yellow/30 p-3 text-center">
                <p className="text-xs text-gray-500">Itens</p>
                <p className="text-lg font-bold text-yellow-800">{selectedOrder.items.length}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-xs text-gray-500">Data</p>
                <p className="text-sm font-semibold text-blue-700">{selectedOrder.created_at.slice(0, 10)}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-600">Itens do pedido</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Produto</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Qtd</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Preço unit.</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-xs text-gray-500">ID #{item.product_id}</td>
                      <td className="px-3 py-2">{item.quantity}</td>
                      <td className="px-3 py-2">{formatCurrency(item.unit_price)}</td>
                      <td className="px-3 py-2 font-semibold">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Status history */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-600">Histórico de status</h4>
              <ul className="space-y-1">
                {selectedOrder.status_history.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 text-sm">
                    <StatusBadge status={h.status} />
                    <span className="text-gray-500">{formatDate(h.changed_at)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-gray-100 pt-4">
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Remover pedido #${selectedOrder.number}?`))
                    deleteMutation.mutate(selectedOrder.id);
                }}
                loading={deleteMutation.isPending}
              >🗑️ Excluir pedido</Button>
              <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="ml-auto">Fechar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
