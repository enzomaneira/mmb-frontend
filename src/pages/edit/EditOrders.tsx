import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  type Order, type OrderStatus, type SortOrder,
} from "../../types";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SortToggle } from "../../components/ui/SortToggle";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/StatusBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemForm {
  product_id: string;
  quantity: string;
  unit_price: string;
}

const statusOptions = [
  { value: "", label: "Todos os status" },
  ...Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
];

// ─── Component ────────────────────────────────────────────────────────────────

export function EditOrders() {
  const queryClient = useQueryClient();

  // List filters / sort
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMinTotal, setFilterMinTotal] = useState("");
  const [filterMaxTotal, setFilterMaxTotal] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit form
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editCustomerSearch, setEditCustomerSearch] = useState("");
  const [editItems, setEditItems] = useState<ItemForm[]>([]);
  const [editProductSearch, setEditProductSearch] = useState("");

  // ─── Queries ────────────────────────────────────────────────────────────────

  const orders = useQuery({
    queryKey: ["orders", sortBy, sortOrder],
    queryFn: () => api.orders.list({ sort_by: sortBy, sort_order: sortOrder }),
  });

  const customers = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => api.customers.list({ sort_by: "name" }),
  });
  const customerMap = new Map(customers.data?.map((c) => [c.id, c]) ?? []);

  const products = useQuery({
    queryKey: ["products-list"],
    queryFn: () => api.products.list({ sort_by: "name" }),
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: () =>
      api.orders.update(selectedOrder!.id, {
        customer_id: editCustomerId ? Number(editCustomerId) : undefined,
        items: editItems.map((i) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
          unit_price: i.unit_price !== "" ? Number(i.unit_price) : undefined,
        })),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      setSelectedOrder(updated);
      setMode("view");
      setMessage({ type: "success", text: "Pedido atualizado com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.orders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      setSelectedOrder(null);
      setMessage({ type: "success", text: "Pedido removido com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const filtered = (orders.data ?? []).filter((o) => {
    const customerName = customerMap.get(o.customer_id)?.name?.toLowerCase() ?? "";
    const matchSearch =
      String(o.number).includes(search) ||
      customerName.includes(search.toLowerCase());
    const matchStatus = !filterStatus || o.status === filterStatus;
    const total = parseFloat(o.total);
    const matchMin = !filterMinTotal || total >= parseFloat(filterMinTotal);
    const matchMax = !filterMaxTotal || total <= parseFloat(filterMaxTotal);
    const created = o.created_at.slice(0, 10);
    const matchStart = !filterStartDate || created >= filterStartDate;
    const matchEnd = !filterEndDate || created <= filterEndDate;
    return matchSearch && matchStatus && matchMin && matchMax && matchStart && matchEnd;
  });

  // Summary stats per status
  const statusCounts = (orders.data ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  // ─── Edit helpers ────────────────────────────────────────────────────────────

  const openEdit = (order: Order) => {
    setSelectedOrder(order);
    setEditCustomerId(String(order.customer_id));
    setEditCustomerSearch(customerMap.get(order.customer_id)?.name ?? "");
    setEditProductSearch("");
    setEditItems(
      order.items.map((item) => ({
        product_id: String(item.product_id),
        quantity: String(item.quantity),
        unit_price: item.unit_price,
      })),
    );
    setMode("edit");
    setMessage(null);
  };

  const addItem = () =>
    setEditItems([...editItems, { product_id: "", quantity: "1", unit_price: "" }]);

  const removeItem = (index: number) =>
    setEditItems(editItems.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof ItemForm, value: string) =>
    setEditItems(editItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  // When a product is selected, auto-fill its price
  const handleProductChange = (index: number, productId: string) => {
    const product = products.data?.find((p) => String(p.id) === productId);
    updateItem(index, "product_id", productId);
    if (product && editItems[index].unit_price === "") {
      updateItem(index, "unit_price", product.price);
    }
  };

  // ─── Filtered options for customer/product selects ──────────────────────────

  const filteredCustomerOptions = (customers.data ?? [])
    .filter(
      (c) =>
        !editCustomerSearch ||
        c.name.toLowerCase().includes(editCustomerSearch.toLowerCase()) ||
        String(c.number).includes(editCustomerSearch),
    )
    .slice(0, 50);

  const filteredProductOptions = (products.data ?? [])
    .filter(
      (p) =>
        !editProductSearch ||
        p.name.toLowerCase().includes(editProductSearch.toLowerCase()) ||
        String(p.number).includes(editProductSearch),
    )
    .slice(0, 50);

  // ─── JSX ─────────────────────────────────────────────────────────────────────

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
              filterStatus === status ? "ring-2 ring-brand-pink-deep" : "opacity-80 hover:opacity-100"
            } ${ORDER_STATUS_COLORS[status as OrderStatus]}`}
          >
            {label} ({statusCounts[status] ?? 0})
          </button>
        ))}
      </div>

      {/* Filters + Sort */}
      <div className="rounded-xl border border-brand-pink/20 bg-brand-pink/5 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Filtros e ordenação</p>
        <div className="flex flex-wrap gap-3 items-end">
          <Input
            label="Buscar (nº pedido ou cliente)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[200px]"
            placeholder="#número ou nome..."
          />
          <Select
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={statusOptions}
          />
          <Input label="Total mínimo (R$)" type="number" step="0.01" value={filterMinTotal}
            onChange={(e) => setFilterMinTotal(e.target.value)} className="w-36" />
          <Input label="Total máximo (R$)" type="number" step="0.01" value={filterMaxTotal}
            onChange={(e) => setFilterMaxTotal(e.target.value)} className="w-36" />
          <Input label="Data início" type="date" value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)} />
          <Input label="Data fim" type="date" value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)} />
          <Select
            label="Ordenar por"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: "created_at", label: "Data" },
              { value: "number", label: "Número do pedido" },
              { value: "total", label: "Total" },
              { value: "status", label: "Status" },
            ]}
          />
          <div className="flex items-end">
            <SortToggle value={sortOrder} onChange={setSortOrder} />
          </div>
          <div className="flex items-end">
            <Button variant="ghost" className="text-xs" onClick={() => {
              setSearch(""); setFilterStatus(""); setFilterMinTotal("");
              setFilterMaxTotal(""); setFilterStartDate(""); setFilterEndDate("");
            }}>
              Limpar filtros
            </Button>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {filtered.length} pedido{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}.
        Clique para ver detalhes.
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Cliente</th>
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
                onClick={() => { setSelectedOrder(o); setMode("view"); setMessage(null); }}
                className="cursor-pointer border-t border-gray-100 transition hover:bg-brand-pink/10"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.number}</td>
                <td className="px-4 py-3 text-gray-700">
                  {customerMap.get(o.customer_id)?.name ?? `Cliente #${o.customer_id}`}
                </td>
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

      {/* Detail / Edit Modal */}
      <Modal
        open={!!selectedOrder}
        onClose={() => { setSelectedOrder(null); setMode("view"); }}
        title={
          mode === "edit"
            ? `Editando pedido #${selectedOrder?.number}`
            : `Pedido #${selectedOrder?.number}`
        }
        size="xl"
      >
        {/* ── VIEW MODE ──────────────────────────────────────────────────────── */}
        {selectedOrder && mode === "view" && (
          <div className="space-y-5">
            {/* Customer */}
            {customerMap.get(selectedOrder.customer_id) && (
              <div className="rounded-xl bg-brand-yellow/20 px-4 py-3">
                <p className="text-xs text-gray-500 font-medium">Cliente</p>
                <p className="font-semibold text-brand-pink-deep">
                  {customerMap.get(selectedOrder.customer_id)!.name}
                </p>
                {customerMap.get(selectedOrder.customer_id)!.phone && (
                  <p className="text-sm text-gray-600">
                    {customerMap.get(selectedOrder.customer_id)!.phone}
                  </p>
                )}
              </div>
            )}

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
                <p className="text-sm font-semibold text-blue-700">{formatDate(selectedOrder.created_at)}</p>
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
                      <td className="px-3 py-2">
                        <span className="font-medium text-sm text-gray-800">
                          {item.product_name || (item.product_id ? `Produto #${item.product_id}` : `Item #${item.id}`)}
                        </span>
                        {item.product_number != null && (
                          <span className="ml-1 text-xs text-gray-400">#{item.product_number}</span>
                        )}
                      </td>
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
              <Button variant="secondary" onClick={() => openEdit(selectedOrder)}>
                ✏️ Editar pedido
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Remover pedido #${selectedOrder.number}?`))
                    deleteMutation.mutate(selectedOrder.id);
                }}
                loading={deleteMutation.isPending}
              >
                🗑️ Excluir pedido
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setSelectedOrder(null); setMode("view"); }}
                className="ml-auto"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}

        {/* ── EDIT MODE ──────────────────────────────────────────────────────── */}
        {selectedOrder && mode === "edit" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-5"
          >
            {message && (
              <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
            )}

            {/* Customer selection */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">Cliente</p>
              <Input
                placeholder="Buscar cliente por nome ou número..."
                value={editCustomerSearch}
                onChange={(e) => setEditCustomerSearch(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto rounded-xl border border-brand-pink/20">
                {filteredCustomerOptions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setEditCustomerId(String(c.id));
                      setEditCustomerSearch(c.name);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition hover:bg-brand-pink/10 ${
                      editCustomerId === String(c.id)
                        ? "bg-brand-pink/20 font-semibold text-brand-pink-deep"
                        : "text-gray-700"
                    }`}
                  >
                    #{c.number} — {c.name}
                  </button>
                ))}
              </div>
              {editCustomerId && (
                <p className="text-xs text-green-600 font-medium">
                  ✓ Cliente selecionado: {customerMap.get(Number(editCustomerId))?.name}
                </p>
              )}
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Itens do pedido</p>
                <Button type="button" variant="secondary" onClick={addItem} className="text-xs px-3 py-1.5">
                  + Adicionar item
                </Button>
              </div>

              {/* Product search filter */}
              <Input
                placeholder="Filtrar produtos por nome ou número..."
                value={editProductSearch}
                onChange={(e) => setEditProductSearch(e.target.value)}
              />

              {editItems.map((item, index) => {
                const selectedProduct = products.data?.find(
                  (p) => String(p.id) === item.product_id,
                );
                return (
                  <div
                    key={index}
                    className="rounded-xl border border-brand-pink/20 bg-brand-pink/5 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">
                        Item {index + 1}
                        {selectedProduct && (
                          <span className="ml-2 text-brand-pink-deep">
                            — {selectedProduct.name}
                          </span>
                        )}
                      </span>
                      {editItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          ✕ Remover
                        </button>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      {/* Product select */}
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Produto <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={item.product_id}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          className="w-full rounded-xl border-2 border-brand-pink/40 bg-white px-3 py-2 text-sm outline-none focus:border-brand-pink-deep"
                        >
                          <option value="">Selecione um produto...</option>
                          {filteredProductOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              #{p.number} — {p.name} (R$ {p.price})
                            </option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="Quantidade"
                        type="number"
                        min={1}
                        required
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      />
                      <Input
                        label="Preço unitário (R$)"
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                        hint="Deixe vazio para usar o preço do produto"
                      />
                      {item.product_id && item.quantity && item.unit_price && (
                        <div className="flex items-end pb-2">
                          <p className="text-xs text-gray-500">
                            Subtotal:{" "}
                            <span className="font-semibold text-brand-pink-deep">
                              {formatCurrency(
                                Number(item.unit_price) * Number(item.quantity),
                              )}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {editItems.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">
                  Nenhum item. Clique em "+ Adicionar item".
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-gray-100 pt-4">
              <Button
                type="submit"
                loading={updateMutation.isPending}
                disabled={!editCustomerId || editItems.length === 0 || editItems.some((i) => !i.product_id)}
              >
                💾 Salvar alterações
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode("view")}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
