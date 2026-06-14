import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { PRODUCT_TYPE_LABELS } from "../types";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function StockPage() {
  const queryClient = useQueryClient();
  const [searchNumber, setSearchNumber] = useState("");
  const [stockValues, setStockValues] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const products = useQuery({
    queryKey: ["products", "stock"],
    queryFn: () => api.products.list({ sort_by: "name", sort_order: "asc" }),
  });

  const productByNumber = useQuery({
    queryKey: ["product-stock", searchNumber],
    queryFn: () => api.products.getByNumber(Number(searchNumber)),
    enabled: !!searchNumber,
  });

  const mutation = useMutation({
    mutationFn: ({ id, stock }: { id: number; stock: number }) =>
      api.products.updateStock(id, stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setMessage({ type: "success", text: "Estoque atualizado!" });
    },
    onError: (err: Error) => {
      setMessage({ type: "error", text: err.message });
    },
  });

  const handleSave = (id: number) => {
    const value = stockValues[id];
    if (value === undefined) return;
    mutation.mutate({ id, stock: Number(value) });
  };

  return (
    <div className="space-y-6">
      <h2 className="page-title">Controle de estoque</h2>

      {message && (
        <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      <div className="section-card grid gap-4 sm:grid-cols-[1fr_auto]">
        <Input
          label="Buscar produto por número"
          type="number"
          value={searchNumber}
          onChange={(e) => setSearchNumber(e.target.value)}
        />
      </div>

      {productByNumber.data && (
        <div className="rounded-xl border-2 border-brand-yellow bg-brand-yellow/20 p-4">
          <p className="font-semibold text-brand-pink-deep">
            #{productByNumber.data.number} — {productByNumber.data.name}
          </p>
          <p className="mt-1 text-lg">
            Estoque atual:{" "}
            <strong className="text-2xl">{productByNumber.data.stock_quantity}</strong>{" "}
            unidades
          </p>
          <p className="text-sm text-gray-600">
            Tipo: {PRODUCT_TYPE_LABELS[productByNumber.data.product_type]}
          </p>
        </div>
      )}

      <div className="section-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-pink/20">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Produto</th>
              <th className="px-4 py-3 text-left">Estoque atual</th>
              <th className="px-4 py-3 text-left">Novo estoque</th>
              <th className="px-4 py-3 text-left">Ação</th>
            </tr>
          </thead>
          <tbody>
            {products.data?.map((product) => (
              <tr key={product.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{product.number}</td>
                <td className="px-4 py-3 font-medium">{product.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      product.stock_quantity === 0
                        ? "bg-red-100 text-red-700"
                        : product.stock_quantity <= 3
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {product.stock_quantity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    placeholder={String(product.stock_quantity)}
                    className="w-24 rounded-lg border border-brand-pink/50 px-2 py-1"
                    value={stockValues[product.id] ?? ""}
                    onChange={(e) =>
                      setStockValues({ ...stockValues, [product.id]: e.target.value })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="secondary"
                    className="text-xs"
                    onClick={() => handleSave(product.id)}
                    loading={mutation.isPending}
                    disabled={stockValues[product.id] === undefined}
                  >
                    Salvar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
