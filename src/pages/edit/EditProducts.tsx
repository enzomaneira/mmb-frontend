import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { PRODUCT_TYPE_LABELS, type Product, type ProductType, type SortOrder } from "../../types";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SortToggle } from "../../components/ui/SortToggle";
import { Modal } from "../../components/ui/Modal";

const typeOptions = Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export function EditProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStock, setFilterStock] = useState<"all" | "zero" | "low" | "ok">("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState({
    number: "", name: "", description: "",
    product_type: "TOYS" as ProductType, price: "", stock_quantity: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const products = useQuery({
    queryKey: ["products", sortBy, sortOrder],
    queryFn: () => api.products.list({ sort_by: sortBy, sort_order: sortOrder }),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.products.update(selectedProduct!.id, {
        number: Number(form.number), name: form.name,
        description: form.description || undefined,
        product_type: form.product_type,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setMode("view");
      setMessage({ type: "success", text: "Produto atualizado com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedProduct(null);
      setMessage({ type: "success", text: "Produto removido com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const openView = (p: Product) => {
    setSelectedProduct(p); setMode("view"); setMessage(null);
  };

  const openEdit = (p: Product) => {
    setSelectedProduct(p);
    setForm({
      number: String(p.number), name: p.name,
      description: p.description ?? "",
      product_type: p.product_type,
      price: p.price,
      stock_quantity: String(p.stock_quantity),
    });
    setMode("edit"); setMessage(null);
  };

  const stockLabel = (qty: number) => {
    if (qty === 0) return { text: "Sem estoque", cls: "bg-red-100 text-red-700" };
    if (qty <= 3) return { text: "Estoque baixo", cls: "bg-yellow-100 text-yellow-800" };
    return { text: "Em estoque", cls: "bg-green-100 text-green-800" };
  };

  const filtered = (products.data ?? []).filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.number).includes(search);
    const matchType = !filterType || p.product_type === filterType;
    const matchStock =
      filterStock === "all" ||
      (filterStock === "zero" && p.stock_quantity === 0) ||
      (filterStock === "low" && p.stock_quantity > 0 && p.stock_quantity <= 3) ||
      (filterStock === "ok" && p.stock_quantity > 3);
    return matchSearch && matchType && matchStock;
  });

  return (
    <div className="space-y-5">
      <h3 className="page-title">Editar produtos</h3>
      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar (nome, número)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px]"
          placeholder="Digite para filtrar..."
        />
        <Select
          label="Tipo"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          options={[{ value: "", label: "Todos os tipos" }, ...typeOptions]}
        />
        <Select
          label="Estoque"
          value={filterStock}
          onChange={(e) => setFilterStock(e.target.value as typeof filterStock)}
          options={[
            { value: "all", label: "Todos" },
            { value: "zero", label: "Sem estoque" },
            { value: "low", label: "Estoque baixo (≤3)" },
            { value: "ok", label: "Em estoque (>3)" },
          ]}
        />
        <Select
          label="Ordenar por"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "name", label: "Nome" },
            { value: "number", label: "Número de cadastro" },
            { value: "price", label: "Preço" },
            { value: "units_sold", label: "Unidades vendidas" },
            { value: "revenue", label: "Receita" },
            { value: "stock_quantity", label: "Estoque" },
          ]}
        />
        <div className="flex items-end"><SortToggle value={sortOrder} onChange={setSortOrder} /></div>
        <div className="flex items-end pb-1">
          <span className="text-sm text-gray-500">{filtered.length} produto{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Preço</th>
              <th className="px-4 py-3 text-left">Estoque</th>
              <th className="px-4 py-3 text-left">Vendidos</th>
              <th className="px-4 py-3 text-left">Receita</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const stock = stockLabel(p.stock_quantity);
              return (
                <tr
                  key={p.id}
                  onClick={() => openView(p)}
                  className="cursor-pointer border-t border-gray-100 transition hover:bg-brand-pink/10"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">#{p.number}</td>
                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{PRODUCT_TYPE_LABELS[p.product_type]}</td>
                  <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stock.cls}`}>
                      {p.stock_quantity} — {stock.text}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.units_sold}</td>
                  <td className="px-4 py-3 font-medium text-brand-pink-deep">{formatCurrency(p.revenue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.isLoading && <p className="p-4 text-center text-sm text-gray-400">Carregando...</p>}
        {!products.isLoading && filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">Nenhum produto encontrado.</p>
        )}
      </div>

      {/* Detail / Edit Modal */}
      <Modal
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={mode === "edit" ? `Editando: ${selectedProduct?.name}` : `Produto #${selectedProduct?.number}`}
        size="lg"
      >
        {selectedProduct && mode === "view" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-brand-pink/10 p-3 text-center">
                <p className="text-xs text-gray-500">Preço</p>
                <p className="text-lg font-bold text-brand-pink-deep">{formatCurrency(selectedProduct.price)}</p>
              </div>
              <div className="rounded-xl bg-brand-yellow/30 p-3 text-center">
                <p className="text-xs text-gray-500">Estoque</p>
                <p className="text-lg font-bold text-yellow-800">{selectedProduct.stock_quantity}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-xs text-gray-500">Vendidos</p>
                <p className="text-lg font-bold text-blue-700">{selectedProduct.units_sold}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-center">
                <p className="text-xs text-gray-500">Receita</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(selectedProduct.revenue)}</p>
              </div>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div><p className="font-medium text-gray-500">Número</p><p>#{selectedProduct.number}</p></div>
              <div><p className="font-medium text-gray-500">Tipo</p><p>{PRODUCT_TYPE_LABELS[selectedProduct.product_type]}</p></div>
              <div><p className="font-medium text-gray-500">Cadastrado em</p><p>{formatDate(selectedProduct.created_at)}</p></div>
              <div><p className="font-medium text-gray-500">Atualizado em</p><p>{formatDate(selectedProduct.updated_at)}</p></div>
              {selectedProduct.description && (
                <div className="sm:col-span-2">
                  <p className="font-medium text-gray-500">Descrição</p>
                  <p className="rounded-lg bg-gray-50 p-2">{selectedProduct.description}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-gray-100 pt-4">
              <Button onClick={() => openEdit(selectedProduct)} variant="secondary">✏️ Editar</Button>
              <Button
                variant="danger"
                onClick={() => { if (confirm(`Remover produto ${selectedProduct.name}?`)) deleteMutation.mutate(selectedProduct.id); }}
                loading={deleteMutation.isPending}
              >🗑️ Excluir</Button>
              <Button variant="ghost" onClick={() => setSelectedProduct(null)} className="ml-auto">Fechar</Button>
            </div>
          </div>
        )}

        {selectedProduct && mode === "edit" && (
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
            {message && <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Número" type="number" required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
              <Input label="Nome" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Select label="Tipo" value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value as ProductType })} options={typeOptions} />
              <Input label="Preço" type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <Input label="Estoque" type="number" min={0} value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-brand-pink/50 px-3 py-2 text-sm outline-none focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30" />
            </div>
            <div className="flex gap-2 border-t border-gray-100 pt-4">
              <Button type="submit" loading={updateMutation.isPending}>Salvar</Button>
              <Button type="button" variant="ghost" onClick={() => setMode("view")}>Cancelar</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
