import { useId, useMemo, useState, type ReactNode } from "react";
import { Activity, Eye, MousePointer2, Target, Timer, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface AnalyticsOverviewReport {
  dimensions: string[];
  metrics: string[];
  rows: Array<{ dimensions: Record<string, string>; metrics: Record<string, number> }>;
}
type Formatting = {
  label: (metric: string) => string;
  format: (value: number, metric: string) => string;
};
const COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#64748b"];
const cards = [
  ["activeUsers", "Active users", Users, "#2563eb"],
  ["sessions", "Sessions", MousePointer2, "#0d9488"],
  ["screenPageViews", "Page views", Eye, "#7c3aed"],
  ["engagementRate", "Engagement rate", Activity, "#0284c7"],
  ["averageSessionDuration", "Avg. session", Timer, "#d97706"],
  ["keyEvents", "Key events", Target, "#db2777"],
] as const;
// Shared original layout, expressed with scoped classes so both React hosts use
// their own theme tokens without importing the retained admin shell or auth.
function Styles() {
  return (
    <style>{`
.analytics-summary,.analytics-overview,.analytics-breakdown{min-width:0;color:var(--ink,hsl(var(--foreground)))}
.analytics-summary{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}
.analytics-summary-card,.analytics-overview-card{min-width:0;background:var(--surface,hsl(var(--card)));border:1px solid var(--line,hsl(var(--border)));border-radius:var(--radius,8px);padding:20px;box-shadow:0 1px 2px #00000008}
.analytics-summary-card header{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px;color:hsl(var(--muted-foreground))}
.analytics-summary-card svg{width:16px;height:16px;flex:none;background:none}
.analytics-summary-card .analytics-summary-value{margin:16px 0 0;font-size:30px;font-weight:600;line-height:1.2;font-variant-numeric:tabular-nums;letter-spacing:-.03em}
.analytics-summary-card .analytics-summary-comparison{margin:8px 0 0;font-size:12px;color:hsl(var(--muted-foreground))}
.analytics-overview{display:grid;gap:20px}.analytics-overview-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;min-width:0}
.analytics-overview-card>header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin:0 0 20px}
.analytics-overview-card h3{margin:0;font-size:16px;font-weight:600}.analytics-overview-card header p{margin:4px 0 0;font-size:12px;color:hsl(var(--muted-foreground))}
.analytics-overview-card label{display:grid;gap:4px;font-size:12px;margin:0}.analytics-overview-card select{margin:0;min-width:0;max-width:100%;padding:8px 12px;border:1px solid var(--line,hsl(var(--border)));border-radius:6px;background:var(--surface,hsl(var(--card)));color:inherit;font:inherit}
.analytics-overview-chart{height:320px;min-width:0;width:100%}.analytics-breakdown .analytics-overview-chart{height:256px}
.analytics-overview-empty{display:flex;align-items:center;justify-content:center;min-height:144px;padding:24px;border:1px dashed var(--line,hsl(var(--border)));border-radius:8px;font-size:14px;color:hsl(var(--muted-foreground))}
@media(max-width:1400px){.analytics-summary{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:800px){.analytics-overview-pair{grid-template-columns:minmax(0,1fr)}.analytics-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:400px){.analytics-summary-card{padding:14px}.analytics-summary-card header{font-size:12px}.analytics-summary-card .analytics-summary-value{font-size:26px}}
`}</style>
  );
}
export function AnalyticsSummaryCards({
  totals,
  previous,
  format,
  comparison,
}: {
  totals?: Record<string, number>;
  previous?: Record<string, number>;
  format: Formatting["format"];
  comparison: (current?: number, previous?: number) => string;
}) {
  return (
    <>
      <Styles />
      <div className="analytics-summary">
        {cards.map(([metric, title, Icon, color]) => (
          <section className="analytics-summary-card" key={metric} aria-label={title}>
            <header>
              <span>{title}</span>
              <Icon style={{ color }} aria-hidden="true" />
            </header>
            <p className="analytics-summary-value">
              {totals?.[metric] === undefined ? "—" : format(totals[metric], metric)}
            </p>
            <p className="analytics-summary-comparison">
              {comparison(totals?.[metric], previous?.[metric])}
            </p>
          </section>
        ))}
      </div>
    </>
  );
}
function Empty() {
  return <div className="analytics-overview-empty">No data for this period.</div>;
}
const flatten = (report?: AnalyticsOverviewReport) =>
  (report?.rows ?? []).map((row) => ({ ...row.dimensions, ...row.metrics }));
export function AnalyticsBreakdown<R extends AnalyticsOverviewReport>({
  title,
  report,
  donut = false,
  label,
  format,
  note,
  allowMetricSelection = false,
  limit = 6,
}: Formatting & {
  title: string;
  report?: R;
  donut?: boolean;
  note?: (report: R) => ReactNode;
  allowMetricSelection?: boolean;
  limit?: number;
}) {
  const defaultMetric = report?.metrics.includes("sessions")
    ? "sessions"
    : report?.metrics[0] || "activeUsers";
  const [choice, setChoice] = useState(defaultMetric);
  const metric = allowMetricSelection && report?.metrics.includes(choice) ? choice : defaultMetric;
  const dimension = report?.dimensions[0] || "";
  const data = flatten(report)
    .sort((a, b) => Number(b[metric]) - Number(a[metric]))
    .slice(0, limit)
    .map((row) => ({ name: String(row[dimension] || "(not set)"), value: Number(row[metric]) }));
  const useDonut = donut && !/Rate$|Duration|ctr|position/i.test(metric);
  return (
    <section className="analytics-overview-card analytics-breakdown">
      <Styles />
      <header>
        <div>
          <h3>{title}</h3>
          <p>
            Top {data.length || limit} · {label(metric)}
          </p>
        </div>
        {allowMetricSelection && report && (
          <label>
            Chart metric
            <select
              aria-label={`${title} metric`}
              value={metric}
              onChange={(event) => setChoice(event.target.value)}
            >
              {report.metrics.map((key) => (
                <option key={key} value={key}>
                  {label(key)}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>
      {report && note?.(report)}
      {data.length ? (
        <div
          className="analytics-overview-chart"
          role="img"
          aria-label={`${title}: ${data.map((d) => `${d.name} ${format(d.value, metric)}`).join(", ")}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            {useDonut ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={86}
                  paddingAngle={3}
                  isAnimationActive={false}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => format(Number(value), metric)} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            ) : (
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 0, right: 20 }}
                accessibilityLayer
              >
                <CartesianGrid horizontal={false} stroke="currentColor" opacity={0.08} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => format(Number(value), metric)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => format(Number(value), metric)}
                  cursor={{ fill: "rgba(13,148,136,.08)" }}
                />
                <Bar
                  dataKey="value"
                  name={label(metric)}
                  fill={COLORS[0]}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                  isAnimationActive={false}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty />
      )}
    </section>
  );
}
export function AnalyticsOverview<R extends AnalyticsOverviewReport>({
  daily,
  channels,
  devices,
  range,
  label,
  format,
  note,
  table,
  allowMetricSelection = false,
}: Formatting & {
  daily?: R;
  channels?: R;
  devices?: R;
  range: { startDate: string; endDate: string };
  note?: (report: R) => ReactNode;
  table: (title: string, report: R | undefined) => ReactNode;
  allowMetricSelection?: boolean;
}) {
  const [trend, setTrend] = useState("sessions"),
    id = useId().replaceAll(":", "");
  const options = allowMetricSelection
    ? (daily?.metrics ?? [])
    : ["sessions", "activeUsers", "screenPageViews"];
  const selected = options.includes(trend) ? trend : options[0] || "sessions";
  const points = useMemo(() => {
    if (!daily?.rows.length) return [];
    const byDate = new Map(
      flatten(daily).map((row) => [
        String(row.date).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3"),
        row,
      ]),
    );
    const result = [];
    for (let day = Date.parse(range.startDate); day <= Date.parse(range.endDate); day += 86400000) {
      const date = new Date(day).toISOString().slice(0, 10);
      result.push({ ...byDate.get(date), date });
    }
    return result;
  }, [daily, range.startDate, range.endDate]);
  return (
    <div className="analytics-overview">
      <Styles />
      <section className="analytics-overview-card">
        <header>
          <div>
            <h3>Traffic over time</h3>
            <p>Daily totals in the property timezone</p>
          </div>
          <label>
            Trend metric
            <select
              aria-label="Trend metric"
              value={selected}
              onChange={(event) => setTrend(event.target.value)}
            >
              {options.map((key) => (
                <option key={key} value={key}>
                  {label(key)}
                </option>
              ))}
            </select>
          </label>
        </header>
        {daily && note?.(daily)}
        {points.length ? (
          <div
            className="analytics-overview-chart"
            role="img"
            aria-label={`${label(selected)} over the selected period. Exact values available in the daily activity table.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                accessibilityLayer
                margin={{ left: 0, right: 16, top: 12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS[0]} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  minTickGap={45}
                  tickFormatter={(value) => String(value).slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => format(Number(value), selected)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => format(Number(value), selected)}
                  contentStyle={{
                    background: "var(--surface,hsl(var(--card)))",
                    borderColor: "var(--line,hsl(var(--border)))",
                    borderRadius: 10,
                  }}
                />
                <Area
                  dataKey={selected}
                  name={label(selected)}
                  type="monotone"
                  stroke={COLORS[0]}
                  strokeWidth={2.5}
                  fill={`url(#${id})`}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty />
        )}
        <p style={{ fontSize: 12, marginBottom: 0 }}>
          Missing dates remain gaps; they are not assumed to be zero.
        </p>
      </section>
      <div className="analytics-overview-pair">
        <AnalyticsBreakdown
          title="Acquisition mix"
          report={channels}
          label={label}
          format={format}
          note={note}
          allowMetricSelection={allowMetricSelection}
          limit={allowMetricSelection ? 10 : 6}
        />
        <AnalyticsBreakdown
          title="Devices"
          report={devices}
          donut
          label={label}
          format={format}
          note={note}
          allowMetricSelection={allowMetricSelection}
          limit={allowMetricSelection ? 10 : 6}
        />
      </div>
      {table("Daily activity", daily)}
    </div>
  );
}
