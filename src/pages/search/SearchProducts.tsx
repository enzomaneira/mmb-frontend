import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { PRODUCT_TYPE_LABELS, type ProductType, type SortOrder } from "../../types";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SortToggle } from "../../components/ui/SortToggle";

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
  const [detailNumber, setDetailNumber] = useState("");
  const [showDetail, setShowDetail] = useState<number | null>(null);

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
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  const detailQuery = useQuery({
    queryKey: ["product-detail", showDetail],
    queryFn: () => api.products.getByNumber(showDetail!),
    enabled: showDetail !== null,
  });

  return (
    <div className="space-y-6">
      <h3 className="page-title">Buscar produtos</h3>

      <div className="grid gap-4 rounded-xl bg-brand-yellow/20 p-4 sm:grid-cols-[1fr_auto]">
        <Input
          label="Buscar por número do produto"
          type="number"
          value={detailNumber}
          onChange={(e) => setDetailNumber(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowDetail(Number(detailNumber) || null)}
          className="self-end rounded-xl bg-brand-pink-deep px-4 py-2 text-sm font-semibold text-white"
        >
          Buscar
        </button>
      </div>

      {detailQuery.data && (
        <div className="rounded-xl border border-brand-pink/40 bg-white p-4">
          <h4 className="font-semibold text-brand-pink-deep">
            #{detailQuery.data.number} — {detailQuery.data.name}
          </h4>
          <div className="mt-2 grid gap-1 text-sm text-gray-600 sm:grid-cols-2">
            <p>Tipo: {PRODUCT_TYPE_LABELS[detailQuery.data.product_type]}</p>
            <p>Preço: {formatCurrency(detailQuery.data.price)}</p>
            <p>Estoque: {detailQuery.data.stock_quantity}</p>
            <p>Vendidos: {detailQuery.data.units_sold}</p>
            <p>Receita: {formatCurrency(detailQuery.data.revenue)}</p>
            {detailQuery.data.description && (
              <p className="sm:col-span-2">{detailQuery.data.description}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Nome" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select
          label="Tipo"
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
          options={typeOptions}
        />
        <Input
          label="Preço mín."
          type="number"
          min={0}
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <Input
          label="Preço máx."
          type="number"
          min={0}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <Input
          label="Vendas mín."
          type="number"
          min={0}
          value={minUnits}
          onChange={(e) => setMinUnits(e.target.value)}
        />
        <Input
          label="Vendas máx."
          type="number"
          min={0}
          value={maxUnits}
          onChange={(e) => setMaxUnits(e.target.value)}
        />
        <Select
          label="Ordenar por"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "name", label: "Nome" },
            { value: "price", label: "Preço" },
            { value: "units_sold", label: "Unidades vendidas" },
            { value: "revenue", label: "Receita" },
            { value: "stock_quantity", label: "Estoque" },
          ]}
        />
        <div className="flex items-end">
          <SortToggle value={sortOrder} onChange={setSortOrder} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Preço</th>
              <th className="px-4 py-3 text-left">Vendidos</th>
              <th className="px-4 py-3 text-left">Receita</th>
            </tr>
          </thead>
          <tbody>
            {listQuery.data?.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-brand-cream">
                <td className="px-4 py-3">{p.number}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{PRODUCT_TYPE_LABELS[p.product_type]}</td>
                <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                <td className="px-4 py-3">{p.units_sold}</td>
                <td className="px-4 py-3">{formatCurrency(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
