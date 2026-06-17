import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { PRODUCT_TYPE_LABELS, type ProductType } from "../../types";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

const PRODUCT_TYPE_ICONS: Record<ProductType, string> = {
  FELT: "🧶",
  CLOTH: "🪡",
  CHRISTMAS: "🎄",
  SCHOOL: "🎒",
  DECORATION: "🎀",
  KEEPSAKE: "🎁",
  COSTUME: "🎭",
  EASTER: "🐰",
  PUPPETS: "🤹",
  MISC: "📦",
  REPAIR: "🔧",
  QUIET_BOOK: "📚",
  TOYS: "🧸",
  STATIONERY: "✏️",
};

const productTypeOptions = Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label: `${PRODUCT_TYPE_ICONS[value as ProductType]} ${label}`,
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
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-suggest next product number
  const products = useQuery({
    queryKey: ["products-count"],
    queryFn: () => api.products.list({ sort_by: "number", sort_order: "desc" }),
    staleTime: 30_000,
  });

  const nextNumber =
    products.data && products.data.length > 0
      ? Math.max(...products.data.map((p) => p.number)) + 1
      : 1;

  const mutation = useMutation({
    mutationFn: () =>
      api.products.create({
        number: Number(form.number),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        product_type: form.product_type,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-count"] });
      setMessage({ type: "success", text: `✅ Produto "${form.name}" cadastrado com sucesso!` });
      setForm({
        number: "",
        name: "",
        description: "",
        product_type: "TOYS",
        price: "",
        stock_quantity: "0",
      });
      setErrors({});
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof typeof form, string>> = {};
    if (!form.number || Number(form.number) < 1) newErrors.number = "Número inválido (mín. 1)";
    if (!form.name.trim()) newErrors.name = "Nome é obrigatório";
    else if (form.name.trim().length < 2) newErrors.name = "Nome muito curto";
    if (!form.price || Number(form.price) <= 0) newErrors.price = "Preço deve ser maior que zero";
    if (form.stock_quantity === "" || Number(form.stock_quantity) < 0)
      newErrors.stock_quantity = "Estoque não pode ser negativo";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (validate()) mutation.mutate();
  };

  const adjustStock = (delta: number) => {
    const current = Math.max(0, Number(form.stock_quantity) + delta);
    setForm({ ...form, stock_quantity: String(current) });
  };

  const priceFloat = parseFloat(form.price) || 0;
  const stockQty = parseInt(form.stock_quantity) || 0;
  const totalStockValue = priceFloat * stockQty;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h3 className="page-title">Cadastrar produto</h3>
        <p className="mt-1 text-sm text-gray-500">
          Preencha os dados do produto. Campos com{" "}
          <span className="text-brand-pink-deep font-semibold">*</span> são obrigatórios.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {message && (
          <div className="mb-6">
            <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
          </div>
        )}

        {/* Card: Identificação */}
        <div className="mb-5 rounded-2xl border border-brand-pink/20 bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pink/20 text-base">🏷️</span>
            <h4 className="font-semibold text-brand-pink-deep">Identificação</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Número */}
            <div>
              <Input
                label="Número do produto"
                icon="🔢"
                type="number"
                min={1}
                required
                placeholder={products.isLoading ? "Carregando..." : `Próximo: ${nextNumber}`}
                value={form.number}
                error={errors.number}
                hint="Código numérico único do produto"
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setForm({ ...form, number: val });
                  if (errors.number) setErrors({ ...errors, number: undefined });
                }}
              />
              {!form.number && !products.isLoading && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, number: String(nextNumber) })}
                  className="mt-1.5 text-xs font-medium text-brand-pink-deep hover:underline"
                >
                  ↳ Usar #{nextNumber} (sugerido)
                </button>
              )}
            </div>

            {/* Tipo */}
            <Select
              label="Categoria / Tipo"
              icon="🗂️"
              required
              value={form.product_type}
              hint="Selecione a categoria do produto"
              onChange={(e) => setForm({ ...form, product_type: e.target.value as ProductType })}
              options={productTypeOptions}
            />

            {/* Nome (full width) */}
            <div className="sm:col-span-2">
              <Input
                label="Nome do produto"
                icon="✏️"
                type="text"
                required
                placeholder="Ex.: Fantoche de Coelho Gigante"
                maxLength={150}
                value={form.name}
                error={errors.name}
                hint="Nome completo como será exibido ao cliente"
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
              />
            </div>
          </div>
        </div>

        {/* Card: Descrição */}
        <div className="mb-5 rounded-2xl border border-brand-pink/20 bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-base">📝</span>
            <h4 className="font-semibold text-brand-pink-deep">Descrição</h4>
            <span className="ml-auto text-xs text-gray-400">Opcional</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              📄 Descrição do produto
            </label>
            <textarea
              rows={3}
              placeholder="Ex.: Fantoches feitos à mão em feltro, lavável. Ideal para crianças de 2 a 8 anos. Medidas: 35cm."
              maxLength={500}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border-2 border-brand-pink/40 bg-white px-4 py-2.5 text-sm font-medium shadow-sm outline-none transition-all duration-200 placeholder:font-normal placeholder:text-gray-300 hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30 resize-none"
            />
            <p className="text-right text-xs text-gray-400">{form.description.length}/500</p>
          </div>
        </div>

        {/* Card: Preço e Estoque */}
        <div className="mb-5 rounded-2xl border border-brand-pink/20 bg-white p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2 border-b border-brand-pink/10 pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-base">💰</span>
            <h4 className="font-semibold text-brand-pink-deep">Preço & Estoque</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Preço */}
            <Input
              label="Preço de venda"
              icon="💲"
              type="number"
              min={0}
              step="0.01"
              required
              prefix="R$"
              placeholder="0,00"
              value={form.price}
              error={errors.price}
              hint="Preço padrão cobrado ao cliente"
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                setForm({ ...form, price: val });
                if (errors.price) setErrors({ ...errors, price: undefined });
              }}
            />

            {/* Estoque com +/- */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                <span className="text-base leading-none">📦</span>
                Estoque inicial
                <span className="ml-auto text-xs font-normal text-gray-400">unidades</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustStock(-1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand-pink/40 bg-white text-lg font-bold text-brand-pink-deep shadow-sm transition hover:border-brand-pink hover:bg-brand-pink/10 active:scale-95 disabled:opacity-40"
                  disabled={stockQty <= 0}
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={form.stock_quantity}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    setForm({ ...form, stock_quantity: String(val) });
                    if (errors.stock_quantity) setErrors({ ...errors, stock_quantity: undefined });
                  }}
                  className="min-w-0 flex-1 rounded-xl border-2 border-brand-pink/40 bg-white px-4 py-2.5 text-center text-sm font-bold shadow-sm outline-none transition hover:border-brand-pink focus:border-brand-pink-deep focus:ring-2 focus:ring-brand-pink/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
                <button
                  type="button"
                  onClick={() => adjustStock(1)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand-pink/40 bg-white text-lg font-bold text-brand-pink-deep shadow-sm transition hover:border-brand-pink hover:bg-brand-pink/10 active:scale-95"
                >
                  +
                </button>
              </div>
              {errors.stock_quantity && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-500">
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.stock_quantity}
                </p>
              )}
            </div>
          </div>

          {/* Valor total do estoque preview */}
          {priceFloat > 0 && stockQty > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
              <span className="text-sm text-gray-600">💡 Valor total em estoque</span>
              <span className="font-bold text-green-700">
                R$ {totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Estoque zero warning */}
          {stockQty === 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-yellow-50 px-4 py-3">
              <span>⚠️</span>
              <span className="text-sm text-yellow-800">
                Produto será cadastrado <strong>sem estoque</strong>. Lembre-se de atualizar posteriormente.
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={mutation.isPending} className="flex-1 py-3 text-base">
            💾 Salvar produto
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="py-3"
            onClick={() => {
              setForm({ number: "", name: "", description: "", product_type: "TOYS", price: "", stock_quantity: "0" });
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
