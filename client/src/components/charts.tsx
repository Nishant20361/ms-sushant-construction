/**
 * Reusable, responsive chart wrappers built on Recharts.
 * Used across the analytics dashboard. All charts are responsive so they work
 * on desktop, tablet, and mobile.
 */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#ca8a04",
  "#0891b2",
  "#4f46e5",
  "#dc2626",
];

function moneyTooltip() {
  return ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
        <p className="mb-1 font-semibold text-slate-900">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="flex items-center gap-2 text-slate-600">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color ?? p.fill }} />
            {p.name}: <b className="text-slate-900">{formatMoney(p.value)}</b>
          </p>
        ))}
      </div>
    );
  };
}

function formatMoney(v: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v ?? 0);
}

/** Vertical bar chart for money values (e.g. daily/weekly/monthly sales). */
export function MoneyBarChart({
  data,
  xKey,
  yKey,
  name,
  height = 280,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  name: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => compactNumber(v)} />
        <Tooltip content={moneyTooltip()} />
        <Bar dataKey={yKey} name={name} fill="#0f766e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Line chart for money trends. */
export function MoneyLineChart({
  data,
  xKey,
  yKey,
  name,
  height = 280,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  name: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => compactNumber(v)} />
        <Tooltip content={moneyTooltip()} />
        <Line type="monotone" dataKey={yKey} name={name} stroke="#0f766e" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Pie/Donut chart for distribution (cash vs online, category, etc.). */
export function DistributionPieChart({
  data,
  height = 280,
}: {
  data: { name?: string; value?: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          label={(p: any) => compactLabel(p.name, p.percent)}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={moneyTooltip()} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bar chart for rankings (top products/customers). */
export function HorizontalBarChart({
  data,
  xKey,
  yKey,
  name,
  height = 320,
}: {
  data: any[];
  xKey: string;
  yKey: string;
  name: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => compactNumber(v)} />
        <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} width={110} />
        <Tooltip content={moneyTooltip()} />
        <Bar dataKey={yKey} name={name} fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function compactNumber(v: number): string {
  const n = v ?? 0;
  if (Math.abs(n) >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}
function compactLabel(name: string, percent: number): string {
  const p = Math.round((percent ?? 0) * 100);
  if (name.length > 16) return `${name.slice(0, 14)}… ${p}%`;
  return `${name} ${p}%`;
}
