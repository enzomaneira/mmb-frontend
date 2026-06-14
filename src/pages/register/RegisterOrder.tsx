import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { ORDER_STATUS_LABELS, type OrderStatus } from "../../types";
import { formatCurrency } from "../../lib/format";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

interface OrderItemForm {
  product_id: string;
  quantity: string;
}

export function RegisterOrder() {
  const queryClient = useQueryClient();
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.customers.list() });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.products.list() });

  const [number, setNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState<OrderStatus>("PENDING");
  const [items, setItems] = useState<OrderItemForm[]>([
    { product_id: "", quantity: "1" },
  ]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.orders.create({
        number: Number(number),
        customer_id: Number(customerId),
        status,
        items: items.map((i) => ({
          product_id: Number(i.product_id),
          quantity: Number(i.quantity),
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setMessage({ type: "success", text: "Pedido cadastrado com sucesso!" });
      setNumber("");
      setCustomerId("");
      setStatus("PENDING");
      setItems([{ product_id: "", quantity: "1" }]);
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  const estimatedTotal = items.reduce((sum, item) => {
    const product = products.data?.find((p) => p.id === Number(item.product_id));
    if (!product) return sum;
    return sum + parseFloat(product.price) * Number(item.quantity || 0);
  }, 0);

  const customerOptions = [
    { value: "", label: "Selecione um cliente" },
    ...(customers.data?.map((c) => ({
      value: String(c.id),
      label: `#${c.number} — ${c.name}`,
    })) ?? []),
  ];

  const productOptions = [
    { value: "", label: "Selecione um produto" },
    ...(products.data?.map((p) => ({
      value: String(p.id),
      label: `#${p.number} — ${p.name} (${formatCurrency(p.price)})`,
    })) ?? []),
  ];

  const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        mutation.mutate();
      }}
      className="mx-auto max-w-2xl space-y-4"
    >
      <h3 className="page-title">Cadastrar pedido</h3>
      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Número do pedido"
          type="number"
          min={1}
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <Select
          label="Cliente"
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={customerOptions}
        />
      </div>

      <Select
        label="Status inicial"
        value={status}
        onChange={(e) => setStatus(e.target.value as OrderStatus)}
        options={statusOptions}
      />

      <div className="space-y-3 rounded-xl border border-brand-pink/30 bg-brand-pink/5 p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-brand-pink-deep">Itens do pedido</h4>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setItems([...items, { product_id: "", quantity: "1" }])}
          >
            + Adicionar item
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <Select
              label={index === 0 ? "Produto" : undefined}
              value={item.product_id}
              onChange={(e) => {
                const next = [...items];
                next[index].product_id = e.target.value;
                setItems(next);
              }}
              options={productOptions}
            />
            <Input
              label={index === 0 ? "Qtd" : undefined}
              type="number"
              min={1}
              required
              value={item.quantity}
              onChange={(e) => {
                const next = [...items];
                next[index].quantity = e.target.value;
                setItems(next);
              }}
            />
            {items.length > 1 && (
              <Button
                type="button"
                variant="danger"
                className="self-end"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                Remover
              </Button>
            )}
          </div>
        ))}

        <p className="text-right text-sm font-semibold text-brand-pink-deep">
          Total estimado: {formatCurrency(estimatedTotal)}
        </p>
      </div>

      <Button type="submit" loading={mutation.isPending}>
        Salvar pedido
      </Button>
    </form>
  );
}
