import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import type { SortOrder } from "../../types";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SortToggle } from "../../components/ui/SortToggle";
import { StatusBadge } from "../../components/ui/StatusBadge";

export function SearchCustomers() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedNumber, setSelectedNumber] = useState("");
  const [detailNumber, setDetailNumber] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: ["customers", search, sortBy, sortOrder],
    queryFn: () =>
      api.customers.list({ search: search || undefined, sort_by: sortBy, sort_order: sortOrder }),
  });

  const detailQuery = useQuery({
    queryKey: ["customer-detail", detailNumber],
    queryFn: () => api.customers.getByNumber(detailNumber!),
    enabled: detailNumber !== null,
  });

  const handleSearchByNumber = () => {
    const num = Number(selectedNumber);
    if (num > 0) setDetailNumber(num);
  };

  return (
    <div className="space-y-6">
      <h3 className="page-title">Buscar clientes</h3>

      <div className="grid gap-4 rounded-xl bg-brand-yellow/20 p-4 sm:grid-cols-[1fr_auto]">
        <Input
          label="Buscar por número do cliente"
          type="number"
          value={selectedNumber}
          onChange={(e) => setSelectedNumber(e.target.value)}
        />
        <button
          type="button"
          onClick={handleSearchByNumber}
          className="self-end rounded-xl bg-brand-pink-deep px-4 py-2 text-sm font-semibold text-white"
        >
          Buscar
        </button>
      </div>

      {detailQuery.data && (
        <div className="rounded-xl border border-brand-pink/40 bg-white p-4">
          <h4 className="mb-2 font-semibold text-brand-pink-deep">
            Cliente #{detailQuery.data.number} — {detailQuery.data.name}
          </h4>
          <p className="text-sm text-gray-600">
            Total gasto: {formatCurrency(detailQuery.data.total_spent)} ·{" "}
            {detailQuery.data.total_orders} pedidos · {detailQuery.data.total_units} unidades
          </p>
          {detailQuery.data.orders.length > 0 && (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">Pedido</th>
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {detailQuery.data.orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100">
                    <td className="py-2">#{order.number}</td>
                    <td className="py-2">{formatDate(order.created_at)}</td>
                    <td className="py-2"><StatusBadge status={order.status} /></td>
                    <td className="py-2">{formatCurrency(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <Input
          label="Filtrar por nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px]"
        />
        <Select
          label="Ordenar por"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "name", label: "Nome" },
            { value: "total_orders", label: "Compras" },
            { value: "total_spent", label: "Valor gasto" },
            { value: "total_units", label: "Unidades" },
          ]}
        />
        <SortToggle value={sortOrder} onChange={setSortOrder} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Pedidos</th>
              <th className="px-4 py-3 text-left">Gasto</th>
              <th className="px-4 py-3 text-left">Unidades</th>
            </tr>
          </thead>
          <tbody>
            {listQuery.data?.map((c) => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-brand-cream">
                <td className="px-4 py-3">{c.number}</td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.total_orders}</td>
                <td className="px-4 py-3">{formatCurrency(c.total_spent)}</td>
                <td className="px-4 py-3">{c.total_units}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {listQuery.isLoading && (
          <p className="p-4 text-center text-gray-500">Carregando...</p>
        )}
      </div>
    </div>
  );
}
