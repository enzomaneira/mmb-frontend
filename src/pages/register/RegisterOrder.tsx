import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type OrderStatus } from "../../types";
import { formatCurrency } from "../../lib/format";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

interface OrderItemForm {
  product_id: string;
  quantity: string;
  unit_price: string;
  search: string; // ← busca exclusiva de cada item
}

const STATUS_ICONS: Record<OrderStatus, string> = {
  PENDING: "⏳",
  IN_PROGRESS: "⚙️",
  READY: "✅",
  DELIVERED: "📦",
  PAID: "💰",
  CANCELED: "❌",
};

const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
  value,
  label: `${STATUS_ICONS[value as OrderStatus]} ${label}`,
}));

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function newItem(): OrderItemForm {
  return { product_id: "", quantity: "1", unit_price: "", search: "" };
}

export function RegisterOrder() {
  const queryClient = useQueryClient();
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.customers.list({ sort_by: "name" }) });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.products.list({ sort_by: "name" }) });

  const [number, setNumber] = useState("");
  const [numberError, setNumberError] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerError, setCustomerError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus>("PENDING");
  const [createdAt, setCreatedAt] = useState(todayLocal());
  const [createdAtError, setCreatedAtError] = useState("");
  const [items, setItems] = useState<OrderItemForm[]>([newItem()]);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState(0); // ← aba ativa
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const orders = useQuery({
    queryKey: ["orders-count"],
    queryFn: () => api.orders.list({ sort_by: "number", sort_order: "desc" }),
    staleTime: 30_000,
  });
  const nextNumber =
    orders.data && orders.data.length > 0
      ? Math.max(...orders.data.map((o) => o.number)) + 1
      : 1;

  const mutation = useMutation({
    mutationFn: () =>
      api.orders.create({
        number: Number(number),
        customer_id: Number(customerId),
        status,
        created_at: createdAt ? `${createdAt}T12:00:00` : undefined,
        items: items.map((i) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
          unit_price: i.unit_price !== "" ? Number(i.unit_price) : undefined,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-count"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setMessage({ type: "success", text: `✅ Pedido #${number} cadastrado com sucesso!` });
      setNumber("");
      setCustomerId("");
      setCustomerSearch("");
      setStatus("PENDING");
      setCreatedAt(todayLocal());
      setItems([newItem()]);
      setItemErrors({});
      setActiveTab(0);
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  // ─── Cliente ───────────────────────────────────────────────────────────────
  const filteredCustomers = (customers.data ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      String(c.number).includes(customerSearch) ||
      (c.phone ?? "").includes(customerSearch),
  );
  const selectedCustomer = customers.data?.find((c) => String(c.id) === customerId);
  const customerOptions = [
    { value: "", label: customerSearch ? "Nenhum cliente encontrado" : "Selecione um cliente", disabled: true },
    ...filteredCustomers.map((c) => ({
      value: String(c.id),
      label: `#${c.number} — ${c.name}${c.phone ? ` · ${c.phone}` : ""}`,
    })),
  ];

  // ─── Itens ─────────────────────────────────────────────────────────────────
  // Produtos filtrados para cada aba (usa o campo search do próprio item)
  const getFilteredProducts = (itemSearch: string) =>
    (products.data ?? []).filter(
      (p) =>
        !itemSearch ||
        p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        String(p.number).includes(itemSearch),
    );

  const getProductOptions = (itemSearch: string) => {
    const filtered = getFilteredProducts(itemSearch);
    return [
      { value: "", label: itemSearch && filtered.length === 0 ? "Nenhum produto encontrado" : "Selecione um produto", disabled: true },
      ...filtered.map((p) => ({
        value: String(p.id),
        label: `#${p.number} — ${p.name} · ${formatCurrency(p.price)}${p.stock_quantity === 0 ? " ⚠️ Sem estoque" : ""}`,
      })),
    ];
  };

  const updateItem = (idx: number, field: keyof OrderItemForm, value: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    // Auto-preenche preço ao selecionar produto
    if (field === "product_id" && value) {
      const product = products.data?.find((p) => p.id === Number(value));
      if (product) next[idx].unit_price = String(product.price);
    }
    setItems(next);
    if (itemErrors[idx]) setItemErrors((prev) => { const n = { ...prev }; delete n[idx]; return n; });
  };

  const adjustQty = (idx: number, delta: number) => {
    updateItem(idx, "quantity", String(Math.max(1, Number(items[idx].quantity) + delta)));
  };

  const addItem = () => {
    setItems([...items, newItem()]);
    setActiveTab(items.length); // vai direto para a nova aba
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    setItemErrors((prev) => { const n = { ...prev }; delete n[idx]; return n; });
    setActiveTab(Math.min(activeTab, next.length - 1));
  };

  // ─── Validação ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    let valid = true;
    if (!number || Number(number) < 1) { setNumberError("Número inválido (mín. 1)"); valid = false; }
    else setNumberError("");
    if (!customerId) { setCustomerError("Selecione um cliente"); valid = false; }
    else setCustomerError("");
    if (!createdAt) { setCreatedAtError("Data de cadastro é obrigatória"); valid = false; }
    else setCreatedAtError("");
    const newItemErrors: Record<number, string> = {};
    items.forEach((item, idx) => {
      if (!item.product_id) newItemErrors[idx] = "Selecione um produto";
      else if (!item.quantity || Number(item.quantity) < 1) newItemErrors[idx] = "Quantidade mín. 1";
      else if (item.unit_price !== "" && Number(item.unit_price) < 0) newItemErrors[idx] = "Preço não pode ser negativo";
    });
    setItemErrors(newItemErrors);
    if (Object.keys(newItemErrors).length > 0) {
      // Vai para a primeira aba com erro
      const firstErrorIdx = Number(Object.keys(newItemErrors)[0]);
      setActiveTab(firstErrorIdx);
      valid = false;
    }
    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (validate()) mutation.mutate();
  };

  // ─── Totais ────────────────────────────────────────────────────────────────
  const estimatedTotal = items.reduce((sum, item) => {
    const price =
      item.unit_price !== ""
        ? parseFloat(item.unit_price)
        : parseFloat(products.data?.find((p) => p.id === Number(item.product_id))?.price ?? "0");
    return sum + price * Number(item.quantity || 0);
  }, 0);

  // ─── Item ativo ────────────────────────────────────────────────────────────
  const activeItem = items[activeTab];
  const activeProduct = products.data?.find((p) => p.id === Number(activeItem?.product_id));
  const activeSubtotal =
    activeItem
      ? (activeItem.unit_price !== ""
          ? parseFloat(activeItem.unit_price)
          : parseFloat(activeProduct?.price ?? "0")) * Number(activeItem.quantity || 0)
      : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h3 className="page-title">Cadastrar pedido</h3>
        <p className="mt-1 text-sm text-gray-500">
          Preencha todos os dados do pedido. Campos com{" "}
          <span className="text-brand-pink-deep font-semibold">*</span> são obrigatórios.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {message && (
          <div className="mb-6">
            <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
          </div>
        )}

        {/* Card: Dados do Pedido */}
        <div className="mb-5 rounded-2xl border border-brand-pink/20 bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pink/20 text-base">🛒</span>
            <h4 className="font-semibold text-brand-pink-deep">Dados do pedido</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Número do pedido" icon="🔢" type="number" min={1} required
                placeholder={orders.isLoading ? "Carregando..." : `Próximo: ${nextNumber}`}
                value={number} error={numberError} hint="Identificador sequencial do pedido"
                onChange={(e) => { setNumber(e.target.value.replace(/[^0-9]/g, "")); if (numberError) setNumberError(""); }}
              />
              {!number && !orders.isLoading && (
                <button type="button" onClick={() => setNumber(String(nextNumber))}
                  className="mt-1.5 text-xs font-medium text-brand-pink-deep hover:underline">
                  ↳ Usar #{nextNumber} (sugerido)
                </button>
              )}
            </div>
            <Select
              label="Status inicial" icon="🏷️" required value={status}
              hint="Status ao criar o pedido"
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              options={statusOptions}
            />
            <div className="sm:col-span-2">
              <Input
                label="Data de cadastro" icon="📅" type="date" required
                value={createdAt} error={createdAtError} hint="Data em que o pedido foi realizado"
                onChange={(e) => { setCreatedAt(e.target.value); if (createdAtError) setCreatedAtError(""); }}
              />
            </div>
          </div>
        </div>

        {/* Card: Cliente */}
        <div className="mb-5 rounded-2xl border border-brand-pink/20 bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-yellow/40 text-base">👤</span>
            <h4 className="font-semibold text-brand-pink-deep">Cliente</h4>
            {selectedCustomer && (
              <span className="ml-auto rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">✓ Selecionado</span>
            )}
          </div>
          <div className="mb-3">
            <Input
              label="Buscar cliente" icon="🔍" type="text"
              placeholder="Nome, número ou telefone..."
              value={customerSearch}
              hint={`${filteredCustomers.length} cliente${filteredCustomers.length !== 1 ? "s" : ""} encontrado${filteredCustomers.length !== 1 ? "s" : ""}`}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>
          <Select
            label="Selecione o cliente" icon="👤" required
            value={customerId} error={customerError}
            onChange={(e) => { setCustomerId(e.target.value); if (customerError) setCustomerError(""); }}
            options={customerOptions}
          />
          {selectedCustomer && (
            <div className="mt-3 flex items-start gap-3 rounded-xl bg-brand-pink/5 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-pink/20 text-base">👤</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800">{selectedCustomer.name}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                  {selectedCustomer.phone && <span>📱 {selectedCustomer.phone}</span>}
                  {selectedCustomer.email && <span>✉️ {selectedCustomer.email}</span>}
                  <span>🛒 {selectedCustomer.total_orders} pedido{selectedCustomer.total_orders !== 1 ? "s" : ""} • Total gasto: {formatCurrency(selectedCustomer.total_spent)}</span>
                </div>
              </div>
              <button type="button" onClick={() => { setCustomerId(""); setCustomerSearch(""); }}
                className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition" title="Remover seleção">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Card: Itens do Pedido — com abas */}
        <div className="mb-5 rounded-2xl border border-brand-pink/20 bg-white shadow-card">
          {/* Cabeçalho */}
          <div className="flex items-center gap-2 border-b border-brand-pink/10 px-6 pt-6 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-base">📋</span>
            <h4 className="font-semibold text-brand-pink-deep">Itens do pedido</h4>
            <span className="ml-auto text-xs text-gray-400">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Abas de navegação */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-100 bg-gray-50/60 px-4 py-2 scrollbar-none">
            {items.map((item, idx) => {
              const prod = products.data?.find((p) => p.id === Number(item.product_id));
              const hasError = !!itemErrors[idx];
              const isActive = activeTab === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap
                    ${isActive
                      ? "bg-white shadow-sm border border-brand-pink/30 text-brand-pink-deep"
                      : hasError
                        ? "text-red-500 hover:bg-red-50"
                        : "text-gray-500 hover:bg-white hover:text-gray-700"
                    }`}
                >
                  {hasError && <span className="text-red-500">⚠</span>}
                  {!hasError && prod && <span>🧸</span>}
                  {!hasError && !prod && <span className="opacity-40">○</span>}
                  <span>
                    {prod
                      ? prod.name.length > 18
                        ? prod.name.slice(0, 18) + "…"
                        : prod.name
                      : `Item ${idx + 1}`}
                  </span>
                  {isActive && items.length > 1 && (
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

            {/* Botão adicionar aba */}
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
          {activeItem && (
            <div className="p-6 space-y-4">

              {/* Busca exclusiva do item */}
              <Input
                label={`🔍 Buscar produto para o Item ${activeTab + 1}`}
                type="text"
                placeholder="Digite o nome do produto..."
                value={activeItem.search}
                hint={`${getFilteredProducts(activeItem.search).length} produto${getFilteredProducts(activeItem.search).length !== 1 ? "s" : ""} encontrado${getFilteredProducts(activeItem.search).length !== 1 ? "s" : ""}`}
                onChange={(e) => updateItem(activeTab, "search", e.target.value)}
              />

              {/* Seleção do produto */}
              <div>
                <Select
                  label="Produto" icon="🧸" required
                  value={activeItem.product_id}
                  error={itemErrors[activeTab]}
                  onChange={(e) => updateItem(activeTab, "product_id", e.target.value)}
                  options={getProductOptions(activeItem.search)}
                />
                {activeProduct && (
                  <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
                    <span className="font-medium text-gray-700">Preço original:</span>
                    <span className="font-bold text-brand-pink-deep">{formatCurrency(activeProduct.price)}</span>
                    <span className="mx-1 text-gray-300">·</span>
                    <span className="text-gray-500">Estoque:</span>
                    <span className={`font-bold ${activeProduct.stock_quantity === 0 ? "text-red-600" : activeProduct.stock_quantity <= 3 ? "text-yellow-600" : "text-green-600"}`}>
                      {activeProduct.stock_quantity} un.
                    </span>
                  </div>
                )}
              </div>

              {/* Preço e Quantidade */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Preço unitário" icon="💲" type="number" min={0} step="0.01" required
                  prefix="R$"
                  placeholder={activeProduct ? String(parseFloat(activeProduct.price).toFixed(2)) : "0,00"}
                  hint="Edite para aplicar desconto ou preço customizado"
                  value={activeItem.unit_price}
                  onChange={(e) => updateItem(activeTab, "unit_price", e.target.value.replace(/[^0-9.]/g, ""))}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                    <span className="text-base leading-none">🔢</span>
                    Quantidade
                    <span className="text-brand-pink-deep">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => adjustQty(activeTab, -1)}
                      disabled={Number(activeItem.quantity) <= 1}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand-pink/40 bg-white text-lg font-bold text-brand-pink-deep shadow-sm transition hover:border-brand-pink hover:bg-brand-pink/10 active:scale-95 disabled:opacity-40">
                      −
                    </button>
                    <input
                      type="number" min={1} required
                      value={activeItem.quantity}
                      onChange={(e) => updateItem(activeTab, "quantity", e.target.value.replace(/[^0-9]/g, "") || "1")}
                      className="min-w-0 flex-1 rounded-xl border-2 border-brand-pink/40 bg-white px-4 py-2.5 text-center text-sm font-bold shadow-sm outline-none transition hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <button type="button" onClick={() => adjustQty(activeTab, 1)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand-pink/40 bg-white text-lg font-bold text-brand-pink-deep shadow-sm transition hover:border-brand-pink hover:bg-brand-pink/10 active:scale-95">
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Subtotal do item ativo */}
              {activeSubtotal > 0 && (
                <div className="flex items-center justify-end gap-2 rounded-xl bg-brand-pink/5 px-4 py-2">
                  <span className="text-xs text-gray-500">Subtotal deste item:</span>
                  <span className="font-bold text-brand-pink-deep">{formatCurrency(activeSubtotal)}</span>
                </div>
              )}

              {/* Navegação entre abas */}
              {items.length > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <button type="button" onClick={() => setActiveTab((t) => Math.max(0, t - 1))}
                    disabled={activeTab === 0}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition">
                    ← Item anterior
                  </button>
                  <span className="text-xs text-gray-400">
                    {activeTab + 1} / {items.length}
                  </span>
                  <button type="button" onClick={() => setActiveTab((t) => Math.min(items.length - 1, t + 1))}
                    disabled={activeTab === items.length - 1}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition">
                    Próximo item →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resumo do pedido */}
        <div className="mb-6 rounded-2xl border-2 border-brand-pink/30 bg-gradient-to-r from-brand-pink/10 to-brand-yellow/10 p-5">
          <h4 className="mb-3 font-semibold text-brand-pink-deep">📊 Resumo do pedido</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Itens:</span>
              <span className="font-semibold">{items.filter((i) => i.product_id).length} produto{items.filter((i) => i.product_id).length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Unidades:</span>
              <span className="font-semibold">{items.reduce((s, i) => s + Number(i.quantity || 0), 0)} un.</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Status:</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ORDER_STATUS_COLORS[status]}`}>
                {STATUS_ICONS[status]} {ORDER_STATUS_LABELS[status]}
              </span>
            </div>

            {/* Lista resumida de itens */}
            {items.some((i) => i.product_id) && (
              <div className="space-y-1 border-t border-brand-pink/10 pt-2">
                {items.map((item, idx) => {
                  const prod = products.data?.find((p) => p.id === Number(item.product_id));
                  if (!prod) return null;
                  const price = item.unit_price !== "" ? parseFloat(item.unit_price) : parseFloat(prod.price);
                  const sub = price * Number(item.quantity || 0);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs text-gray-600">
                      <span className="truncate max-w-[60%]">
                        <span className="font-medium text-gray-400">Item {idx + 1}:</span> {prod.name} × {item.quantity}
                      </span>
                      <span className="font-semibold shrink-0">{formatCurrency(sub)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-brand-pink/20 pt-2">
              <span className="font-semibold text-gray-700">Total estimado:</span>
              <span className="text-xl font-bold text-brand-pink-deep">{formatCurrency(estimatedTotal)}</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={mutation.isPending} className="flex-1 py-3 text-base">
            💾 Salvar pedido
          </Button>
          <Button type="button" variant="ghost" className="py-3"
            onClick={() => {
              setNumber(""); setCustomerId(""); setCustomerSearch("");
              setStatus("PENDING"); setCreatedAt(todayLocal()); setCreatedAtError("");
              setItems([newItem()]); setItemErrors({}); setMessage(null);
              setNumberError(""); setCustomerError(""); setActiveTab(0);
            }}>
            Limpar
          </Button>
        </div>
      </form>
    </div>
  );
}
