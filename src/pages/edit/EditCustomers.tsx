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

export function EditCustomers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState({ number: "", name: "", email: "", phone: "", notes: "" });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const customers = useQuery({
    queryKey: ["customers", sortBy, sortOrder],
    queryFn: () => api.customers.list({ sort_by: sortBy, sort_order: sortOrder }),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.customers.update(selectedCustomer!.id, {
        number: Number(form.number),
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setMode("view");
      setMessage({ type: "success", text: "Cliente atualizado com sucesso!" });
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
  };

  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setForm({
      number: String(customer.number),
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      notes: customer.notes ?? "",
    });
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
        onClose={() => setSelectedCustomer(null)}
        title={mode === "edit" ? `Editando: ${selectedCustomer?.name}` : `Cliente #${selectedCustomer?.number}`}
        size="lg"
      >
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
                <p>{selectedCustomer.phone ?? "—"}</p>
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
            <div className="flex gap-2 border-t border-gray-100 pt-4">
              <Button onClick={() => openEdit(selectedCustomer)} variant="secondary">
                ✏️ Editar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Remover cliente ${selectedCustomer.name}?`))
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

        {selectedCustomer && mode === "edit" && (
          <form
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }}
            className="space-y-4"
          >
            {message && (
              <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Número" type="number" required value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })} />
              <Input label="Nome" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="E-mail" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Telefone" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-xl border border-brand-pink/50 px-3 py-2 text-sm outline-none focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30"
              />
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
