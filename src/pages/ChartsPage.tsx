import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
const COLORS = ["#D9468F","#FFE066","#E879A9","#F5C518","#F8B4D9","#B5E3E3","#A78BFA","#6EE7B7","#FCA5A5","#93C5FD"];

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
    <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
      {message}
    </div>
  );
}

// ─── Truncate long label ─────────────────────────────────────────────────────
function truncateLabel(label: string, maxLen = 14): string {
  if (!label) return "";
  return label.length > maxLen ? label.slice(0, maxLen) + "…" : label;
}

// ─── Custom legend that caps items and truncates names ───────────────────────
const MAX_LEGEND_ITEMS = 6;

function CustomLegend({ payload }: { payload?: { value: string; color: string }[] }) {
  if (!payload?.length) return null;
  const visible = payload.slice(0, MAX_LEGEND_ITEMS);
  const hidden = payload.length - visible.length;
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs mt-1 px-2">
      {visible.map((entry, i) => (
        <li key={i} className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
          <span className="max-w-[90px] truncate text-gray-600">{truncateLabel(entry.value, 16)}</span>
        </li>
      ))}
      {hidden > 0 && (
        <li className="text-gray-400 italic">+{hidden} mais</li>
      )}
    </ul>
  );
}

// ─── Generic dynamic chart renderer ─────────────────────────────────────────
function DynamicChart({
  type, data, dataKey, nameKey, height = 280, formatter, angleLabel,
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

  // Truncated tick formatter
  const xTickFmt = (val: string) => truncateLabel(val, 12);

  if (type === "pie") {
    // Limit pie to top 8 slices + "outros"
    const MAX_PIE = 8;
    let pieData = data;
    if (data.length > MAX_PIE) {
      const top = data.slice(0, MAX_PIE);
      const rest = data.slice(MAX_PIE);
      const othersValue = rest.reduce((s, d) => s + (Number(d[dataKey]) || 0), 0);
      pieData = [...top, { [nameKey]: "Outros", [dataKey]: othersValue }];
    }
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={pieData}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="45%"
            outerRadius={Math.min(height / 3, 90)}
            label={({ name, percent }: { name: string; percent: number }) =>
              `${truncateLabel(String(name), 10)} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={tooltipFmt as never} />
          <Legend content={(props) => <CustomLegend payload={props.payload as { value: string; color: string }[]} />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "radar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey={nameKey} tick={{ fontSize: 10 }} tickFormatter={(v) => truncateLabel(v, 10)} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          <Radar dataKey={dataKey} stroke="#D9468F" fill="#F8B4D9" fillOpacity={0.6} />
          <Tooltip formatter={tooltipFmt as never} />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  const xAxisProps = angleLabel
    ? { tick: { fontSize: 10 }, interval: 0, angle: -28, textAnchor: "end" as const, height: 64, tickFormatter: xTickFmt }
    : { tick: { fontSize: 11 }, tickFormatter: xTickFmt };

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D9468F" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#D9468F" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
          <XAxis dataKey={nameKey} {...xAxisProps} />
          <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={formatter ? (v) => formatter(v) : undefined} />
          <Tooltip formatter={tooltipFmt as never} />
          <Area type="monotone" dataKey={dataKey} stroke="#D9468F" fill="url(#grad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
          <XAxis dataKey={nameKey} {...xAxisProps} />
          <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={formatter ? (v) => formatter(v) : undefined} />
          <Tooltip formatter={tooltipFmt as never} />
          <Line type="monotone" dataKey={dataKey} stroke="#D9468F" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // bar (default)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F8B4D9" />
        <XAxis dataKey={nameKey} {...xAxisProps} />
        <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={formatter ? (v) => formatter(v) : undefined} />
        <Tooltip formatter={tooltipFmt as never} />
        <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Collapsible filter row ──────────────────────────────────────────────────
function FilterRow({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3 border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition"
      >
        <span>⚙️ Filtros do gráfico</span>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="bg-gray-50/60 px-3 pb-3 pt-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Charts Page ─────────────────────────────────────────────────────────
export function ChartsPage() {
  // ── Filters: "Vendas por produto" ──
  const [ps_productId, setPsProductId]     = useState("");
  const [ps_startDate, setPsStartDate]     = useState("");
  const [ps_endDate, setPsEndDate]         = useState("");

  // ── Filters: "Compras por cliente" ──
  const [cs_customerId, setCsCustomerId]   = useState("");
  const [cs_startDate, setCsStartDate]     = useState("");
  const [cs_endDate, setCsEndDate]         = useState("");

  // ── Filters: "Top produtos" ──
  const [top_limit, setTopLimit]           = useState(8);

  // ── Filters: "Vendas totais no período" ──
  const [ts_granularity, setTsGranularity] = useState<"day" | "month" | "year">("month");
  const [ts_startDate, setTsStartDate]     = useState("");
  const [ts_endDate, setTsEndDate]         = useState("");

  // ── Filters: "Receita mensal" ──
  const [mr_startYear, setMrStartYear]     = useState("");
  const [mr_startMonth, setMrStartMonth]   = useState("");
  const [mr_endYear, setMrEndYear]         = useState("");
  const [mr_endMonth, setMrEndMonth]       = useState("");

  // ── Per-chart type selections ──
  const [typeProductSales, setTypeProductSales]   = useState<ChartType>("line");
  const [typeCustomerSales, setTypeCustomerSales] = useState<ChartType>("area");
  const [typeTopProducts, setTypeTopProducts]     = useState<ChartType>("bar");
  const [typeRevenueShare, setTypeRevenueShare]   = useState<ChartType>("pie");
  const [typeTotalSales, setTypeTotalSales]       = useState<ChartType>("bar");
  const [typeMonthly, setTypeMonthly]             = useState<ChartType>("area");

  // Expanded modal
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  // ── Data lists ──
  const products  = useQuery({ queryKey: ["products"],  queryFn: () => api.products.list() });
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.customers.list() });

  // ── Queries ──
  const salesByProduct = useQuery({
    queryKey: ["chart-product", ps_productId, ps_startDate, ps_endDate],
    queryFn: () => api.charts.salesByProduct({
      product_id: Number(ps_productId),
      start_date: ps_startDate ? `${ps_startDate}T00:00:00` : undefined,
      end_date:   ps_endDate   ? `${ps_endDate}T23:59:59`   : undefined,
    }),
    enabled: !!ps_productId,
  });

  const salesByCustomer = useQuery({
    queryKey: ["chart-customer", cs_customerId, cs_startDate, cs_endDate],
    queryFn: () => api.charts.salesByCustomer({
      customer_id: Number(cs_customerId),
      start_date: cs_startDate ? `${cs_startDate}T00:00:00` : undefined,
      end_date:   cs_endDate   ? `${cs_endDate}T23:59:59`   : undefined,
    }),
    enabled: !!cs_customerId,
  });

  const topProducts = useQuery({
    queryKey: ["chart-top", top_limit],
    queryFn: () => api.charts.topProducts(top_limit),
  });

  const totalSales = useQuery({
    queryKey: ["chart-total", ts_granularity, ts_startDate, ts_endDate],
    queryFn: () => api.charts.totalSales({
      granularity: ts_granularity,
      start_date: ts_startDate ? `${ts_startDate}T00:00:00` : undefined,
      end_date:   ts_endDate   ? `${ts_endDate}T23:59:59`   : undefined,
    }),
  });

  const revenueShare = useQuery({
    queryKey: ["chart-share"],
    queryFn: () => api.charts.productRevenueShare(),
  });

  const revenueChart = useQuery({
    queryKey: ["revenue-chart", mr_startYear, mr_startMonth, mr_endYear, mr_endMonth],
    queryFn: () => api.revenue.chart({
      start_year:  mr_startYear  ? Number(mr_startYear)  : undefined,
      start_month: mr_startMonth ? Number(mr_startMonth) : undefined,
      end_year:    mr_endYear    ? Number(mr_endYear)    : undefined,
      end_month:   mr_endMonth   ? Number(mr_endMonth)   : undefined,
    }),
  });

  // ── Option lists ──
  const productOptions = [
    { value: "", label: "Selecione um produto" },
    ...(products.data?.map((p) => ({ value: String(p.id), label: `#${p.number} — ${p.name}` })) ?? []),
  ];
  const customerOptions = [
    { value: "", label: "Selecione um cliente" },
    ...(customers.data?.map((c) => ({ value: String(c.id), label: `#${c.number} — ${c.name}` })) ?? []),
  ];
  const monthOptions = [
    { value: "", label: "—" },
    ...[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => ({
      value: String(m),
      label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2000, m - 1)),
    })),
  ];

  // ── Prepared data ──
  const productSalesData = (salesByProduct.data ?? []).map((d) => ({ date: d.date, quantity: d.quantity }));
  const customerSalesData = (salesByCustomer.data ?? []).map((d) => ({ date: d.date, value: parseFloat(d.value) }));
  const topData = (topProducts.data ?? []).map((d) => ({ product_name: d.product_name, units_sold: d.units_sold, revenue: parseFloat(d.revenue) }));
  const totalData = (totalSales.data ?? []).map((d) => ({ date: d.date, value: parseFloat(d.value) }));
  const monthlyData = (revenueChart.data ?? []).map((d) => ({ period: d.period, value: parseFloat(d.value) }));
  const shareData = (revenueShare.data ?? []).map((d) => ({
    product_name: d.product_name, percentage: parseFloat(d.percentage), revenue: parseFloat(d.revenue),
  }));

  // ── Expanded helpers ──
  type ChartDef = {
    id: string;
    title: string;
    type: ChartType;
    setType: (t: ChartType) => void;
    data: Record<string, unknown>[];
    dataKey: string;
    nameKey: string;
    disablePie: boolean;
    disableRadar: boolean;
    angleLabel: boolean;
    formatter?: (v: number) => string;
    filters?: React.ReactNode;
    requireMsg?: string;
  };

  const CHART_DEFS: ChartDef[] = [
    {
      id: "product-sales",
      title: "Vendas por produto (qtd.)",
      type: typeProductSales, setType: setTypeProductSales,
      data: productSalesData, dataKey: "quantity", nameKey: "date",
      disablePie: false, disableRadar: false, angleLabel: false,
      requireMsg: !ps_productId ? "Selecione um produto para ver este gráfico" : undefined,
      filters: (
        <>
          <Select label="Produto" value={ps_productId}
            onChange={(e) => setPsProductId(e.target.value)} options={productOptions} />
          <Input label="Data início" type="date" value={ps_startDate}
            onChange={(e) => setPsStartDate(e.target.value)} />
          <Input label="Data fim" type="date" value={ps_endDate}
            onChange={(e) => setPsEndDate(e.target.value)} />
        </>
      ),
    },
    {
      id: "customer-sales",
      title: "Compras por cliente (R$)",
      type: typeCustomerSales, setType: setTypeCustomerSales,
      data: customerSalesData, dataKey: "value", nameKey: "date",
      disablePie: false, disableRadar: false, angleLabel: false,
      formatter: formatCurrency,
      requireMsg: !cs_customerId ? "Selecione um cliente para ver este gráfico" : undefined,
      filters: (
        <>
          <Select label="Cliente" value={cs_customerId}
            onChange={(e) => setCsCustomerId(e.target.value)} options={customerOptions} />
          <Input label="Data início" type="date" value={cs_startDate}
            onChange={(e) => setCsStartDate(e.target.value)} />
          <Input label="Data fim" type="date" value={cs_endDate}
            onChange={(e) => setCsEndDate(e.target.value)} />
        </>
      ),
    },
    {
      id: "top-products",
      title: "Produtos mais vendidos (qtd.)",
      type: typeTopProducts, setType: setTypeTopProducts,
      data: topData, dataKey: "units_sold", nameKey: "product_name",
      disablePie: false, disableRadar: false, angleLabel: true,
      filters: (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Top produtos (quantidade)</label>
          <input type="range" min={3} max={20} value={top_limit}
            onChange={(e) => setTopLimit(Number(e.target.value))}
            className="accent-brand-pink-deep" />
          <span className="text-xs text-gray-500">Top {top_limit}</span>
        </div>
      ),
    },
    {
      id: "revenue-share",
      title: "Distribuição de receita (%)",
      type: typeRevenueShare, setType: setTypeRevenueShare,
      data: shareData, dataKey: "percentage", nameKey: "product_name",
      disablePie: false, disableRadar: false, angleLabel: false,
      formatter: (v: number) => `${v}%`,
    },
    {
      id: "total-sales",
      title: "Vendas totais no período (R$)",
      type: typeTotalSales, setType: setTypeTotalSales,
      data: totalData, dataKey: "value", nameKey: "date",
      disablePie: true, disableRadar: true, angleLabel: false,
      formatter: formatCurrency,
      filters: (
        <>
          <Select label="Granularidade" value={ts_granularity}
            onChange={(e) => setTsGranularity(e.target.value as "day" | "month" | "year")}
            options={[
              { value: "day",   label: "Dia"  },
              { value: "month", label: "Mês"  },
              { value: "year",  label: "Ano"  },
            ]} />
          <Input label="Data início" type="date" value={ts_startDate}
            onChange={(e) => setTsStartDate(e.target.value)} />
          <Input label="Data fim" type="date" value={ts_endDate}
            onChange={(e) => setTsEndDate(e.target.value)} />
        </>
      ),
    },
    {
      id: "monthly-revenue",
      title: "Receita mensal (R$)",
      type: typeMonthly, setType: setTypeMonthly,
      data: monthlyData, dataKey: "value", nameKey: "period",
      disablePie: true, disableRadar: true, angleLabel: false,
      formatter: formatCurrency,
      filters: (
        <>
          <Input label="Ano início" type="number" placeholder="ex: 2023" value={mr_startYear}
            onChange={(e) => setMrStartYear(e.target.value)} />
          <Select label="Mês início" value={mr_startMonth}
            onChange={(e) => setMrStartMonth(e.target.value)} options={monthOptions} />
          <Input label="Ano fim" type="number" placeholder="ex: 2025" value={mr_endYear}
            onChange={(e) => setMrEndYear(e.target.value)} />
          <Select label="Mês fim" value={mr_endMonth}
            onChange={(e) => setMrEndMonth(e.target.value)} options={monthOptions} />
        </>
      ),
    },
  ];

  const expandedDef = CHART_DEFS.find((c) => c.id === expandedChart);

  return (
    <div className="space-y-8">
      <h2 className="page-title">Gráficos e relatórios</h2>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {CHART_DEFS.map((chart) => (
          <div
            key={chart.id}
            className={`section-card flex flex-col ${
              chart.id === "total-sales" || chart.id === "monthly-revenue" ? "lg:col-span-2" : ""
            }`}
          >
            {/* Header */}
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-brand-pink-deep">{chart.title}</h3>
              <button
                onClick={() => setExpandedChart(chart.id)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-brand-pink/40 hover:text-brand-pink-deep transition"
              >
                ⛶ Tela cheia
              </button>
            </div>

            {/* Individual filters */}
            {chart.filters && (
              <FilterRow>{chart.filters}</FilterRow>
            )}

            {/* Chart type picker */}
            <div className="mb-3">
              <ChartTypePicker
                value={chart.type}
                onChange={chart.setType}
                disablePie={chart.disablePie}
                disableRadar={chart.disableRadar}
              />
            </div>

            {/* Chart area — fixed height so cards don't overflow */}
            <div className="min-h-[280px]">
              {chart.requireMsg ? (
                <EmptyChart message={chart.requireMsg} />
              ) : (
                <DynamicChart
                  type={chart.type}
                  data={chart.data}
                  dataKey={chart.dataKey}
                  nameKey={chart.nameKey}
                  formatter={chart.formatter}
                  angleLabel={chart.angleLabel}
                  height={280}
                />
              )}
            </div>
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
            {/* Filters inside modal too */}
            {expandedDef.filters && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Filtros</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {expandedDef.filters}
                </div>
              </div>
            )}
            <ChartTypePicker
              value={expandedDef.type}
              onChange={expandedDef.setType}
              disablePie={expandedDef.disablePie}
              disableRadar={expandedDef.disableRadar}
            />
            {expandedDef.requireMsg ? (
              <EmptyChart message={expandedDef.requireMsg} />
            ) : (
              <DynamicChart
                type={expandedDef.type}
                data={expandedDef.data}
                dataKey={expandedDef.dataKey}
                nameKey={expandedDef.nameKey}
                formatter={expandedDef.formatter}
                angleLabel={expandedDef.angleLabel}
                height={460}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
