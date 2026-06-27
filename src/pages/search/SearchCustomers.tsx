import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Customer, SortOrder } from "../../types";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SortToggle } from "../../components/ui/SortToggle";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";

// Convert ISO datetime string to YYYY-MM-DD for date inputs
function toDateInput(iso: string | Date | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Phone formatting helper (e.g. 11912345678 → (11) 91234-5678)
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function SearchCustomers() {
  const queryClient = useQueryClient();

  // ─── List filters ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [minSpent, setMinSpent] = useState("");
  const [maxSpent, setMaxSpent] = useState("");
  const [minOrders, setMinOrders] = useState("");
  const [minUnits, setMinUnits] = useState("");
  const [hasEmail, setHasEmail] = useState("");
  const [hasPhone, setHasPhone] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ─── Modal state ─────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Customer | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ─── Edit form ───────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    number: "", name: "", email: "", phone: "", notes: "", created_at: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const listQuery = useQuery({
    queryKey: ["customers", search, sortBy, sortOrder],
    queryFn: () => api.customers.list({ search: search || undefined, sort_by: sortBy, sort_order: sortOrder }),
  });

  const detailQuery = useQuery({
    queryKey: ["customer-full-detail", selected?.id],
    queryFn: () => api.customers.get(selected!.id),
    enabled: !!selected && mode === "view",
  });

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: () =>
      api.customers.update(selected!.id, {
        number: Number(form.number),
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.replace(/\D/g, "") || undefined,
        notes: form.notes.trim() || undefined,
        created_at: form.created_at ? `${form.created_at}T12:00:00` : undefined,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelected(updated);
      setMode("view");
      setMessage({ type: "success", text: "✅ Cliente atualizado com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.customers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelected(null);
      setMessage({ type: "success", text: "Cliente removido com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof typeof form, string>> = {};
    if (!form.number || Number(form.number) < 1) newErrors.number = "Número inválido (mín. 1)";
    if (!form.name.trim()) newErrors.name = "Nome é obrigatório";
    else if (form.name.trim().length < 2) newErrors.name = "Nome muito curto";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "E-mail inválido";
    if (form.phone && form.phone.replace(/\D/g, "").length < 10)
      newErrors.phone = "Telefone incompleto (mín. 10 dígitos)";
    if (!form.created_at) newErrors.created_at = "Data de cadastro é obrigatória";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openView = (c: Customer) => {
    setSelected(c); setMode("view"); setMessage(null); setErrors({});
  };

  const openEdit = (c: Customer) => {
    setSelected(c);
    setForm({
      number: String(c.number),
      name: c.name,
      email: c.email ?? "",
      phone: c.phone ? formatPhone(c.phone) : "",
      notes: c.notes ?? "",
      created_at: toDateInput(c.created_at),
    });
    setErrors({});
    setMode("edit");
    setMessage(null);
  };

  const clearFilters = () => {
    setSearch(""); setMinSpent(""); setMaxSpent("");
    setMinOrders(""); setMinUnits(""); setHasEmail(""); setHasPhone("");
  };

  // ─── Derived data ─────────────────────────────────────────────────────────────
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

  const activeFilterCount = [minSpent, maxSpent, minOrders, minUnits, hasEmail, hasPhone].filter(Boolean).length;

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

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
            { value: "number", label: "Número de cadastro" },
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

      <p className="text-sm text-gray-500">{filtered.length} cliente{filtered.length !== 1 ? "s" : ""} • Clique para detalhes</p>

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
              <tr key={c.id} onClick={() => openView(c)}
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

      {/* Detail / Edit Modal */}
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setMode("view"); setErrors({}); }}
        title={
          mode === "edit"
            ? `✏️ Editando: ${selected?.name}`
            : `👤 Cliente #${selected?.number} — ${selected?.name}`
        }
        size="xl"
      >
        {/* ── VIEW MODE ── */}
        {selected && mode === "view" && (
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
              <div><p className="font-medium text-gray-500">Telefone</p><p>{selected.phone ? formatPhone(selected.phone) : "—"}</p></div>
              <div><p className="font-medium text-gray-500">E-mail</p><p>{selected.email ?? "—"}</p></div>
              <div><p className="font-medium text-gray-500">Cadastrado em</p><p>{formatDate(selected.created_at)}</p></div>
              <div><p className="font-medium text-gray-500">Atualizado em</p><p>{formatDate(selected.updated_at)}</p></div>
              {selected.notes && (
                <div className="sm:col-span-2">
                  <p className="font-medium text-gray-500">Observações</p>
                  <p className="rounded-lg bg-gray-50 p-2">{selected.notes}</p>
                </div>
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

            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <Button onClick={() => openEdit(selected)} variant="secondary">✏️ Editar</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Remover cliente "${selected.name}"? Esta ação não pode ser desfeita.`))
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

            {/* Card: Dados básicos */}
            <div className="rounded-2xl border border-brand-pink/20 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-pink/20 text-sm">👤</span>
                <h4 className="font-semibold text-brand-pink-deep">Dados básicos</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Número do cliente" icon="🔢" type="number" min={1} required
                  value={form.number} error={errors.number} hint="Código numérico único"
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setForm((f) => ({ ...f, number: val }));
                    if (errors.number) setErrors((er) => ({ ...er, number: undefined }));
                  }}
                />
                <Input
                  label="Nome completo" icon="✏️" type="text" required maxLength={255}
                  placeholder="Nome completo do cliente"
                  value={form.name} error={errors.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
                  }}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Data de cadastro" icon="📅" type="date" required
                    value={form.created_at} error={errors.created_at}
                    hint="Data original de cadastro do cliente"
                    onChange={(e) => {
                      setForm((f) => ({ ...f, created_at: e.target.value }));
                      if (errors.created_at) setErrors((er) => ({ ...er, created_at: undefined }));
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Card: Contato */}
            <div className="rounded-2xl border border-brand-pink/20 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-yellow/40 text-sm">📞</span>
                <h4 className="font-semibold text-brand-pink-deep">Contato</h4>
                <span className="ml-auto text-xs text-gray-400">Opcional</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Telefone / WhatsApp" icon="📱" type="tel"
                  placeholder="(11) 91234-5678"
                  value={form.phone} error={errors.phone} hint="Com DDD, sem espaços"
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setForm((f) => ({ ...f, phone: formatted }));
                    if (errors.phone) setErrors((er) => ({ ...er, phone: undefined }));
                  }}
                />
                <Input
                  label="E-mail" icon="✉️" type="email"
                  placeholder="exemplo@email.com"
                  value={form.email} error={errors.email}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }));
                    if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
                  }}
                />
              </div>
            </div>

            {/* Card: Observações */}
            <div className="rounded-2xl border border-brand-pink/20 bg-gray-50 p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-sm">📝</span>
                <h4 className="font-semibold text-brand-pink-deep">Observações</h4>
                <span className="ml-auto text-xs text-gray-400">Opcional</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">📄 Notas sobre o cliente</label>
                <textarea
                  rows={3} maxLength={500}
                  placeholder="Preferências, restrições, histórico especial..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border-2 border-brand-pink/40 bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none transition-all placeholder:font-normal placeholder:text-gray-300 hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30 resize-none"
                />
                <p className="text-right text-xs text-gray-400">{form.notes.length}/500</p>
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
