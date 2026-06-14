import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";

const PIE_COLORS = ["#F8B4D9", "#FFE066", "#E879A9", "#F5C518", "#D9468F", "#FFF8F0"];

export function ChartsPage() {
  const [productId, setProductId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [granularity, setGranularity] = useState<"day" | "month" | "year">("month");

  const products = useQuery({ queryKey: ["products"], queryFn: () => api.products.list() });
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.customers.list() });

  const salesByProduct = useQuery({
    queryKey: ["chart-product", productId, startDate, endDate],
    queryFn: () =>
      api.charts.salesByProduct({
        product_id: Number(productId),
        start_date: startDate ? `${startDate}T00:00:00` : undefined,
        end_date: endDate ? `${endDate}T23:59:59` : undefined,
      }),
    enabled: !!productId,
  });

  const salesByCustomer = useQuery({
    queryKey: ["chart-customer", customerId, startDate, endDate],
    queryFn: () =>
      api.charts.salesByCustomer({
        customer_id: Number(customerId),
        start_date: startDate ? `${startDate}T00:00:00` : undefined,
        end_date: endDate ? `${endDate}T23:59:59` : undefined,
      }),
    enabled: !!customerId,
  });

  const topProducts = useQuery({
    queryKey: ["chart-top"],
    queryFn: () => api.charts.topProducts(8),
  });

  const totalSales = useQuery({
    queryKey: ["chart-total", granularity, startDate, endDate],
    queryFn: () =>
      api.charts.totalSales({
        granularity,
        start_date: startDate ? `${startDate}T00:00:00` : undefined,
        end_date: endDate ? `${endDate}T23:59:59` : undefined,
      }),
  });

  const revenueShare = useQuery({
    queryKey: ["chart-share"],
    queryFn: () => api.charts.productRevenueShare(),
  });

  const revenueChart = useQuery({
    queryKey: ["revenue-chart"],
    queryFn: () => api.revenue.chart(),
  });

  const productOptions = [
    { value: "", label: "Selecione um produto" },
    ...(products.data?.map((p) => ({
      value: String(p.id),
      label: `#${p.number} — ${p.name}`,
    })) ?? []),
  ];

  const customerOptions = [
    { value: "", label: "Selecione um cliente" },
    ...(customers.data?.map((c) => ({
      value: String(c.id),
      label: `#${c.number} — ${c.name}`,
    })) ?? []),
  ];

  return (
    <div className="space-y-8">
      <h2 className="page-title">Gráficos e relatórios</h2>

      <div className="section-card grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Produto (vendas)"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          options={productOptions}
        />
        <Select
          label="Cliente (compras)"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          options={customerOptions}
        />
        <Input
          label="Data início"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          label="Data fim"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Vendas por produto (quantidade)">
          {salesByProduct.data && salesByProduct.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={salesByProduct.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="quantity" stroke="#D9468F" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Selecione um produto para ver o gráfico" />
          )}
        </ChartCard>

        <ChartCard title="Compras por cliente (valor)">
          {salesByCustomer.data && salesByCustomer.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={salesByCustomer.data.map((d) => ({
                  ...d,
                  value: parseFloat(d.value),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="value" stroke="#F5C518" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Selecione um cliente para ver o gráfico" />
          )}
        </ChartCard>

        <ChartCard title="Produtos mais vendidos">
          {topProducts.data && topProducts.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProducts.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
                <XAxis dataKey="product_name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="units_sold" fill="#E879A9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Distribuição de receita por produto">
          {revenueShare.data && revenueShare.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={revenueShare.data}
                  dataKey="percentage"
                  nameKey="product_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {revenueShare.data.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Vendas totais no período" className="lg:col-span-2">
          <div className="mb-4">
            <Select
              label="Agrupar por"
              value={granularity}
              onChange={(e) =>
                setGranularity(e.target.value as "day" | "month" | "year")
              }
              options={[
                { value: "day", label: "Dia" },
                { value: "month", label: "Mês" },
                { value: "year", label: "Ano" },
              ]}
            />
          </div>
          {totalSales.data && totalSales.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={totalSales.data.map((d) => ({
                  ...d,
                  value: parseFloat(d.value),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="#FFE066" stroke="#F5C518" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Receita mensal" className="lg:col-span-2">
          {revenueChart.data && revenueChart.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={revenueChart.data.map((d) => ({
                  period: d.period,
                  value: parseFloat(d.value),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="value" stroke="#D9468F" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`section-card ${className}`}>
      <h3 className="mb-4 font-semibold text-brand-pink-deep">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart({ message = "Sem dados para exibir" }: { message?: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
      {message}
    </div>
  );
}
