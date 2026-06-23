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
import { Modal } from "../../components/ui/Modal";

// Convert an ISO datetime string to YYYY-MM-DD for date inputs
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

export function EditCustomers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState({
    number: "", name: "", email: "", phone: "", notes: "", created_at: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const customers = useQuery({
    queryKey: ["customers", sortBy, sortOrder],
    queryFn: () => api.customers.list({ sort_by: sortBy, sort_order: sortOrder }),
  });

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

  const updateMutation = useMutation({
    mutationFn: () =>
      api.customers.update(selectedCustomer!.id, {
        number: Number(form.number),
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.replace(/\D/g, "") || undefined,
        notes: form.notes.trim() || undefined,
        created_at: form.created_at ? `${form.created_at}T12:00:00` : undefined,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelectedCustomer(updated);
      setMode("view");
      setMessage({ type: "success", text: "✅ Cliente atualizado com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.customers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelectedCustomer(null);
      setMessage({ type: "success", text: "Cliente removido com sucesso!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const openView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setMode("view");
    setMessage(null);
    setErrors({});
  };

  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setForm({
      number: String(customer.number),
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ? formatPhone(customer.phone) : "",
      notes: customer.notes ?? "",
      created_at: toDateInput(customer.created_at),
    });
    setErrors({});
    setMode("edit");
    setMessage(null);
  };

  const filtered = customers.data?.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      String(c.number).includes(search) ||
      (c.phone ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  return (
    <div className="space-y-5">
      <h3 className="page-title">Editar clientes</h3>

      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Buscar (nome, número, telefone, e-mail)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[280px]"
          placeholder="Digite para filtrar..."
        />
        <Select
          label="Ordenar por"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "name", label: "Nome" },
            { value: "number", label: "Número de cadastro" },
            { value: "total_orders", label: "Nº de pedidos" },
            { value: "total_spent", label: "Total gasto" },
            { value: "total_units", label: "Unidades compradas" },
          ]}
        />
        <div className="flex items-end"><SortToggle value={sortOrder} onChange={setSortOrder} /></div>
        <div className="flex items-end">
          <span className="text-sm text-gray-500">
            {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Telefone</th>
              <th className="px-4 py-3 text-left">E-mail</th>
              <th className="px-4 py-3 text-left">Pedidos pagos</th>
              <th className="px-4 py-3 text-left">Total gasto</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                onClick={() => openView(c)}
                className="cursor-pointer border-t border-gray-100 transition hover:bg-brand-pink/10"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{c.number}</td>
                <td className="px-4 py-3 font-semibold">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{c.email ?? "—"}</td>
                <td className="px-4 py-3">{c.total_orders}</td>
                <td className="px-4 py-3 font-medium text-brand-pink-deep">
                  {formatCurrency(c.total_spent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.isLoading && (
          <p className="p-4 text-center text-sm text-gray-400">Carregando...</p>
        )}
        {!customers.isLoading && filtered.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">Nenhum cliente encontrado.</p>
        )}
      </div>

      {/* Detail / Edit Modal */}
      <Modal
        open={!!selectedCustomer}
        onClose={() => { setSelectedCustomer(null); setErrors({}); }}
        title={
          mode === "edit"
            ? `✏️ Editando: ${selectedCustomer?.name}`
            : `👤 Cliente #${selectedCustomer?.number}`
        }
        size="lg"
      >
        {/* ── VIEW MODE ── */}
        {selectedCustomer && mode === "view" && (
          <div className="space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-brand-pink/10 p-3 text-center">
                <p className="text-xs text-gray-500">Pedidos pagos</p>
                <p className="text-xl font-bold text-brand-pink-deep">{selectedCustomer.total_orders}</p>
              </div>
              <div className="rounded-xl bg-brand-yellow/30 p-3 text-center">
                <p className="text-xs text-gray-500">Total gasto</p>
                <p className="text-xl font-bold text-yellow-800">{formatCurrency(selectedCustomer.total_spent)}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-center">
                <p className="text-xs text-gray-500">Unidades</p>
                <p className="text-xl font-bold text-green-700">{selectedCustomer.total_units}</p>
              </div>
            </div>

            {/* Info */}
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium text-gray-500">Número</p>
                <p>#{selectedCustomer.number}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Nome</p>
                <p className="font-semibold">{selectedCustomer.name}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Telefone</p>
                <p>{selectedCustomer.phone ? formatPhone(selectedCustomer.phone) : "—"}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">E-mail</p>
                <p>{selectedCustomer.email ?? "—"}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Cadastrado em</p>
                <p>{formatDate(selectedCustomer.created_at)}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Atualizado em</p>
                <p>{formatDate(selectedCustomer.updated_at)}</p>
              </div>
              {selectedCustomer.notes && (
                <div className="sm:col-span-2">
                  <p className="font-medium text-gray-500">Observações</p>
                  <p className="rounded-lg bg-gray-50 p-2">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <Button onClick={() => openEdit(selectedCustomer)} variant="secondary">✏️ Editar</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Remover cliente "${selectedCustomer.name}"? Esta ação não pode ser desfeita.`))
                    deleteMutation.mutate(selectedCustomer.id);
                }}
                loading={deleteMutation.isPending}
              >
                🗑️ Excluir
              </Button>
              <Button variant="ghost" onClick={() => setSelectedCustomer(null)} className="ml-auto">
                Fechar
              </Button>
            </div>
          </div>
        )}

        {/* ── EDIT MODE ── */}
        {selectedCustomer && mode === "edit" && (
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
                  label="Número do cliente"
                  icon="🔢"
                  type="number"
                  min={1}
                  required
                  value={form.number}
                  error={errors.number}
                  hint="Código numérico único"
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setForm((f) => ({ ...f, number: val }));
                    if (errors.number) setErrors((er) => ({ ...er, number: undefined }));
                  }}
                />
                <Input
                  label="Nome completo"
                  icon="✏️"
                  type="text"
                  required
                  maxLength={255}
                  placeholder="Nome completo do cliente"
                  value={form.name}
                  error={errors.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
                  }}
                />

                {/* Data de cadastro (full width) */}
                <div className="sm:col-span-2">
                  <Input
                    label="Data de cadastro"
                    icon="📅"
                    type="date"
                    required
                    value={form.created_at}
                    error={errors.created_at}
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
                  label="Telefone / WhatsApp"
                  icon="📱"
                  type="tel"
                  placeholder="(11) 91234-5678"
                  value={form.phone}
                  error={errors.phone}
                  hint="Com DDD, sem espaços"
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setForm((f) => ({ ...f, phone: formatted }));
                    if (errors.phone) setErrors((er) => ({ ...er, phone: undefined }));
                  }}
                />
                <Input
                  label="E-mail"
                  icon="✉️"
                  type="email"
                  placeholder="exemplo@email.com"
                  value={form.email}
                  error={errors.email}
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
                  rows={3}
                  maxLength={500}
                  placeholder="Preferências, restrições, histórico especial..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border-2 border-brand-pink/40 bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none transition-all placeholder:font-normal placeholder:text-gray-300 hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30 resize-none"
                />
                <p className="text-right text-xs text-gray-400">{form.notes.length}/500</p>
              </div>
            </div>

            {/* Actions */}
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
