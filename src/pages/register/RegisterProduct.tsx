import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { PRODUCT_TYPE_LABELS, type ProductType } from "../../types";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

const productTypeOptions = Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function RegisterProduct() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    number: "",
    name: "",
    description: "",
    product_type: "TOYS" as ProductType,
    price: "",
    stock_quantity: "0",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.products.create({
        number: Number(form.number),
        name: form.name,
        description: form.description || undefined,
        product_type: form.product_type,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setMessage({ type: "success", text: "Produto cadastrado com sucesso!" });
      setForm({
        number: "",
        name: "",
        description: "",
        product_type: "TOYS",
        price: "",
        stock_quantity: "0",
      });
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        mutation.mutate();
      }}
      className="mx-auto max-w-lg space-y-4"
    >
      <h3 className="page-title">Cadastrar produto</h3>
      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}
      <Input
        label="Número"
        type="number"
        min={1}
        required
        value={form.number}
        onChange={(e) => setForm({ ...form, number: e.target.value })}
      />
      <Input
        label="Nome"
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <Input
        label="Descrição"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <Select
        label="Tipo"
        value={form.product_type}
        onChange={(e) =>
          setForm({ ...form, product_type: e.target.value as ProductType })
        }
        options={productTypeOptions}
      />
      <Input
        label="Preço (R$)"
        type="number"
        min={0}
        step="0.01"
        required
        value={form.price}
        onChange={(e) => setForm({ ...form, price: e.target.value })}
      />
      <Input
        label="Estoque inicial"
        type="number"
        min={0}
        value={form.stock_quantity}
        onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
      />
      <Button type="submit" loading={mutation.isPending}>
        Salvar produto
      </Button>
    </form>
  );
}
