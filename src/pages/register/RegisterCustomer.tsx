import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

// Format phone as (99) 99999-9999 or (99) 9999-9999
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function RegisterCustomer() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    number: "",
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-suggest next customer number
  const customers = useQuery({
    queryKey: ["customers-count"],
    queryFn: () => api.customers.list({ sort_by: "number", sort_order: "desc" }),
    staleTime: 30_000,
  });

  const nextNumber =
    customers.data && customers.data.length > 0
      ? Math.max(...customers.data.map((c) => c.number)) + 1
      : 1;

  const mutation = useMutation({
    mutationFn: () =>
      api.customers.create({
        number: Number(form.number),
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.replace(/\D/g, "") || undefined,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-count"] });
      setMessage({ type: "success", text: `✅ Cliente "${form.name}" cadastrado com sucesso!` });
      setForm({ number: "", name: "", email: "", phone: "", notes: "" });
      setErrors({});
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  const validate = (): boolean => {
    const newErrors: Partial<typeof form> = {};
    if (!form.number || Number(form.number) < 1) newErrors.number = "Número inválido (mín. 1)";
    if (!form.name.trim()) newErrors.name = "Nome é obrigatório";
    else if (form.name.trim().length < 2) newErrors.name = "Nome muito curto";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "E-mail inválido";
    if (form.phone && form.phone.replace(/\D/g, "").length < 10)
      newErrors.phone = "Telefone incompleto (mín. 10 dígitos)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (validate()) mutation.mutate();
  };

  const fillNextNumber = () => {
    if (!form.number) setForm((f) => ({ ...f, number: String(nextNumber) }));
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h3 className="page-title">Cadastrar cliente</h3>
        <p className="mt-1 text-sm text-gray-500">
          Preencha os dados do cliente. Campos marcados com{" "}
          <span className="text-brand-pink-deep font-semibold">*</span> são obrigatórios.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {message && (
          <div className="mb-6">
            <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
          </div>
        )}

        {/* Card: Dados básicos */}
        <div className="mb-5 rounded-2xl border border-brand-pink/20 bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pink/20 text-base">👤</span>
            <h4 className="font-semibold text-brand-pink-deep">Dados básicos</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Número */}
            <div>
              <Input
                label="Número do cliente"
                icon="🔢"
                type="number"
                min={1}
                required
                placeholder={customers.isLoading ? "Carregando..." : `Próximo sugerido: ${nextNumber}`}
                value={form.number}
                error={errors.number}
                hint="Identificador único numérico do cliente"
                onFocus={fillNextNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setForm({ ...form, number: val });
                  if (errors.number) setErrors({ ...errors, number: undefined });
                }}
              />
              {!form.number && !customers.isLoading && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, number: String(nextNumber) })}
                  className="mt-1.5 text-xs font-medium text-brand-pink-deep hover:underline"
                >
                  ↳ Usar #{nextNumber} (sugerido)
                </button>
              )}
            </div>

            {/* Nome */}
            <Input
              label="Nome completo"
              icon="✏️"
              type="text"
              required
              placeholder="Ex.: Maria da Silva"
              maxLength={120}
              value={form.name}
              error={errors.name}
              hint="Nome como será exibido no sistema"
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
            />
          </div>
        </div>

        {/* Card: Contato */}
        <div className="mb-5 rounded-2xl border border-brand-pink/20 bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-yellow/40 text-base">📞</span>
            <h4 className="font-semibold text-brand-pink-deep">Contato</h4>
            <span className="ml-auto text-xs text-gray-400">Opcional</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Telefone */}
            <Input
              label="Telefone / WhatsApp"
              icon="📱"
              type="tel"
              placeholder="(00) 00000-0000"
              maxLength={15}
              value={form.phone}
              error={errors.phone}
              hint="Com ou sem DDD — apenas números"
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                setForm({ ...form, phone: formatted });
                if (errors.phone) setErrors({ ...errors, phone: undefined });
              }}
            />

            {/* E-mail */}
            <Input
              label="E-mail"
              icon="✉️"
              type="email"
              placeholder="exemplo@email.com"
              autoComplete="email"
              value={form.email}
              error={errors.email}
              hint="Para envio de confirmações e atualizações"
              onChange={(e) => {
                setForm({ ...form, email: e.target.value.trim() });
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
            />
          </div>
        </div>

        {/* Card: Observações */}
        <div className="mb-6 rounded-2xl border border-brand-pink/20 bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-base">📝</span>
            <h4 className="font-semibold text-brand-pink-deep">Observações</h4>
            <span className="ml-auto text-xs text-gray-400">Opcional</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              📌 Notas internas
            </label>
            <textarea
              rows={3}
              placeholder="Ex.: Cliente prefere pagamento via PIX, endereço de entrega específico, alergias, etc."
              maxLength={500}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border-2 border-brand-pink/40 bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-gray-300 hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30 resize-none"
            />
            <p className="text-right text-xs text-gray-400">{form.notes.length}/500</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={mutation.isPending} className="flex-1 py-3 text-base">
            💾 Salvar cliente
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="py-3"
            onClick={() => {
              setForm({ number: "", name: "", email: "", phone: "", notes: "" });
              setErrors({});
              setMessage(null);
            }}
          >
            Limpar
          </Button>
        </div>
      </form>
    </div>
  );
}
