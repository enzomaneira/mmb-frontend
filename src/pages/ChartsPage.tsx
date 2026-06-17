import { useQuery } from "@tanstack/react-query";
import { type Dispatch, type SetStateAction, useState } from "react";
import {
  Area, AreaChart,
  Bar, BarChart,
  CartesianGrid, Cell,
  Legend, Line, LineChart,
  Pie, PieChart,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Modal } from "../components/ui/Modal";

// ─── Colour palette ──────────────────────────────────────────────────────────
const COLORS = ["#D9468F", "#FFE066", "#E879A9", "#F5C518", "#F8B4D9", "#B5E3E3", "#A78BFA", "#6EE7B7", "#FCA5A5", "#93C5FD"];

type ChartType = "line" | "bar" | "area" | "pie" | "radar";

const CHART_TYPE_OPTIONS: { value: ChartType; icon: string; label: string }[] = [
  { value: "line",  icon: "📈", label: "Linha" },
  { value: "bar",   icon: "📊", label: "Colunas" },
  { value: "area",  icon: "🌊", label: "Área" },
  { value: "pie",   icon: "🥧", label: "Pizza" },
  { value: "radar", icon: "🕸️", label: "Radar" },
];

// ─── Chart type picker ───────────────────────────────────────────────────────
function ChartTypePicker({
  value, onChange, disablePie, disableRadar,
}: {
  value: ChartType;
  onChange: (t: ChartType) => void;
  disablePie?: boolean;
  disableRadar?: boolean;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {CHART_TYPE_OPTIONS.map((opt) => {
        const disabled = (opt.value === "pie" && disablePie) || (opt.value === "radar" && disableRadar);
        return (
          <button
            key={opt.value}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition border ${
              value === opt.value
                ? "border-brand-pink-deep bg-brand-pink/20 text-brand-pink-deep"
                : "border-gray-200 text-gray-500 hover:border-brand-pink/40 hover:text-gray-700"
            } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
          >
            <span>{opt.icon}</span>{opt.label}
          </button>
        );
      })}
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

// ─── Generic dynamic chart renderer ─────────────────────────────────────────
function DynamicChart({
  type, data, dataKey, nameKey, height = 300, formatter, angleLabel,
}: {
  type: ChartType;
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  height?: number;
  formatter?: (v: number) => string;
  angleLabel?: boolean;
}) {
  if (!data.length) return <EmptyChart />;

  const tooltipFmt = formatter ? (v: number) => formatter(v) : undefined;

  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%"
            outerRadius={height / 3}
            label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={tooltipFmt as never} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "radar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          <Radar dataKey={dataKey} stroke="#D9468F" fill="#F8B4D9" fillOpacity={0.6} />
          <Tooltip formatter={tooltipFmt as never} />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  const xAxisProps = angleLabel
    ? { tick: { fontSize: 10 }, interval: 0, angle: -20, textAnchor: "end" as const, height: 60 }
    : { tick: { fontSize: 11 } };

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D9468F" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#D9468F" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
          <XAxis dataKey={nameKey} {...xAxisProps} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={tooltipFmt as never} />
          <Area type="monotone" dataKey={dataKey} stroke="#D9468F" fill="url(#grad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
          <XAxis dataKey={nameKey} {...xAxisProps} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={tooltipFmt as never} />
          <Line type="monotone" dataKey={dataKey} stroke="#D9468F" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // bar (default)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
        <XAxis dataKey={nameKey} {...xAxisProps} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={tooltipFmt as never} />
        <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Main Charts Page ─────────────────────────────────────────────────────────
export function ChartsPage() {
  const [productId, setProductId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [granularity, setGranularity] = useState<"day" | "month" | "year">("month");
  const [topLimit, setTopLimit] = useState(8);

  // Per-chart type selections
  const [typeProductSales, setTypeProductSales] = useState<ChartType>("line");
  const [typeCustomerSales, setTypeCustomerSales] = useState<ChartType>("area");
  const [typeTopProducts, setTypeTopProducts] = useState<ChartType>("bar");
  const [typeRevenueShare, setTypeRevenueShare] = useState<ChartType>("pie");
  const [typeTotalSales, setTypeTotalSales] = useState<ChartType>("bar");
  const [typeMonthly, setTypeMonthly] = useState<ChartType>("area");

  // Expanded modal
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const products = useQuery({ queryKey: ["products"], queryFn: () => api.products.list() });
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.customers.list() });

  const salesByProduct = useQuery({
    queryKey: ["chart-product", productId, startDate, endDate],
    queryFn: () => api.charts.salesByProduct({
      product_id: Number(productId),
      start_date: startDate ? `${startDate}T00:00:00` : undefined,
      end_date: endDate ? `${endDate}T23:59:59` : undefined,
    }),
    enabled: !!productId,
  });

  const salesByCustomer = useQuery({
    queryKey: ["chart-customer", customerId, startDate, endDate],
    queryFn: () => api.charts.salesByCustomer({
      customer_id: Number(customerId),
      start_date: startDate ? `${startDate}T00:00:00` : undefined,
      end_date: endDate ? `${endDate}T23:59:59` : undefined,
    }),
    enabled: !!customerId,
  });

  const topProducts = useQuery({
    queryKey: ["chart-top", topLimit],
    queryFn: () => api.charts.topProducts(topLimit),
  });

  const totalSales = useQuery({
    queryKey: ["chart-total", granularity, startDate, endDate],
    queryFn: () => api.charts.totalSales({
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
    ...(products.data?.map((p) => ({ value: String(p.id), label: `#${p.number} — ${p.name}` })) ?? []),
  ];

  const customerOptions = [
    { value: "", label: "Selecione um cliente" },
    ...(customers.data?.map((c) => ({ value: String(c.id), label: `#${c.number} — ${c.name}` })) ?? []),
  ];

  // Prepared data
  const productSalesData = (salesByProduct.data ?? []).map((d) => ({ date: d.date, quantity: d.quantity }));
  const customerSalesData = (salesByCustomer.data ?? []).map((d) => ({ date: d.date, value: parseFloat(d.value) }));
  const topData = (topProducts.data ?? []).map((d) => ({ product_name: d.product_name, units_sold: d.units_sold, revenue: parseFloat(d.revenue) }));
  const totalData = (totalSales.data ?? []).map((d) => ({ date: d.date, value: parseFloat(d.value) }));
  const monthlyData = (revenueChart.data ?? []).map((d) => ({ period: d.period, value: parseFloat(d.value) }));
  const shareData = (revenueShare.data ?? []).map((d) => ({
    product_name: d.product_name, percentage: parseFloat(d.percentage), revenue: parseFloat(d.revenue),
  }));

  const CHART_DEFS: {
    id: string;
    title: string;
    type: ChartType;
    setType: Dispatch<SetStateAction<ChartType>>;
    data: Record<string, unknown>[];
    dataKey: string;
    nameKey: string;
    disablePie: boolean;
    disableRadar: boolean;
    angleLabel: boolean;
    formatter?: (v: number) => string;
  }[] = [
    { id: "product-sales", title: "Vendas por produto (qtd.)", type: typeProductSales, setType: setTypeProductSales,
      data: productSalesData, dataKey: "quantity", nameKey: "date", disablePie: false, disableRadar: false, angleLabel: false },
    { id: "customer-sales", title: "Compras por cliente (R$)", type: typeCustomerSales, setType: setTypeCustomerSales,
      data: customerSalesData, dataKey: "value", nameKey: "date", disablePie: false, disableRadar: false, angleLabel: false, formatter: formatCurrency },
    { id: "top-products", title: "Produtos mais vendidos (qtd.)", type: typeTopProducts, setType: setTypeTopProducts,
      data: topData, dataKey: "units_sold", nameKey: "product_name", disablePie: false, disableRadar: false, angleLabel: true },
    { id: "revenue-share", title: "Distribuição de receita (%)", type: typeRevenueShare, setType: setTypeRevenueShare,
      data: shareData, dataKey: "percentage", nameKey: "product_name", disablePie: false, disableRadar: false, angleLabel: false, formatter: (v: number) => `${v}%` },
    { id: "total-sales", title: "Vendas totais no período (R$)", type: typeTotalSales, setType: setTypeTotalSales,
      data: totalData, dataKey: "value", nameKey: "date", disablePie: true, disableRadar: true, angleLabel: false, formatter: formatCurrency },
    { id: "monthly-revenue", title: "Receita mensal (R$)", type: typeMonthly, setType: setTypeMonthly,
      data: monthlyData, dataKey: "value", nameKey: "period", disablePie: true, disableRadar: true, angleLabel: false, formatter: formatCurrency },
  ];

  const expandedDef = CHART_DEFS.find((c) => c.id === expandedChart);

  return (
    <div className="space-y-8">
      <h2 className="page-title">Gráficos e relatórios</h2>

      {/* Global filters */}
      <div className="section-card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Filtros globais</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Produto (vendas por produto)" value={productId}
            onChange={(e) => setProductId(e.target.value)} options={productOptions} />
          <Select label="Cliente (compras por cliente)" value={customerId}
            onChange={(e) => setCustomerId(e.target.value)} options={customerOptions} />
          <Input label="Data início" type="date" value={startDate}
            onChange={(e) => setStartDate(e.target.value)} />
          <Input label="Data fim" type="date" value={endDate}
            onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <Select label="Granularidade (vendas totais)" value={granularity}
            onChange={(e) => setGranularity(e.target.value as "day" | "month" | "year")}
            options={[{ value: "day", label: "Dia" }, { value: "month", label: "Mês" }, { value: "year", label: "Ano" }]} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Top produtos (quantidade)</label>
            <input type="range" min={3} max={20} value={topLimit}
              onChange={(e) => setTopLimit(Number(e.target.value))}
              className="accent-brand-pink-deep" />
            <span className="text-xs text-gray-500">Top {topLimit}</span>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {CHART_DEFS.map((chart) => (
          <div key={chart.id} className={`section-card ${chart.id === "total-sales" || chart.id === "monthly-revenue" ? "lg:col-span-2" : ""}`}>
            {/* Header */}
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-brand-pink-deep">{chart.title}</h3>
              <button
                onClick={() => setExpandedChart(chart.id)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-brand-pink/40 hover:text-brand-pink-deep transition"
              >
                ⛶ Tela cheia
              </button>
            </div>
            {/* Chart type picker */}
            <div className="mb-3">
              <ChartTypePicker
                value={chart.type}
                onChange={chart.setType as (t: ChartType) => void}
                disablePie={chart.disablePie}
                disableRadar={chart.disableRadar}
              />
            </div>
            {/* Extra controls for specific charts */}
            {chart.id === "product-sales" && !productId && (
              <EmptyChart message="Selecione um produto para ver este gráfico" />
            )}
            {chart.id === "customer-sales" && !customerId && (
              <EmptyChart message="Selecione um cliente para ver este gráfico" />
            )}
            {(chart.id !== "product-sales" || productId) &&
              (chart.id !== "customer-sales" || customerId) && (
                <DynamicChart
                  type={chart.type}
                  data={chart.data as Record<string, unknown>[]}
                  dataKey={chart.dataKey}
                  nameKey={chart.nameKey}
                  formatter={chart.formatter as ((v: number) => string) | undefined}
                  angleLabel={chart.angleLabel}
                  height={300}
                />
              )}
          </div>
        ))}
      </div>

      {/* Full-screen modal */}
      <Modal
        open={!!expandedChart}
        onClose={() => setExpandedChart(null)}
        title={expandedDef?.title}
        size="xl"
      >
        {expandedDef && (
          <div className="space-y-4">
            <ChartTypePicker
              value={expandedDef.type}
              onChange={expandedDef.setType as (t: ChartType) => void}
              disablePie={expandedDef.disablePie}
              disableRadar={expandedDef.disableRadar}
            />
            <DynamicChart
              type={expandedDef.type}
              data={expandedDef.data as Record<string, unknown>[]}
              dataKey={expandedDef.dataKey}
              nameKey={expandedDef.nameKey}
              formatter={expandedDef.formatter as ((v: number) => string) | undefined}
              angleLabel={expandedDef.angleLabel}
              height={480}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
