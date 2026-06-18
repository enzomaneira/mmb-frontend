import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  type Order, type OrderStatus, type SortOrder
} from "../../types";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SortToggle } from "../../components/ui/SortToggle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export function SearchOrders() {
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  // Local filters
  const [activeStatuses, setActiveStatuses] = useState<Set<OrderStatus>>(new Set());
  const [searchNumber, setSearchNumber] = useState("");
  const [minItems, setMinItems] = useState("");
  const [maxItems, setMaxItems] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  const customers = useQuery({
    queryKey: ["customers-list"],
    queryFn: () => api.customers.list(),
  });
  const customerMap = new Map(customers.data?.map((c) => [c.id, c]) ?? []);

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

  const toggleStatus = (s: OrderStatus) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const filtered = (query.data ?? []).filter((o) => {
    if (activeStatuses.size > 0 && !activeStatuses.has(o.status)) return false;
    if (searchNumber && !String(o.number).includes(searchNumber)) return false;
    if (minItems && o.items.length < parseInt(minItems)) return false;
    if (maxItems && o.items.length > parseInt(maxItems)) return false;
    return true;
  });

  // Summary stats
  const totalValue = filtered.reduce((s, o) => s + parseFloat(o.total), 0);
  const avgValue = filtered.length > 0 ? totalValue / filtered.length : 0;

  const clearFilters = () => {
    setMinTotal(""); setMaxTotal(""); setStartDate(""); setEndDate("");
    setSearchNumber(""); setMinItems(""); setMaxItems(""); setActiveStatuses(new Set());
  };

  const activeFilterCount = [minTotal, maxTotal, startDate, endDate, searchNumber, minItems, maxItems].filter(Boolean).length + activeStatuses.size;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="page-title">Buscar pedidos</h3>
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

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button key={s}
            onClick={() => toggleStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
              activeStatuses.has(s) ? "ring-2 ring-offset-1 ring-brand-pink-deep" : "opacity-75 hover:opacity-100"
            } ${ORDER_STATUS_COLORS[s]}`}
          >
            {ORDER_STATUS_LABELS[s]}
          </button>
        ))}
        {activeStatuses.size > 0 && (
          <button onClick={() => setActiveStatuses(new Set())}
            className="rounded-full px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700">
            ✕ Limpar status
          </button>
        )}
      </div>

      {/* Primary search row */}
      <div className="flex flex-wrap items-end gap-3">
        <Input label="Número do pedido" value={searchNumber}
          onChange={(e) => setSearchNumber(e.target.value)} className="w-40" placeholder="#..." />
        <Select label="Ordenar por" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
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
              <tr key={o.id} onClick={() => setSelected(o)}
                className="cursor-pointer border-t border-gray-100 hover:bg-brand-pink/10 transition">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.number}</td>
                <td className="px-4 py-3">
                  {customerMap.get(o.customer_id)?.name ?? `Cliente #${o.customer_id}`}
                </td>
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

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={`Pedido #${selected?.number}`} size="lg">
        {selected && (
          <div className="space-y-5">
            {/* Customer info */}
            {customerMap.get(selected.customer_id) && (
              <div className="rounded-xl bg-brand-yellow/20 px-4 py-3">
                <p className="text-xs text-gray-500 font-medium">Cliente</p>
                <p className="font-semibold text-brand-pink-deep">
                  {customerMap.get(selected.customer_id)!.name}
                </p>
                <p className="text-sm text-gray-600">
                  {customerMap.get(selected.customer_id)!.phone ?? ""}
                  {customerMap.get(selected.customer_id)!.email ? ` · ${customerMap.get(selected.customer_id)!.email}` : ""}
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

            {/* Items */}
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
                          {item.product_name ?? `Produto #${item.product_id}`}
                        </span>
                        {item.product_number && (
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
                {selected.status_history.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 text-sm">
                    <StatusBadge status={h.status} />
                    <span className="text-gray-500">{formatDate(h.changed_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
