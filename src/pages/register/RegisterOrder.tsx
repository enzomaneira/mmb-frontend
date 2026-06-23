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

// Returns today's date as YYYY-MM-DD in local timezone
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const [productSearch, setProductSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus>("PENDING");
  const [createdAt, setCreatedAt] = useState(todayLocal());
  const [createdAtError, setCreatedAtError] = useState("");
  const [items, setItems] = useState<OrderItemForm[]>([
    { product_id: "", quantity: "1", unit_price: "" },
  ]);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-suggest next order number
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
      setProductSearch("");
      setStatus("PENDING");
      setCreatedAt(todayLocal());
      setItems([{ product_id: "", quantity: "1", unit_price: "" }]);
      setItemErrors({});
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  // Filtered lists for search
  const filteredCustomers = (customers.data ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      String(c.number).includes(customerSearch) ||
      (c.phone ?? "").includes(customerSearch),
  );

  const filteredProducts = (products.data ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      String(p.number).includes(productSearch),
  );

  const selectedCustomer = customers.data?.find((c) => String(c.id) === customerId);

  const customerOptions = [
    { value: "", label: customerSearch ? "Nenhum cliente encontrado" : "Selecione um cliente", disabled: true },
    ...filteredCustomers.map((c) => ({
      value: String(c.id),
      label: `#${c.number} — ${c.name}${c.phone ? ` · ${c.phone}` : ""}`,
    })),
  ];

  const getProductOptions = () => [
    { value: "", label: productSearch ? "Nenhum produto encontrado" : "Selecione um produto", disabled: true },
    ...filteredProducts.map((p) => ({
      value: String(p.id),
      label: `#${p.number} — ${p.name} · ${formatCurrency(p.price)}${p.stock_quantity === 0 ? " ⚠️ Sem estoque" : ""}`,
    })),
  ];

  const estimatedTotal = items.reduce((sum, item) => {
    const price =
      item.unit_price !== ""
        ? parseFloat(item.unit_price)
        : parseFloat(products.data?.find((p) => p.id === Number(item.product_id))?.price ?? "0");
    return sum + price * Number(item.quantity || 0);
  }, 0);

  const validate = (): boolean => {
    let valid = true;
    if (!number || Number(number) < 1) {
      setNumberError("Número inválido (mín. 1)");
      valid = false;
    } else setNumberError("");

    if (!customerId) {
      setCustomerError("Selecione um cliente");
      valid = false;
    } else setCustomerError("");

    if (!createdAt) {
      setCreatedAtError("Data de cadastro é obrigatória");
      valid = false;
    } else setCreatedAtError("");

    const newItemErrors: Record<number, string> = {};
    items.forEach((item, idx) => {
      if (!item.product_id) newItemErrors[idx] = "Selecione um produto";
      else if (!item.quantity || Number(item.quantity) < 1) newItemErrors[idx] = "Quantidade mín. 1";
      else if (item.unit_price !== "" && Number(item.unit_price) < 0)
        newItemErrors[idx] = "Preço não pode ser negativo";
    });
    setItemErrors(newItemErrors);
    if (Object.keys(newItemErrors).length > 0) valid = false;

    return valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (validate()) mutation.mutate();
  };

  const addItem = () =>
    setItems([...items, { product_id: "", quantity: "1", unit_price: "" }]);

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
    setItemErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const updateItem = (idx: number, field: keyof OrderItemForm, value: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };

    // Auto-fill price when product selected
    if (field === "product_id" && value) {
      const product = products.data?.find((p) => p.id === Number(value));
      next[idx].unit_price = product ? String(product.price) : "";
    }
    setItems(next);

    // Clear item error
    if (itemErrors[idx]) {
      setItemErrors((prev) => { const n = { ...prev }; delete n[idx]; return n; });
    }
  };

  const adjustQty = (idx: number, delta: number) => {
    const current = Math.max(1, Number(items[idx].quantity) + delta);
    updateItem(idx, "quantity", String(current));
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
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
            {/* Número */}
            <div>
              <Input
                label="Número do pedido"
                icon="🔢"
                type="number"
                min={1}
                required
                placeholder={orders.isLoading ? "Carregando..." : `Próximo: ${nextNumber}`}
                value={number}
                error={numberError}
                hint="Identificador sequencial do pedido"
                onChange={(e) => {
                  setNumber(e.target.value.replace(/[^0-9]/g, ""));
                  if (numberError) setNumberError("");
                }}
              />
              {!number && !orders.isLoading && (
                <button
                  type="button"
                  onClick={() => setNumber(String(nextNumber))}
                  className="mt-1.5 text-xs font-medium text-brand-pink-deep hover:underline"
                >
                  ↳ Usar #{nextNumber} (sugerido)
                </button>
              )}
            </div>

            {/* Status */}
            <Select
              label="Status inicial"
              icon="🏷️"
              required
              value={status}
              hint="Status ao criar o pedido"
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              options={statusOptions}
            />

            {/* Data de cadastro */}
            <div className="sm:col-span-2">
              <Input
                label="Data de cadastro"
                icon="📅"
                type="date"
                required
                value={createdAt}
                error={createdAtError}
                hint="Data em que o pedido foi realizado"
                onChange={(e) => {
                  setCreatedAt(e.target.value);
                  if (createdAtError) setCreatedAtError("");
                }}
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
              <span className="ml-auto rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                ✓ Selecionado
              </span>
            )}
          </div>

          {/* Search customers */}
          <div className="mb-3">
            <Input
              label="Buscar cliente"
              icon="🔍"
              type="text"
              placeholder="Nome, número ou telefone..."
              value={customerSearch}
              hint={`${filteredCustomers.length} cliente${filteredCustomers.length !== 1 ? "s" : ""} encontrado${filteredCustomers.length !== 1 ? "s" : ""}`}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>

          <Select
            label="Selecione o cliente"
            icon="👤"
            required
            value={customerId}
            error={customerError}
            onChange={(e) => {
              setCustomerId(e.target.value);
              if (customerError) setCustomerError("");
            }}
            options={customerOptions}
          />

          {/* Selected customer preview */}
          {selectedCustomer && (
            <div className="mt-3 flex items-start gap-3 rounded-xl bg-brand-pink/5 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-pink/20 text-base">
                👤
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800">{selectedCustomer.name}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                  {selectedCustomer.phone && <span>📱 {selectedCustomer.phone}</span>}
                  {selectedCustomer.email && <span>✉️ {selectedCustomer.email}</span>}
                  <span>
                    🛒 {selectedCustomer.total_orders} pedido{selectedCustomer.total_orders !== 1 ? "s" : ""} • 
                    Total gasto: {formatCurrency(selectedCustomer.total_spent)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setCustomerId(""); setCustomerSearch(""); }}
                className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                title="Remover seleção"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Card: Itens do Pedido */}
        <div className="mb-5 rounded-2xl border border-brand-pink/20 bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-base">📋</span>
            <h4 className="font-semibold text-brand-pink-deep">Itens do pedido</h4>
            <span className="ml-auto text-xs text-gray-400">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Product search (global) */}
          <div className="mb-4">
            <Input
              label="Filtrar produtos"
              icon="🔍"
              type="text"
              placeholder="Nome ou número do produto..."
              value={productSearch}
              hint={`${filteredProducts.length} produto${filteredProducts.length !== 1 ? "s" : ""} encontrado${filteredProducts.length !== 1 ? "s" : ""}`}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => {
              const selectedProduct = products.data?.find((p) => p.id === Number(item.product_id));
              const subtotal =
                (item.unit_price !== "" ? parseFloat(item.unit_price) : parseFloat(selectedProduct?.price ?? "0")) *
                Number(item.quantity || 0);

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Item {idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        🗑️ Remover
                      </button>
                    )}
                  </div>

                  {/* Product select */}
                  <div className="mb-3">
                    <Select
                      label="Produto"
                      icon="🧸"
                      required
                      value={item.product_id}
                      error={itemErrors[idx]}
                      onChange={(e) => updateItem(idx, "product_id", e.target.value)}
                      options={getProductOptions()}
                    />
                    {selectedProduct && (
                      <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs">
                        <span className="font-medium text-gray-700">Preço original:</span>
                        <span className="font-bold text-brand-pink-deep">{formatCurrency(selectedProduct.price)}</span>
                        <span className="mx-1 text-gray-300">·</span>
                        <span className="text-gray-500">Estoque:</span>
                        <span className={`font-bold ${selectedProduct.stock_quantity === 0 ? "text-red-600" : selectedProduct.stock_quantity <= 3 ? "text-yellow-600" : "text-green-600"}`}>
                          {selectedProduct.stock_quantity} un.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Unit Price */}
                    <Input
                      label="Preço unitário"
                      icon="💲"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      prefix="R$"
                      placeholder={selectedProduct ? String(parseFloat(selectedProduct.price).toFixed(2)) : "0,00"}
                      hint="Edite para aplicar desconto ou preço customizado"
                      value={item.unit_price}
                      onChange={(e) => updateItem(idx, "unit_price", e.target.value.replace(/[^0-9.]/g, ""))}
                    />

                    {/* Quantity */}
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                        <span className="text-base leading-none">🔢</span>
                        Quantidade
                        <span className="text-brand-pink-deep">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustQty(idx, -1)}
                          disabled={Number(item.quantity) <= 1}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand-pink/40 bg-white text-lg font-bold text-brand-pink-deep shadow-sm transition hover:border-brand-pink hover:bg-brand-pink/10 active:scale-95 disabled:opacity-40"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value.replace(/[^0-9]/g, "") || "1")}
                          className="min-w-0 flex-1 rounded-xl border-2 border-brand-pink/40 bg-white px-4 py-2.5 text-center text-sm font-bold shadow-sm outline-none transition hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                        <button
                          type="button"
                          onClick={() => adjustQty(idx, 1)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand-pink/40 bg-white text-lg font-bold text-brand-pink-deep shadow-sm transition hover:border-brand-pink hover:bg-brand-pink/10 active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Subtotal row */}
                  {subtotal > 0 && (
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-200 pt-2">
                      <span className="text-xs text-gray-500">Subtotal:</span>
                      <span className="font-bold text-brand-pink-deep">{formatCurrency(subtotal)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add item */}
          <button
            type="button"
            onClick={addItem}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-pink/40 py-3 text-sm font-semibold text-brand-pink-deep transition hover:border-brand-pink hover:bg-brand-pink/5 active:scale-[0.99]"
          >
            <span className="text-lg leading-none">+</span>
            Adicionar item ao pedido
          </button>
        </div>

        {/* Order summary */}
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
            <div className="flex items-center justify-between border-t border-brand-pink/20 pt-2">
              <span className="font-semibold text-gray-700">Total estimado:</span>
              <span className="text-xl font-bold text-brand-pink-deep">{formatCurrency(estimatedTotal)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={mutation.isPending} className="flex-1 py-3 text-base">
            💾 Salvar pedido
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="py-3"
            onClick={() => {
      setNumber("");
      setCustomerId("");
      setCustomerSearch("");
      setProductSearch("");
      setStatus("PENDING");
      setCreatedAt(todayLocal());
      setCreatedAtError("");
      setItems([{ product_id: "", quantity: "1", unit_price: "" }]);
      setItemErrors({});
      setMessage(null);
      setNumberError("");
      setCustomerError("");
            }}
          >
            Limpar
          </Button>
        </div>
      </form>
    </div>
  );
}
