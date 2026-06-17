import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Customer, SortOrder } from "../../types";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SortToggle } from "../../components/ui/SortToggle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

export function SearchCustomers() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  // Local additional filters
  const [minSpent, setMinSpent] = useState("");
  const [maxSpent, setMaxSpent] = useState("");
  const [minOrders, setMinOrders] = useState("");
  const [minUnits, setMinUnits] = useState("");
  const [hasEmail, setHasEmail] = useState("");
  const [hasPhone, setHasPhone] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);

  const listQuery = useQuery({
    queryKey: ["customers", search, sortBy, sortOrder],
    queryFn: () => api.customers.list({ search: search || undefined, sort_by: sortBy, sort_order: sortOrder }),
  });

  const detailQuery = useQuery({
    queryKey: ["customer-full-detail", selected?.id],
    queryFn: () => api.customers.get(selected!.id),
    enabled: !!selected,
  });

  const filtered = (listQuery.data ?? []).filter((c) => {
    const spent = parseFloat(c.total_spent);
    if (minSpent && spent < parseFloat(minSpent)) return false;
    if (maxSpent && spent > parseFloat(maxSpent)) return false;
    if (minOrders && c.total_orders < parseInt(minOrders)) return false;
    if (minUnits && c.total_units < parseInt(minUnits)) return false;
    if (hasEmail === "yes" && !c.email) return false;
    if (hasEmail === "no" && c.email) return false;
    if (hasPhone === "yes" && !c.phone) return false;
    if (hasPhone === "no" && c.phone) return false;
    return true;
  });

  const clearFilters = () => {
    setSearch(""); setMinSpent(""); setMaxSpent("");
    setMinOrders(""); setMinUnits(""); setHasEmail(""); setHasPhone("");
  };

  const activeFilterCount = [minSpent, maxSpent, minOrders, minUnits, hasEmail, hasPhone].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="page-title">Buscar clientes</h3>
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

      {/* Primary search row */}
      <div className="flex flex-wrap items-end gap-3">
        <Input label="Buscar (nome, e-mail, telefone)" value={search}
          onChange={(e) => setSearch(e.target.value)} className="min-w-[250px]" placeholder="Digite para buscar..." />
        <Select label="Ordenar por" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "name", label: "Nome" },
            { value: "total_orders", label: "Nº de pedidos" },
            { value: "total_spent", label: "Total gasto" },
            { value: "total_units", label: "Unidades compradas" },
          ]}
        />
        <div className="flex items-end"><SortToggle value={sortOrder} onChange={setSortOrder} /></div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="rounded-xl border border-brand-pink/20 bg-brand-pink/5 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Filtros avançados (aplicados localmente)</p>
          <div className="flex flex-wrap gap-3">
            <Input label="Total gasto mín. (R$)" type="number" step="0.01" value={minSpent}
              onChange={(e) => setMinSpent(e.target.value)} className="w-40" />
            <Input label="Total gasto máx. (R$)" type="number" step="0.01" value={maxSpent}
              onChange={(e) => setMaxSpent(e.target.value)} className="w-40" />
            <Input label="Mínimo de pedidos" type="number" min={0} value={minOrders}
              onChange={(e) => setMinOrders(e.target.value)} className="w-36" />
            <Input label="Mínimo de unidades" type="number" min={0} value={minUnits}
              onChange={(e) => setMinUnits(e.target.value)} className="w-36" />
            <Select label="Tem e-mail?" value={hasEmail} onChange={(e) => setHasEmail(e.target.value)}
              options={[{ value: "", label: "Todos" }, { value: "yes", label: "Com e-mail" }, { value: "no", label: "Sem e-mail" }]} />
            <Select label="Tem telefone?" value={hasPhone} onChange={(e) => setHasPhone(e.target.value)}
              options={[{ value: "", label: "Todos" }, { value: "yes", label: "Com telefone" }, { value: "no", label: "Sem telefone" }]} />
            <div className="flex items-end">
              <Button variant="ghost" className="text-xs" onClick={clearFilters}>Limpar filtros</Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">{filtered.length} cliente{filtered.length !== 1 ? "s" : ""} • Clique para ver detalhes</p>

      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Telefone</th>
              <th className="px-4 py-3 text-left">E-mail</th>
              <th className="px-4 py-3 text-left">Pedidos</th>
              <th className="px-4 py-3 text-left">Total gasto</th>
              <th className="px-4 py-3 text-left">Unidades</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => setSelected(c)}
                className="cursor-pointer border-t border-gray-100 hover:bg-brand-pink/10 transition">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{c.number}</td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{c.email ?? "—"}</td>
                <td className="px-4 py-3">{c.total_orders}</td>
                <td className="px-4 py-3 font-semibold text-brand-pink-deep">{formatCurrency(c.total_spent)}</td>
                <td className="px-4 py-3">{c.total_units}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {listQuery.isLoading && <p className="p-4 text-center text-sm text-gray-400">Carregando...</p>}
        {!listQuery.isLoading && filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">Nenhum cliente encontrado.</p>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)}
        title={`Cliente #${selected?.number} — ${selected?.name}`} size="xl">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-brand-pink/10 p-3 text-center">
                <p className="text-xs text-gray-500">Pedidos pagos</p>
                <p className="text-2xl font-bold text-brand-pink-deep">{selected.total_orders}</p>
              </div>
              <div className="rounded-xl bg-brand-yellow/30 p-3 text-center">
                <p className="text-xs text-gray-500">Total gasto</p>
                <p className="text-xl font-bold text-yellow-800">{formatCurrency(selected.total_spent)}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-center">
                <p className="text-xs text-gray-500">Unidades</p>
                <p className="text-2xl font-bold text-green-700">{selected.total_units}</p>
              </div>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div><p className="font-medium text-gray-500">Telefone</p><p>{selected.phone ?? "—"}</p></div>
              <div><p className="font-medium text-gray-500">E-mail</p><p>{selected.email ?? "—"}</p></div>
              <div><p className="font-medium text-gray-500">Cadastrado em</p><p>{formatDate(selected.created_at)}</p></div>
              <div><p className="font-medium text-gray-500">Atualizado em</p><p>{formatDate(selected.updated_at)}</p></div>
              {selected.notes && (
                <div className="sm:col-span-2"><p className="font-medium text-gray-500">Observações</p>
                  <p className="rounded-lg bg-gray-50 p-2">{selected.notes}</p></div>
              )}
            </div>

            {/* Orders list */}
            {detailQuery.isLoading ? (
              <p className="text-sm text-gray-400">Carregando pedidos...</p>
            ) : detailQuery.data?.orders && detailQuery.data.orders.length > 0 ? (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-600">Pedidos ({detailQuery.data.orders.length})</h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Nº</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailQuery.data.orders.map((o) => (
                      <tr key={o.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">#{o.number}</td>
                        <td className="px-3 py-2">{formatDate(o.created_at)}</td>
                        <td className="px-3 py-2"><StatusBadge status={o.status} /></td>
                        <td className="px-3 py-2 font-semibold">{formatCurrency(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sem pedidos registrados.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
