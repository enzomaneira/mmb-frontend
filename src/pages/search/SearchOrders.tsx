import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  type Order, type OrderStatus, type SortOrder
} from "../../types";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SortToggle } from "../../components/ui/SortToggle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";

interface ItemForm {
  product_id: string;
  quantity: string;
  unit_price: string;
  search: string; // ← busca exclusiva de cada item
}

function newEditItem(): ItemForm {
  return { product_id: "", quantity: "1", unit_price: "", search: "" };
}

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

function toDateInput(iso: string | Date | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SearchOrders() {
  const queryClient = useQueryClient();

  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [activeStatuses, setActiveStatuses] = useState<Set<OrderStatus>>(new Set());
  const [searchNumber, setSearchNumber] = useState("");
  const [minItems, setMinItems] = useState("");
  const [maxItems, setMaxItems] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState<Order | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editCustomerId, setEditCustomerId] = useState("");
  const [editCustomerSearch, setEditCustomerSearch] = useState("");
  const [editCreatedAt, setEditCreatedAt] = useState("");
  const [editCreatedAtError, setEditCreatedAtError] = useState("");
  const [editItems, setEditItems] = useState<ItemForm[]>([]);
  const [editActiveTab, setEditActiveTab] = useState(0);

  const query = useQuery({
    queryKey: ["orders-search", minTotal, maxTotal, startDate, endDate, sortBy, sortOrder],
    queryFn: () =>
      api.orders.list({
        min_total: minTotal ? Number(minTotal) : undefined,
        max_total: maxTotal ? Number(maxTotal) : undefined,
        start_date: startDate ? `${startDate}T00:00:00` : undefined,
        end_date: endDate ? `${endDate}T23:59:59` : undefined,
        sort_by: sortBy, sort_order: sortOrder,
      }),
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

  const updateMutation = useMutation({
    mutationFn: () =>
      api.orders.update(selected!.id, {
        customer_id: editCustomerId ? Number(editCustomerId) : undefined,
        created_at: editCreatedAt ? `${editCreatedAt}T12:00:00` : undefined,
        items: editItems.map((i) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
          unit_price: i.unit_price !== "" ? Number(i.unit_price) : undefined,
        })),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-search"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      setSelected(updated);
      setMode("view");
      setMessage({ type: "success", text: "Pedido atualizado com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.orders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-search"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      setSelected(null);
      setMessage({ type: "success", text: "Pedido removido com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const toggleStatus = (s: OrderStatus) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const openView = (o: Order) => { setSelected(o); setMode("view"); setMessage(null); };

  const openEdit = (order: Order) => {
    setSelected(order);
    setEditCustomerId(String(order.customer_id));
    setEditCustomerSearch(customerMap.get(order.customer_id)?.name ?? "");
    setEditCreatedAt(toDateInput(order.created_at));
    setEditCreatedAtError("");
    setEditActiveTab(0);
    setEditItems(order.items.map((item) => ({
      product_id: String(item.product_id),
      quantity: String(item.quantity),
      unit_price: item.unit_price,
      search: "",
    })));
    setMode("edit");
    setMessage(null);
  };

  const addItem = () => {
    setEditItems([...editItems, newEditItem()]);
    setEditActiveTab(editItems.length); // vai direto para a nova aba
  };

  const removeItem = (index: number) => {
    if (editItems.length === 1) return;
    const next = editItems.filter((_, i) => i !== index);
    setEditItems(next);
    setEditActiveTab(Math.min(editActiveTab, next.length - 1));
  };

  const updateItem = (index: number, field: keyof ItemForm, value: string) => {
    const next = editItems.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    // Auto-preenche preço ao selecionar produto
    if (field === "product_id" && value) {
      const product = products.data?.find((p) => String(p.id) === value);
      if (product && next[index].unit_price === "") next[index] = { ...next[index], unit_price: product.price };
    }
    setEditItems(next);
  };

  const adjustQty = (index: number, delta: number) => {
    updateItem(index, "quantity", String(Math.max(1, Number(editItems[index].quantity) + delta)));
  };

  const clearFilters = () => {
    setMinTotal(""); setMaxTotal(""); setStartDate(""); setEndDate("");
    setSearchNumber(""); setMinItems(""); setMaxItems(""); setActiveStatuses(new Set());
  };

  const filteredCustomerOptions = (customers.data ?? [])
    .filter((c) =>
      !editCustomerSearch ||
      c.name.toLowerCase().includes(editCustomerSearch.toLowerCase()) ||
      String(c.number).includes(editCustomerSearch),
    )
    .slice(0, 50);

  const getFilteredProducts = (itemSearch: string) =>
    (products.data ?? []).filter(
      (p) =>
        !itemSearch ||
        p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        String(p.number).includes(itemSearch),
    ).slice(0, 100);

  const getProductOptions = (itemSearch: string) => {
    const filtered = getFilteredProducts(itemSearch);
    return [
      { value: "", label: itemSearch && filtered.length === 0 ? "Nenhum produto encontrado" : "Selecione um produto...", disabled: true },
      ...filtered.map((p) => ({
        value: String(p.id),
        label: `#${p.number} — ${p.name} · ${formatCurrency(p.price)}`,
      })),
    ];
  };

  const filtered = (query.data ?? []).filter((o) => {
    if (activeStatuses.size > 0 && !activeStatuses.has(o.status)) return false;
    if (searchNumber && !String(o.number).includes(searchNumber)) return false;
    if (minItems && o.items.length < parseInt(minItems)) return false;
    if (maxItems && o.items.length > parseInt(maxItems)) return false;
    return true;
  });

  const totalValue = filtered.reduce((s, o) => s + parseFloat(o.total), 0);
  const avgValue = filtered.length > 0 ? totalValue / filtered.length : 0;
  const activeFilterCount =
    [minTotal, maxTotal, startDate, endDate, searchNumber, minItems, maxItems].filter(Boolean).length +
    activeStatuses.size;

  // ─── Item ativo na edição ──────────────────────────────────────────────────
  const activeEditItem = editItems[editActiveTab];
  const activeEditProduct = products.data?.find((p) => String(p.id) === activeEditItem?.product_id);
  const activeEditSubtotal =
    activeEditItem
      ? (activeEditItem.unit_price !== ""
          ? parseFloat(activeEditItem.unit_price)
          : parseFloat(activeEditProduct?.price ?? "0")) * Number(activeEditItem.quantity || 0)
      : 0;

  // Total estimado na edição
  const editEstimatedTotal = editItems.reduce((sum, item) => {
    const prod = products.data?.find((p) => String(p.id) === item.product_id);
    const price = item.unit_price !== "" ? parseFloat(item.unit_price) : parseFloat(prod?.price ?? "0");
    return sum + price * Number(item.quantity || 0);
  }, 0);

  return (
    <div className="space-y-5">
      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="page-title">Buscar pedidos</h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition border ${
            showFilters
              ? "border-brand-pink-deep bg-brand-pink/10 text-brand-pink-deep"
              : "border-gray-200 text-gray-600 hover:border-brand-pink/40"
          }`}
        >
          🔧 Filtros avançados
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-brand-pink-deep px-1.5 py-0.5 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
              activeStatuses.has(s) ? "ring-2 ring-offset-1 ring-brand-pink-deep" : "opacity-75 hover:opacity-100"
            } ${ORDER_STATUS_COLORS[s]}`}
          >
            {ORDER_STATUS_LABELS[s]}
          </button>
        ))}
        {activeStatuses.size > 0 && (
          <button
            onClick={() => setActiveStatuses(new Set())}
            className="rounded-full px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            ✕ Limpar status
          </button>
        )}
      </div>

      {/* Primary search row */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Número do pedido"
          value={searchNumber}
          onChange={(e) => setSearchNumber(e.target.value)}
          className="w-40"
          placeholder="#..."
        />
        <Select
          label="Ordenar por"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "created_at", label: "Data" },
            { value: "total", label: "Total" },
            { value: "number", label: "Número" },
            { value: "status", label: "Status" },
          ]}
        />
        <div className="flex items-end"><SortToggle value={sortOrder} onChange={setSortOrder} /></div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="rounded-xl border border-brand-pink/20 bg-brand-pink/5 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Filtros avançados</p>
          <div className="flex flex-wrap gap-3">
            <Input label="Valor mín. (R$)" type="number" step="0.01" value={minTotal}
              onChange={(e) => setMinTotal(e.target.value)} className="w-36" />
            <Input label="Valor máx. (R$)" type="number" step="0.01" value={maxTotal}
              onChange={(e) => setMaxTotal(e.target.value)} className="w-36" />
            <Input label="Data início" type="date" value={startDate}
              onChange={(e) => setStartDate(e.target.value)} />
            <Input label="Data fim" type="date" value={endDate}
              onChange={(e) => setEndDate(e.target.value)} />
            <Input label="Mín. itens" type="number" min={0} value={minItems}
              onChange={(e) => setMinItems(e.target.value)} className="w-28" />
            <Input label="Máx. itens" type="number" min={0} value={maxItems}
              onChange={(e) => setMaxItems(e.target.value)} className="w-28" />
            <div className="flex items-end">
              <Button variant="ghost" className="text-xs" onClick={clearFilters}>Limpar tudo</Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex gap-4 rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <span className="text-gray-500">{filtered.length} pedido{filtered.length !== 1 ? "s" : ""}</span>
          <span className="text-gray-400">|</span>
          <span className="font-semibold text-brand-pink-deep">Total: {formatCurrency(totalValue)}</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">Média: {formatCurrency(avgValue)}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Itens</th>
              <th className="px-4 py-3 text-left">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr
                key={o.id}
                onClick={() => openView(o)}
                className="cursor-pointer border-t border-gray-100 hover:bg-brand-pink/10 transition"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.number}</td>
                <td className="px-4 py-3">{customerMap.get(o.customer_id)?.name ?? `Cliente #${o.customer_id}`}</td>
                <td className="px-4 py-3">{formatDate(o.created_at)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3">{o.items.length}</td>
                <td className="px-4 py-3 font-semibold text-brand-pink-deep">{formatCurrency(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.isLoading && <p className="p-4 text-center text-sm text-gray-400">Carregando...</p>}
        {!query.isLoading && filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">Nenhum pedido encontrado.</p>
        )}
      </div>

      {/* Detail / Edit Modal */}
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setMode("view"); }}
        title={mode === "edit" ? `✏️ Editando pedido #${selected?.number}` : `📦 Pedido #${selected?.number}`}
        size="xl"
      >
        {/* VIEW MODE */}
        {selected && mode === "view" && (
          <div className="space-y-5">
            {customerMap.get(selected.customer_id) && (
              <div className="rounded-xl bg-brand-yellow/20 px-4 py-3">
                <p className="text-xs text-gray-500 font-medium">Cliente</p>
                <p className="font-semibold text-brand-pink-deep">
                  {customerMap.get(selected.customer_id)!.name}
                </p>
                <p className="text-sm text-gray-600">
                  {customerMap.get(selected.customer_id)!.phone ?? ""}
                  {customerMap.get(selected.customer_id)!.email
                    ? ` · ${customerMap.get(selected.customer_id)!.email}`
                    : ""}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-brand-pink/10 p-3 text-center">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-brand-pink-deep">{formatCurrency(selected.total)}</p>
              </div>
              <div className="rounded-xl bg-gray-100 p-3 text-center">
                <p className="text-xs text-gray-500">Status</p>
                <div className="flex justify-center mt-1"><StatusBadge status={selected.status} /></div>
              </div>
              <div className="rounded-xl bg-brand-yellow/30 p-3 text-center">
                <p className="text-xs text-gray-500">Itens</p>
                <p className="text-lg font-bold text-yellow-800">{selected.items.length}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-xs text-gray-500">Criado em</p>
                <p className="text-xs font-semibold text-blue-700">{formatDate(selected.created_at)}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-600">Itens</h4>
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
                  {selected.items.map((item) => (
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

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-600">Histórico de status</h4>
              <ul className="space-y-1">
                {selected.status_history.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 text-sm">
                    <StatusBadge status={h.status} />
                    <span className="text-gray-500">{formatDate(h.changed_at)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 border-t border-gray-100 pt-4">
              <Button variant="secondary" onClick={() => openEdit(selected)}>✏️ Editar pedido</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Remover pedido #${selected.number}? Esta ação não pode ser desfeita.`))
                    deleteMutation.mutate(selected.id);
                }}
                loading={deleteMutation.isPending}
              >
                🗑️ Excluir pedido
              </Button>
              <Button variant="ghost" onClick={() => { setSelected(null); setMode("view"); }} className="ml-auto">
                Fechar
              </Button>
            </div>
          </div>
        )}

        {/* EDIT MODE */}
        {selected && mode === "edit" && (
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-5">
            {message && (
              <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
            )}

            {/* Cliente */}
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
                    onClick={() => { setEditCustomerId(String(c.id)); setEditCustomerSearch(c.name); }}
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

            {/* Data */}
            <Input
              label="Data de cadastro do pedido"
              icon="📅"
              type="date"
              required
              value={editCreatedAt}
              error={editCreatedAtError}
              hint="Data em que o pedido foi realizado"
              onChange={(e) => { setEditCreatedAt(e.target.value); if (editCreatedAtError) setEditCreatedAtError(""); }}
            />

            {/* Itens com abas independentes */}
            <div className="rounded-2xl border border-brand-pink/20 bg-white shadow-sm">
              {/* Cabeçalho */}
              <div className="flex items-center gap-2 border-b border-brand-pink/10 px-4 pt-4 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-sm">📋</span>
                <p className="text-sm font-semibold text-brand-pink-deep">Itens do pedido</p>
                <span className="ml-auto text-xs text-gray-400">{editItems.length} item{editItems.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Abas de navegação */}
              <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-100 bg-gray-50/60 px-3 py-2 scrollbar-none">
                {editItems.map((item, idx) => {
                  const prod = products.data?.find((p) => String(p.id) === item.product_id);
                  const isActive = editActiveTab === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditActiveTab(idx)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap
                        ${isActive
                          ? "bg-white shadow-sm border border-brand-pink/30 text-brand-pink-deep"
                          : "text-gray-500 hover:bg-white hover:text-gray-700"
                        }`}
                    >
                      {prod ? <span>🧸</span> : <span className="opacity-40">○</span>}
                      <span>
                        {prod
                          ? prod.name.length > 18
                            ? prod.name.slice(0, 18) + "…"
                            : prod.name
                          : `Item ${idx + 1}`}
                      </span>
                      {isActive && editItems.length > 1 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); removeItem(idx); } }}
                          className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 transition cursor-pointer"
                          title="Remover item"
                        >
                          ✕
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Botão nova aba */}
                <button
                  type="button"
                  onClick={addItem}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-brand-pink/40 px-3 py-1.5 text-xs font-semibold text-brand-pink-deep hover:border-brand-pink hover:bg-brand-pink/5 transition"
                >
                  <span className="text-base leading-none">+</span>
                  Novo item
                </button>
              </div>

              {/* Conteúdo da aba ativa */}
              {activeEditItem && (
                <div className="p-4 space-y-4">

                  {/* Busca exclusiva do item */}
                  <Input
                    label={`🔍 Buscar produto para o Item ${editActiveTab + 1}`}
                    type="text"
                    placeholder="Digite o nome do produto..."
                    value={activeEditItem.search}
                    hint={`${getFilteredProducts(activeEditItem.search).length} produto${getFilteredProducts(activeEditItem.search).length !== 1 ? "s" : ""} encontrado${getFilteredProducts(activeEditItem.search).length !== 1 ? "s" : ""}`}
                    onChange={(e) => updateItem(editActiveTab, "search", e.target.value)}
                  />

                  {/* Seleção do produto */}
                  <div>
                    <Select
                      label="Produto" icon="🧸" required
                      value={activeEditItem.product_id}
                      onChange={(e) => updateItem(editActiveTab, "product_id", e.target.value)}
                      options={getProductOptions(activeEditItem.search)}
                    />
                    {activeEditProduct && (
                      <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                        <span className="font-medium text-gray-700">Preço original:</span>
                        <span className="font-bold text-brand-pink-deep">{formatCurrency(activeEditProduct.price)}</span>
                        <span className="mx-1 text-gray-300">·</span>
                        <span className="text-gray-500">Estoque:</span>
                        <span className={`font-bold ${activeEditProduct.stock_quantity === 0 ? "text-red-600" : activeEditProduct.stock_quantity <= 3 ? "text-yellow-600" : "text-green-600"}`}>
                          {activeEditProduct.stock_quantity} un.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Preço e Quantidade */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Preço unitário" icon="💲" type="number" min={0} step="0.01"
                      prefix="R$"
                      placeholder={activeEditProduct ? String(parseFloat(activeEditProduct.price).toFixed(2)) : "0,00"}
                      hint="Deixe vazio para usar o preço do produto"
                      value={activeEditItem.unit_price}
                      onChange={(e) => updateItem(editActiveTab, "unit_price", e.target.value.replace(/[^0-9.]/g, ""))}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                        <span className="text-base leading-none">🔢</span>
                        Quantidade
                        <span className="text-brand-pink-deep">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => adjustQty(editActiveTab, -1)}
                          disabled={Number(activeEditItem.quantity) <= 1}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand-pink/40 bg-white text-lg font-bold text-brand-pink-deep shadow-sm transition hover:border-brand-pink hover:bg-brand-pink/10 active:scale-95 disabled:opacity-40">
                          −
                        </button>
                        <input
                          type="number" min={1} required
                          value={activeEditItem.quantity}
                          onChange={(e) => updateItem(editActiveTab, "quantity", e.target.value.replace(/[^0-9]/g, "") || "1")}
                          className="min-w-0 flex-1 rounded-xl border-2 border-brand-pink/40 bg-white px-4 py-2.5 text-center text-sm font-bold shadow-sm outline-none transition hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                        <button type="button" onClick={() => adjustQty(editActiveTab, 1)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand-pink/40 bg-white text-lg font-bold text-brand-pink-deep shadow-sm transition hover:border-brand-pink hover:bg-brand-pink/10 active:scale-95">
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subtotal do item ativo */}
                  {activeEditSubtotal > 0 && (
                    <div className="flex items-center justify-end gap-2 rounded-xl bg-brand-pink/5 px-4 py-2">
                      <span className="text-xs text-gray-500">Subtotal deste item:</span>
                      <span className="font-bold text-brand-pink-deep">{formatCurrency(activeEditSubtotal)}</span>
                    </div>
                  )}

                  {/* Navegação entre abas */}
                  {editItems.length > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <button type="button" onClick={() => setEditActiveTab((t) => Math.max(0, t - 1))}
                        disabled={editActiveTab === 0}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition">
                        ← Item anterior
                      </button>
                      <span className="text-xs text-gray-400">
                        {editActiveTab + 1} / {editItems.length}
                      </span>
                      <button type="button" onClick={() => setEditActiveTab((t) => Math.min(editItems.length - 1, t + 1))}
                        disabled={editActiveTab === editItems.length - 1}
                        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition">
                        Próximo item →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {editItems.length === 0 && (
                <p className="p-4 text-center text-sm text-gray-400">
                  Nenhum item. Clique em "+ Novo item".
                </p>
              )}
            </div>

            {/* Total estimado na edição */}
            {editEstimatedTotal > 0 && (
              <div className="flex items-center justify-between rounded-xl border-2 border-brand-pink/30 bg-gradient-to-r from-brand-pink/10 to-brand-yellow/10 px-5 py-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-500">Total estimado</p>
                  <div className="space-y-0.5">
                    {editItems.map((item, idx) => {
                      const prod = products.data?.find((p) => String(p.id) === item.product_id);
                      if (!prod) return null;
                      const price = item.unit_price !== "" ? parseFloat(item.unit_price) : parseFloat(prod.price);
                      const sub = price * Number(item.quantity || 0);
                      return (
                        <p key={idx} className="text-xs text-gray-500">
                          Item {idx + 1}: {prod.name} × {item.quantity} = {formatCurrency(sub)}
                        </p>
                      );
                    })}
                  </div>
                </div>
                <span className="text-xl font-bold text-brand-pink-deep">{formatCurrency(editEstimatedTotal)}</span>
              </div>
            )}

            <div className="flex gap-2 border-t border-gray-100 pt-4">
              <Button
                type="submit"
                loading={updateMutation.isPending}
                disabled={!editCustomerId || editItems.length === 0 || editItems.some((i) => !i.product_id)}
              >
                💾 Salvar alterações
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode("view")}>Cancelar</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
