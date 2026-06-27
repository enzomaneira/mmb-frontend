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

const PRODUCT_TYPE_ICONS: Record<ProductType, string> = {
  FELT: "🧶", CLOTH: "🪡", CHRISTMAS: "🎄", SCHOOL: "🎒",
  DECORATION: "🎀", KEEPSAKE: "🎁", COSTUME: "🎭", EASTER: "🐰",
  PUPPETS: "🤹", MISC: "📦", REPAIR: "🔧", QUIET_BOOK: "📚",
  TOYS: "🧸", STATIONERY: "✏️",
};

const typeOptions = Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label: `${PRODUCT_TYPE_ICONS[value as ProductType]} ${label}`,
}));

const filterTypeOptions = [
  { value: "", label: "Todos os tipos" },
  ...Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

// Convert ISO datetime string to YYYY-MM-DD for date inputs
function toDateInput(iso: string | Date | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SearchProducts() {
  const queryClient = useQueryClient();

  // ─── List filters ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minUnits, setMinUnits] = useState("");
  const [maxUnits, setMaxUnits] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [minRevenue, setMinRevenue] = useState("");
  const [maxRevenue, setMaxRevenue] = useState("");

  // ─── Modal state ─────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Product | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ─── Edit form ───────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    number: "", name: "", description: "",
    product_type: "TOYS" as ProductType, price: "", stock_quantity: "",
    created_at: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const listQuery = useQuery({
    queryKey: ["products", search, productType, minPrice, maxPrice, minUnits, maxUnits, sortBy, sortOrder],
    queryFn: () =>
      api.products.list({
        search: search || undefined,
        product_type: (productType as ProductType) || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        min_units_sold: minUnits ? Number(minUnits) : undefined,
        max_units_sold: maxUnits ? Number(maxUnits) : undefined,
        sort_by: sortBy, sort_order: sortOrder,
      }),
  });

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: () =>
      api.products.update(selected!.id, {
        number: Number(form.number),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        product_type: form.product_type,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity),
        created_at: form.created_at ? `${form.created_at}T12:00:00` : undefined,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelected(updated);
      setMode("view");
      setMessage({ type: "success", text: "✅ Produto atualizado com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelected(null);
      setMessage({ type: "success", text: "Produto removido com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof typeof form, string>> = {};
    if (!form.number || Number(form.number) < 1) newErrors.number = "Número inválido (mín. 1)";
    if (!form.name.trim()) newErrors.name = "Nome é obrigatório";
    else if (form.name.trim().length < 2) newErrors.name = "Nome muito curto";
    if (!form.price || Number(form.price) <= 0) newErrors.price = "Preço deve ser maior que zero";
    if (form.stock_quantity === "" || Number(form.stock_quantity) < 0)
      newErrors.stock_quantity = "Estoque não pode ser negativo";
    if (!form.created_at) newErrors.created_at = "Data de cadastro é obrigatória";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openView = (p: Product) => {
    setSelected(p); setMode("view"); setMessage(null); setErrors({});
  };

  const openEdit = (p: Product) => {
    setSelected(p);
    setForm({
      number: String(p.number),
      name: p.name,
      description: p.description ?? "",
      product_type: p.product_type,
      price: p.price,
      stock_quantity: String(p.stock_quantity),
      created_at: toDateInput(p.created_at),
    });
    setErrors({});
    setMode("edit");
    setMessage(null);
  };

  const adjustStock = (delta: number) => {
    const current = Math.max(0, Number(form.stock_quantity) + delta);
    setForm((f) => ({ ...f, stock_quantity: String(current) }));
    if (errors.stock_quantity) setErrors((e) => ({ ...e, stock_quantity: undefined }));
  };

  const stockBadge = (qty: number) => {
    if (qty === 0) return "bg-red-100 text-red-700";
    if (qty <= 3) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const clearFilters = () => {
    setSearch(""); setProductType(""); setMinPrice(""); setMaxPrice("");
    setMinUnits(""); setMaxUnits(""); setMinStock(""); setMaxStock("");
    setMinRevenue(""); setMaxRevenue(""); setSortBy("name"); setSortOrder("asc");
  };

  // ─── Derived data ─────────────────────────────────────────────────────────────
  const filtered = (listQuery.data ?? []).filter((p) => {
    const revenue = parseFloat(p.revenue);
    if (minStock && p.stock_quantity < parseInt(minStock)) return false;
    if (maxStock && p.stock_quantity > parseInt(maxStock)) return false;
    if (minRevenue && revenue < parseFloat(minRevenue)) return false;
    if (maxRevenue && revenue > parseFloat(maxRevenue)) return false;
    return true;
  });

  const activeFilterCount = [productType, minPrice, maxPrice, minUnits, maxUnits, minStock, maxStock, minRevenue, maxRevenue].filter(Boolean).length;
  const priceFloat = parseFloat(form.price) || 0;
  const stockQty = parseInt(form.stock_quantity) || 0;
  const totalStockValue = priceFloat * stockQty;

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="page-title">Buscar produtos</h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition border ${
            showFilters ? "border-brand-pink-deep bg-brand-pink/10 text-brand-pink-deep" : "border-gray-200 text-gray-600 hover:border-brand-pink/40"
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

      {/* Primary filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Input label="Buscar (nome, número)" value={search}
          onChange={(e) => setSearch(e.target.value)} className="min-w-[220px]" placeholder="Digite para buscar..." />
        <Select label="Tipo" value={productType} onChange={(e) => setProductType(e.target.value)} options={filterTypeOptions} />
        <Select label="Ordenar por" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "name", label: "Nome" },
            { value: "number", label: "Número de cadastro" },
            { value: "price", label: "Preço" },
            { value: "stock_quantity", label: "Estoque" },
          ]}
        />
        <div className="flex items-end"><SortToggle value={sortOrder} onChange={setSortOrder} /></div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="rounded-xl border border-brand-pink/20 bg-brand-pink/5 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Filtros avançados</p>
          <div className="flex flex-wrap gap-3">
            <Input label="Preço mín. (R$)" type="number" step="0.01" min={0} value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)} className="w-36" />
            <Input label="Preço máx. (R$)" type="number" step="0.01" min={0} value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)} className="w-36" />
            <Input label="Vendas mín." type="number" min={0} value={minUnits}
              onChange={(e) => setMinUnits(e.target.value)} className="w-32" />
            <Input label="Vendas máx." type="number" min={0} value={maxUnits}
              onChange={(e) => setMaxUnits(e.target.value)} className="w-32" />
            <Input label="Estoque mín." type="number" min={0} value={minStock}
              onChange={(e) => setMinStock(e.target.value)} className="w-32" />
            <Input label="Estoque máx." type="number" min={0} value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)} className="w-32" />
            <Input label="Receita mín. (R$)" type="number" step="0.01" value={minRevenue}
              onChange={(e) => setMinRevenue(e.target.value)} className="w-36" />
            <Input label="Receita máx. (R$)" type="number" step="0.01" value={maxRevenue}
              onChange={(e) => setMaxRevenue(e.target.value)} className="w-36" />
            <div className="flex items-end">
              <Button variant="ghost" className="text-xs" onClick={clearFilters}>Limpar tudo</Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">{filtered.length} produto{filtered.length !== 1 ? "s" : ""} • Clique para detalhes</p>

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
            {filtered.map((p) => (
              <tr key={p.id} onClick={() => openView(p)}
                className="cursor-pointer border-t border-gray-100 hover:bg-brand-pink/10 transition">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{p.number}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-600">{PRODUCT_TYPE_LABELS[p.product_type]}</td>
                <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stockBadge(p.stock_quantity)}`}>
                    {p.stock_quantity}
                  </span>
                </td>
                <td className="px-4 py-3">{p.units_sold}</td>
                <td className="px-4 py-3 font-semibold text-brand-pink-deep">{formatCurrency(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {listQuery.isLoading && <p className="p-4 text-center text-sm text-gray-400">Carregando...</p>}
        {!listQuery.isLoading && filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">Nenhum produto encontrado.</p>
        )}
      </div>

      {/* Detail / Edit Modal */}
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setMode("view"); setErrors({}); }}
        title={
          mode === "edit"
            ? `✏️ Editando: ${selected?.name}`
            : `🏷️ Produto #${selected?.number} — ${selected?.name}`
        }
        size="lg"
      >
        {/* ── VIEW MODE ── */}
        {selected && mode === "view" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-brand-pink/10 p-3 text-center">
                <p className="text-xs text-gray-500">Preço</p>
                <p className="text-lg font-bold text-brand-pink-deep">{formatCurrency(selected.price)}</p>
              </div>
              <div className="rounded-xl bg-brand-yellow/30 p-3 text-center">
                <p className="text-xs text-gray-500">Estoque</p>
                <p className="text-lg font-bold text-yellow-800">{selected.stock_quantity}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-xs text-gray-500">Unid. vendidas</p>
                <p className="text-lg font-bold text-blue-700">{selected.units_sold}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-center">
                <p className="text-xs text-gray-500">Receita</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(selected.revenue)}</p>
              </div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium text-gray-500">Número</p>
                <p>#{selected.number}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Tipo</p>
                <p>{PRODUCT_TYPE_ICONS[selected.product_type]} {PRODUCT_TYPE_LABELS[selected.product_type]}</p>
              </div>
              <div><p className="font-medium text-gray-500">Cadastrado em</p><p>{formatDate(selected.created_at)}</p></div>
              <div><p className="font-medium text-gray-500">Atualizado em</p><p>{formatDate(selected.updated_at)}</p></div>
              {selected.description && (
                <div className="sm:col-span-2">
                  <p className="font-medium text-gray-500">Descrição</p>
                  <p className="rounded-lg bg-gray-50 p-2 whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <Button onClick={() => openEdit(selected)} variant="secondary">✏️ Editar</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Remover produto "${selected.name}"? Esta ação não pode ser desfeita.`))
                    deleteMutation.mutate(selected.id);
                }}
                loading={deleteMutation.isPending}
              >🗑️ Excluir</Button>
              <Button variant="ghost" onClick={() => setSelected(null)} className="ml-auto">Fechar</Button>
            </div>
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {selected && mode === "edit" && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (validate()) updateMutation.mutate(); }}
            className="space-y-4"
            noValidate
          >
            {message && (
              <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
            )}

            {/* Card: Identificação */}
            <div className="rounded-2xl border border-brand-pink/20 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-pink/20 text-sm">🏷️</span>
                <h4 className="font-semibold text-brand-pink-deep">Identificação</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Número do produto" icon="🔢" type="number" min={1} required
                  value={form.number} error={errors.number} hint="Código numérico único"
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setForm((f) => ({ ...f, number: val }));
                    if (errors.number) setErrors((er) => ({ ...er, number: undefined }));
                  }}
                />
                <Select
                  label="Categoria / Tipo" icon="🗂️" required
                  value={form.product_type}
                  onChange={(e) => setForm((f) => ({ ...f, product_type: e.target.value as ProductType }))}
                  options={typeOptions}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Nome do produto" icon="✏️" type="text" required maxLength={150}
                    placeholder="Nome completo do produto"
                    value={form.name} error={errors.name}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, name: e.target.value }));
                      if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Data de cadastro" icon="📅" type="date" required
                    value={form.created_at} error={errors.created_at}
                    hint="Data original de cadastro do produto"
                    onChange={(e) => {
                      setForm((f) => ({ ...f, created_at: e.target.value }));
                      if (errors.created_at) setErrors((er) => ({ ...er, created_at: undefined }));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Card: Preço & Estoque */}
            <div className="rounded-2xl border border-brand-pink/20 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-sm">💰</span>
                <h4 className="font-semibold text-brand-pink-deep">Preço & Estoque</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Preço de venda" icon="💲" type="number" min={0} step="0.01" required
                  prefix="R$" placeholder="0,00"
                  value={form.price} error={errors.price} hint="Preço padrão cobrado ao cliente"
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    setForm((f) => ({ ...f, price: val }));
                    if (errors.price) setErrors((er) => ({ ...er, price: undefined }));
                  }}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                    <span className="text-base leading-none">📦</span>
                    Estoque
                    <span className="ml-auto text-xs font-normal text-gray-400">unidades</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button" onClick={() => adjustStock(-1)} disabled={stockQty <= 0}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand-pink/40 bg-white text-lg font-bold text-brand-pink-deep shadow-sm transition hover:border-brand-pink hover:bg-brand-pink/10 active:scale-95 disabled:opacity-40"
                    >−</button>
                    <input
                      type="number" min={0} value={form.stock_quantity}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setForm((f) => ({ ...f, stock_quantity: String(val) }));
                        if (errors.stock_quantity) setErrors((er) => ({ ...er, stock_quantity: undefined }));
                      }}
                      className="min-w-0 flex-1 rounded-xl border-2 border-brand-pink/40 bg-white px-4 py-2.5 text-center text-sm font-bold shadow-sm outline-none transition hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <button
                      type="button" onClick={() => adjustStock(1)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand-pink/40 bg-white text-lg font-bold text-brand-pink-deep shadow-sm transition hover:border-brand-pink hover:bg-brand-pink/10 active:scale-95"
                    >+</button>
                  </div>
                  {errors.stock_quantity && (
                    <p className="flex items-center gap-1 text-xs font-medium text-red-500">
                      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.stock_quantity}
                    </p>
                  )}
                </div>
              </div>
              {priceFloat > 0 && stockQty > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-green-50 px-4 py-2.5">
                  <span className="text-sm text-gray-600">💡 Valor total em estoque</span>
                  <span className="font-bold text-green-700">
                    R$ {totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {stockQty === 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-yellow-50 px-4 py-2.5">
                  <span>⚠️</span>
                  <span className="text-sm text-yellow-800">Produto ficará <strong>sem estoque</strong>.</span>
                </div>
              )}
            </div>

            {/* Card: Descrição */}
            <div className="rounded-2xl border border-brand-pink/20 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-sm">📝</span>
                <h4 className="font-semibold text-brand-pink-deep">Descrição</h4>
                <span className="ml-auto text-xs text-gray-400">Opcional</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">📄 Descrição do produto</label>
                <textarea
                  rows={3} maxLength={500}
                  placeholder="Materiais, medidas, faixa etária recomendada..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border-2 border-brand-pink/40 bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none transition-all placeholder:font-normal placeholder:text-gray-300 hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30 resize-none"
                />
                <p className="text-right text-xs text-gray-400">{form.description.length}/500</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-2">
              <Button type="submit" loading={updateMutation.isPending}>💾 Salvar alterações</Button>
              <Button type="button" variant="ghost" onClick={() => setMode("view")}>Cancelar</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
