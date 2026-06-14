import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export function EditCustomers() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ number: "", name: "", email: "", phone: "", notes: "" });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.customers.list({ sort_by: "name" }),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.customers.update(editingId!, {
        number: Number(form.number),
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setEditingId(null);
      setMessage({ type: "success", text: "Cliente atualizado!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.customers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setMessage({ type: "success", text: "Cliente removido!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const startEdit = (customer: NonNullable<typeof customers.data>[number]) => {
    setEditingId(customer.id);
    setForm({
      number: String(customer.number),
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      notes: customer.notes ?? "",
    });
    setMessage(null);
  };

  return (
    <div className="space-y-6">
      <h3 className="page-title">Editar clientes</h3>
      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {editingId && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="rounded-xl border border-brand-pink/40 bg-brand-pink/5 p-4 space-y-3"
        >
          <h4 className="font-semibold">Editando cliente</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Número" type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2">
            <Button type="submit" loading={updateMutation.isPending}>Salvar</Button>
            <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-brand-pink/30">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Telefone</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {customers.data?.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{c.number}</td>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="secondary" className="text-xs" onClick={() => startEdit(c)}>Editar</Button>
                    <Button
                      variant="danger"
                      className="text-xs"
                      onClick={() => {
                        if (confirm(`Remover cliente ${c.name}?`)) deleteMutation.mutate(c.id);
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
