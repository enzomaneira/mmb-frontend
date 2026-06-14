import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import type { SortOrder } from "../../types";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SortToggle } from "../../components/ui/SortToggle";
import { StatusBadge } from "../../components/ui/StatusBadge";

export function SearchOrders() {
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.customers.list(),
  });

  const customerMap = new Map(
    customers.data?.map((c) => [c.id, c.name]) ?? [],
  );

  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const query = useQuery({
    queryKey: ["orders", minTotal, maxTotal, startDate, endDate, sortBy, sortOrder],
    queryFn: () =>
      api.orders.list({
        min_total: minTotal ? Number(minTotal) : undefined,
        max_total: maxTotal ? Number(maxTotal) : undefined,
        start_date: startDate ? `${startDate}T00:00:00` : undefined,
        end_date: endDate ? `${endDate}T23:59:59` : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
  });

  return (
    <div className="space-y-6">
      <h3 className="page-title">Buscar pedidos</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Valor mín."
          type="number"
          min={0}
          value={minTotal}
          onChange={(e) => setMinTotal(e.target.value)}
        />
        <Input
          label="Valor máx."
          type="number"
          min={0}
          value={maxTotal}
          onChange={(e) => setMaxTotal(e.target.value)}
        />
        <Input
          label="Data início"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          label="Data fim"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
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
        <div className="flex items-end">
          <SortToggle value={sortOrder} onChange={setSortOrder} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Total</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.map((order) => (
              <tr key={order.id} className="border-t border-gray-100 hover:bg-brand-cream">
                <td className="px-4 py-3">#{order.number}</td>
                <td className="px-4 py-3">
                  {customerMap.get(order.customer_id) ?? `Cliente #${order.customer_id}`}
                </td>
                <td className="px-4 py-3">{formatDate(order.created_at)}</td>
                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                <td className="px-4 py-3">{formatCurrency(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.isLoading && (
          <p className="p-4 text-center text-gray-500">Carregando...</p>
        )}
      </div>
    </div>
  );
}
