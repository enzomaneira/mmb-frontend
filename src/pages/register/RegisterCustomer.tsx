import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export function RegisterCustomer() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    number: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.customers.create({
        number: Number(form.number),
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setMessage({ type: "success", text: "Cliente cadastrado com sucesso!" });
      setForm({ number: "", name: "", email: "", phone: "", notes: "" });
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
      <h3 className="page-title">Cadastrar cliente</h3>
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
        label="E-mail"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <Input
        label="Telefone"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <Input
        label="Observações"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
      />
      <Button type="submit" loading={mutation.isPending}>
        Salvar cliente
      </Button>
    </form>
  );
}
