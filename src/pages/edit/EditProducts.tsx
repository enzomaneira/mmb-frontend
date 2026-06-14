import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { PRODUCT_TYPE_LABELS, type ProductType } from "../../types";
import { formatCurrency } from "../../lib/format";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

const typeOptions = Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function EditProducts() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    number: "",
    name: "",
    description: "",
    product_type: "TOYS" as ProductType,
    price: "",
    stock_quantity: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => api.products.list({ sort_by: "name" }),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.products.update(editingId!, {
        number: Number(form.number),
        name: form.name,
        description: form.description || undefined,
        product_type: form.product_type,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingId(null);
      setMessage({ type: "success", text: "Produto atualizado!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setMessage({ type: "success", text: "Produto removido!" });
    },
    onError: (err: Error) => setMessage({ type: "error", text: err.message }),
  });

  const startEdit = (product: NonNullable<typeof products.data>[number]) => {
    setEditingId(product.id);
    setForm({
      number: String(product.number),
      name: product.name,
      description: product.description ?? "",
      product_type: product.product_type,
      price: product.price,
      stock_quantity: String(product.stock_quantity),
    });
    setMessage(null);
  };

  return (
    <div className="space-y-6">
      <h3 className="page-title">Editar produtos</h3>
      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {editingId && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="space-y-3 rounded-xl border border-brand-pink/40 bg-brand-pink/5 p-4"
        >
          <h4 className="font-semibold">Editando produto</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Número" type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="Tipo" value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value as ProductType })} options={typeOptions} />
            <Input label="Preço" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <Input label="Estoque" type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
          </div>
          <Input label="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
              <th className="px-4 py-3 text-left">Preço</th>
              <th className="px-4 py-3 text-left">Estoque</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.data?.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{p.number}</td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                <td className="px-4 py-3">{p.stock_quantity}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="secondary" className="text-xs" onClick={() => startEdit(p)}>Editar</Button>
                    <Button
                      variant="danger"
                      className="text-xs"
                      onClick={() => {
                        if (confirm(`Remover produto ${p.name}?`)) deleteMutation.mutate(p.id);
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
