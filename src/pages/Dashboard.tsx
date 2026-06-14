import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";

const shortcuts = [
  { to: "/cadastro/clientes", label: "Novo cliente", color: "bg-brand-pink" },
  { to: "/cadastro/produtos", label: "Novo produto", color: "bg-brand-yellow" },
  { to: "/cadastro/pedidos", label: "Novo pedido", color: "bg-brand-pink-dark" },
  { to: "/graficos", label: "Ver gráficos", color: "bg-brand-yellow-dark" },
];

export function Dashboard() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.customers.list() });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.products.list() });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api.orders.list() });
  const revenue = useQuery({ queryKey: ["revenue"], queryFn: () => api.revenue.list() });

  const totalRevenue = revenue.data?.reduce(
    (sum, r) => sum + parseFloat(r.value),
    0,
  ) ?? 0;

  const paidOrders = orders.data?.filter((o) => o.status === "PAID").length ?? 0;

  const stats = [
    { label: "Clientes", value: customers.data?.length ?? "—" },
    { label: "Produtos", value: products.data?.length ?? "—" },
    { label: "Pedidos pagos", value: paidOrders },
    { label: "Receita total", value: formatCurrency(totalRevenue) },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-brand-pink to-brand-yellow p-8 text-white shadow-card">
        <h2 className="font-display text-3xl font-bold">Bem-vinda!</h2>
        <p className="mt-2 max-w-xl text-white/90">
          Gerencie clientes, produtos, pedidos e acompanhe suas vendas em um só lugar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="section-card text-center">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-brand-pink-deep">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="section-card">
        <h3 className="page-title mb-4">Acesso rápido</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`${item.color} rounded-xl px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
