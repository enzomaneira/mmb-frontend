import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import { PRODUCT_TYPE_LABELS, type Product, type ProductType, type SortOrder } from "../../types";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SortToggle } from "../../components/ui/SortToggle";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

const typeOptions = [
  { value: "", label: "Todos os tipos" },
  ...Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export function SearchProducts() {
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minUnits, setMinUnits] = useState("");
  const [maxUnits, setMaxUnits] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showFilters, setShowFilters] = useState(false);
  // Local additional filters
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [minRevenue, setMinRevenue] = useState("");
  const [maxRevenue, setMaxRevenue] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);

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

  const filtered = (listQuery.data ?? []).filter((p) => {
    const revenue = parseFloat(p.revenue);
    if (minStock && p.stock_quantity < parseInt(minStock)) return false;
    if (maxStock && p.stock_quantity > parseInt(maxStock)) return false;
    if (minRevenue && revenue < parseFloat(minRevenue)) return false;
    if (maxRevenue && revenue > parseFloat(maxRevenue)) return false;
    return true;
  });

  const clearFilters = () => {
    setSearch(""); setProductType(""); setMinPrice(""); setMaxPrice("");
    setMinUnits(""); setMaxUnits(""); setMinStock(""); setMaxStock("");
    setMinRevenue(""); setMaxRevenue(""); setSortBy("name"); setSortOrder("asc");
  };

  const activeFilterCount = [productType, minPrice, maxPrice, minUnits, maxUnits, minStock, maxStock, minRevenue, maxRevenue].filter(Boolean).length;

  const stockBadge = (qty: number) => {
    if (qty === 0) return "bg-red-100 text-red-700";
    if (qty <= 3) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="space-y-5">
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
        <Select label="Tipo" value={productType} onChange={(e) => setProductType(e.target.value)} options={typeOptions} />
        <Select label="Ordenar por" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "name", label: "Nome" },
            { value: "price", label: "Preço" },
            { value: "units_sold", label: "Unidades vendidas" },
            { value: "revenue", label: "Receita" },
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
              <tr key={p.id} onClick={() => setSelected(p)}
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

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={`Produto #${selected?.number} — ${selected?.name}`} size="lg">
        {selected && (
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
              <div><p className="font-medium text-gray-500">Tipo</p><p>{PRODUCT_TYPE_LABELS[selected.product_type]}</p></div>
              <div><p className="font-medium text-gray-500">Cadastrado em</p><p>{formatDate(selected.created_at)}</p></div>
              {selected.description && (
                <div className="sm:col-span-2"><p className="font-medium text-gray-500">Descrição</p>
                  <p className="rounded-lg bg-gray-50 p-2">{selected.description}</p></div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
