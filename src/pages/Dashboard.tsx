import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, type OrderStatus } from "../types";
import { StatusBadge } from "../components/ui/StatusBadge";

const shortcuts = [
  { to: "/cadastro/clientes", label: "➕ Novo cliente", color: "bg-brand-pink text-white" },
  { to: "/cadastro/produtos", label: "➕ Novo produto", color: "bg-brand-yellow text-yellow-900" },
  { to: "/cadastro/pedidos", label: "➕ Novo pedido", color: "bg-brand-pink-dark text-white" },
  { to: "/graficos", label: "📊 Ver gráficos", color: "bg-brand-yellow-dark text-yellow-900" },
  { to: "/status", label: "🔄 Alterar status", color: "bg-blue-500 text-white" },
  { to: "/estoque", label: "📦 Gerenciar estoque", color: "bg-green-500 text-white" },
];

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

function StatCard({
  label, value, sub, color = "text-brand-pink-deep",
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="section-card flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.customers.list() });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.products.list() });
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api.orders.list({ sort_by: "created_at", sort_order: "desc" }) });
  const revenue = useQuery({ queryKey: ["revenue"], queryFn: () => api.revenue.list() });
  const revenueChart = useQuery({ queryKey: ["revenue-chart-dash"], queryFn: () => api.revenue.chart() });

  // Aggregated stats
  const totalRevenue = revenue.data?.reduce((sum, r) => sum + parseFloat(r.value), 0) ?? 0;
  const paidOrders = orders.data?.filter((o) => o.status === "PAID") ?? [];
  const pendingOrders = orders.data?.filter((o) => o.status === "PENDING") ?? [];
  const inProgressOrders = orders.data?.filter((o) => o.status === "IN_PROGRESS") ?? [];

  const statusCounts = (orders.data ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const recentOrders = (orders.data ?? []).slice(0, 8);

  // Low stock products (≤3 units)
  const lowStockProducts = (products.data ?? [])
    .filter((p) => p.stock_quantity <= 3)
    .sort((a, b) => a.stock_quantity - b.stock_quantity)
    .slice(0, 5);

  // Monthly chart data
  const chartData = (revenueChart.data ?? []).map((d) => ({
    period: d.period,
    value: parseFloat(d.value),
  }));

  // Top customers by spent
  const topCustomers = [...(customers.data ?? [])]
    .sort((a, b) => parseFloat(b.total_spent) - parseFloat(a.total_spent))
    .slice(0, 5);

  // Revenue this month
  const now = new Date();
  const thisMonthRevenue = revenue.data?.find(
    (r) => r.year === now.getFullYear() && r.month === now.getMonth() + 1
  );

  const avgOrderValue = paidOrders.length > 0
    ? paidOrders.reduce((s, o) => s + parseFloat(o.total), 0) / paidOrders.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-pink via-brand-pink-dark to-brand-pink-deep p-8 text-white shadow-card">
        <h2 className="font-display text-3xl font-bold">Bem-vinda, Michelle! 🎀</h2>
        <p className="mt-2 max-w-xl text-white/90">
          Aqui está um resumo da sua loja. Hoje é{" "}
          {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold">
            📦 {pendingOrders.length} pedido{pendingOrders.length !== 1 ? "s" : ""} pendente{pendingOrders.length !== 1 ? "s" : ""}
          </div>
          <div className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold">
            ⚙️ {inProgressOrders.length} em andamento
          </div>
          {lowStockProducts.length > 0 && (
            <div className="rounded-xl bg-red-400/60 px-4 py-2 text-sm font-semibold">
              ⚠️ {lowStockProducts.length} produto{lowStockProducts.length !== 1 ? "s" : ""} com estoque baixo
            </div>
          )}
        </div>
      </div>

      {/* Key stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes cadastrados" value={customers.data?.length ?? "—"} sub="Total no sistema" />
        <StatCard label="Produtos cadastrados" value={products.data?.length ?? "—"} sub="Total no catálogo" />
        <StatCard label="Pedidos pagos" value={paidOrders.length} sub={`Ticket médio: ${formatCurrency(avgOrderValue)}`} color="text-green-600" />
        <StatCard label="Receita total" value={formatCurrency(totalRevenue)} sub={thisMonthRevenue ? `Este mês: ${formatCurrency(parseFloat(thisMonthRevenue.value))}` : undefined} color="text-brand-pink-deep" />
      </div>

      {/* Status breakdown + Revenue mini-chart */}
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Status breakdown */}
        <div className="section-card">
          <h3 className="mb-4 font-semibold text-brand-pink-deep">Pedidos por status</h3>
          <ul className="space-y-2">
            {ALL_STATUSES.map((s) => {
              const count = statusCounts[s] ?? 0;
              const total = orders.data?.length ?? 1;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <li key={s} className="space-y-0.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[s]}`}>
                      {ORDER_STATUS_LABELS[s]}
                    </span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-pink transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Revenue chart */}
        <div className="section-card">
          <h3 className="mb-4 font-semibold text-brand-pink-deep">Receita mensal (R$)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dash-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D9468F" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#D9468F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="value" stroke="#D9468F" fill="url(#dash-grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
              Sem dados de receita ainda
            </div>
          )}
        </div>
      </div>

      {/* Recent orders + Low stock + Top customers */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="section-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-brand-pink-deep">Pedidos recentes</h3>
            <Link to="/busca/pedidos" className="text-xs text-brand-pink-deep hover:underline">Ver todos →</Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold text-gray-400">
                <th className="pb-2">Nº</th>
                <th className="pb-2">Data</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-gray-50">
                  <td className="py-2 font-mono text-xs text-gray-500">#{o.number}</td>
                  <td className="py-2 text-gray-600 text-xs">{formatDate(o.created_at)}</td>
                  <td className="py-2"><StatusBadge status={o.status} /></td>
                  <td className="py-2 font-semibold">{formatCurrency(o.total)}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-gray-400">Sem pedidos ainda</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Side panels */}
        <div className="space-y-6">
          {/* Low stock alert */}
          <div className="section-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-brand-pink-deep">⚠️ Estoque baixo</h3>
              <Link to="/estoque" className="text-xs text-brand-pink-deep hover:underline">Gerenciar →</Link>
            </div>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-green-600 font-medium">✅ Todos os produtos têm estoque suficiente!</p>
            ) : (
              <ul className="space-y-2">
                {lowStockProducts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                      p.stock_quantity === 0 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800"
                    }`}>{p.stock_quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Top customers */}
          <div className="section-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-brand-pink-deep">🏆 Top clientes</h3>
              <Link to="/busca/clientes" className="text-xs text-brand-pink-deep hover:underline">Ver todos →</Link>
            </div>
            <ul className="space-y-2">
              {topCustomers.map((c, i) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-yellow-300 text-yellow-900" :
                    i === 1 ? "bg-gray-200 text-gray-700" :
                    i === 2 ? "bg-amber-100 text-amber-800" :
                    "bg-gray-50 text-gray-500"
                  }`}>{i + 1}</span>
                  <span className="flex-1 truncate font-medium">{c.name}</span>
                  <span className="shrink-0 font-semibold text-brand-pink-deep">{formatCurrency(c.total_spent)}</span>
                </li>
              ))}
              {topCustomers.length === 0 && (
                <p className="text-sm text-gray-400">Sem dados ainda</p>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick access */}
      <div className="section-card">
        <h3 className="page-title mb-4 text-lg">Acesso rápido</h3>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {shortcuts.map((item) => (
            <Link key={item.to} to={item.to}
              className={`${item.color} rounded-xl px-4 py-3 text-center text-sm font-semibold transition hover:opacity-90 shadow-sm`}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
