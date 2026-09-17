import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpDown,
  BarChart3,
  RefreshCw,
  Search,
  Radio,
  Users,
  MousePointer2,
  Eye,
  Timer,
  Target,
  ExternalLink,
} from "lucide-react";
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
import { AdminSidebar } from "./admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { comparison, csvCell, metricFormat, presetRange } from "./analytics-format";

import type {
  GAReportKey,
  GAReport as Report,
  GAReportsResponse as Reports,
  GARealtimeResponse as Live,
} from "@shared/p1-google-analytics";
// Totals come directly from GA, never from summing distinct segment users.
const COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#64748b"];
const LABELS: Record<string, string> = {
  activeUsers: "Active users",
  totalUsers: "Total users",
  newUsers: "New users",
  sessions: "Sessions",
  screenPageViews: "Page views",
  engagedSessions: "Engaged sessions",
  engagementRate: "Engagement rate",
  bounceRate: "Bounce rate",
  averageSessionDuration: "Avg. session duration",
  userEngagementDuration: "Engagement time",
  keyEvents: "Key events",
  eventCount: "Events",
  sessionDefaultChannelGroup: "Channel",
  sessionSourceMedium: "Source / medium",
  sessionCampaignName: "Campaign",
  pagePath: "Page",
  landingPage: "Landing page",
  landingPagePlusQueryString: "Landing page",
  country: "Country",
  region: "Region",
  city: "City",
  deviceCategory: "Device",
  browser: "Browser",
  eventName: "Event",
  date: "Date",
};
const label = (key: string) => LABELS[key] || key;
const flatten = (r?: Report) =>
  (r?.rows ?? []).map((row) => ({ ...row.dimensions, ...row.metrics }));
function Empty({ children = "No data for this period." }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
function Note({ report }: { report?: Report }) {
  return (
    <>
      {report?.metadata.subjectToThresholding && (
        <p className="text-xs text-amber-600">Google applies privacy thresholds to this report.</p>
      )}
      {report?.metadata.dataLossFromOtherRow && (
        <p className="text-xs text-amber-600">Some values are grouped into “(other)” by Google.</p>
      )}
      {!!report?.metadata.samplingMetadatas?.length && (
        <p className="text-xs text-amber-600">Google returned sampled data for this report.</p>
      )}
    </>
  );
}
function ReportTable({ title, report }: { title: string; report?: Report }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: "", desc: true });
  const [page, setPage] = useState(0);
  const columns = [...(report?.dimensions ?? []), ...(report?.metrics ?? [])];
  const rows = useMemo(() => {
    const filtered = (report?.rows ?? []).filter((row) =>
      Object.values(row.dimensions).join(" ").toLowerCase().includes(search.toLowerCase()),
    );
    const key = sort.key || report?.metrics[0] || "";
    return [...filtered].sort((a, b) => {
      const av = a.metrics[key] ?? a.dimensions[key] ?? "",
        bv = b.metrics[key] ?? b.dimensions[key] ?? "";
      return (
        (typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv))) * (sort.desc ? -1 : 1)
      );
    });
  }, [report, search, sort]);
  const safePage = Math.min(page, Math.max(0, Math.ceil(rows.length / 10) - 1));
  function exportCsv() {
    const csv = [
      columns.map(label).map(csvCell).join(","),
      ...rows.map((row) =>
        columns.map((col) => csvCell(row.dimensions[col] ?? row.metrics[col])).join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `p1-${title.toLowerCase().replaceAll(" ", "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="h-9 w-44 pl-8"
              aria-label={`Search ${title}`}
              placeholder="Search rows…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={exportCsv}
            disabled={!rows.length}
            aria-label={`Export ${title} CSV`}
          >
            <ArrowDownToLine className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Note report={report} />
        {!rows.length ? (
          <Empty />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  {title}. Sort using column headings. Export includes filtered rows.
                </caption>
                <thead>
                  <tr className="border-b">
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="whitespace-nowrap pb-3 pr-5 text-left font-medium text-muted-foreground"
                        aria-sort={
                          sort.key === col ? (sort.desc ? "descending" : "ascending") : "none"
                        }
                      >
                        <button
                          className="inline-flex items-center gap-1 rounded focus-visible:outline focus-visible:outline-2"
                          onClick={() =>
                            setSort({ key: col, desc: sort.key === col ? !sort.desc : true })
                          }
                        >
                          {label(col)}
                          <ArrowUpDown className="size-3" />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(safePage * 10, safePage * 10 + 10).map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                      {columns.map((col) => (
                        <td className="max-w-xs break-words py-3 pr-5 tabular-nums" key={col}>
                          {row.dimensions[col] ?? metricFormat(row.metrics[col] ?? 0, col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {rows.length} loaded rows
                {report?.truncated
                  ? ` · ${report.rowCount} total; export limited to loaded rows`
                  : ""}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  Previous
                </Button>
                <span>
                  {safePage + 1} / {Math.max(1, Math.ceil(rows.length / 10))}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={(safePage + 1) * 10 >= rows.length}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
function Breakdown({
  title,
  report,
  donut = false,
}: {
  title: string;
  report?: Report;
  donut?: boolean;
}) {
  const dimension = report?.dimensions[0] || "";
  const metric = report?.metrics.includes("sessions")
    ? "sessions"
    : report?.metrics[0] || "activeUsers";
  const data = flatten(report)
    .slice(0, 6)
    .map((row) => ({ name: String(row[dimension] || "(not set)"), value: Number(row[metric]) }));
  return (
    <Card className="min-w-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Top {data.length || 6} · {label(metric)}
        </p>
      </CardHeader>
      <CardContent>
        <Note report={report} />
        {data.length ? (
          <div
            className="h-64"
            role="img"
            aria-label={`${title}: ${data.map((d) => `${d.name} ${d.value}`).join(", ")}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              {donut ? (
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
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
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip cursor={{ fill: "rgba(13,148,136,.08)" }} />
                  <Bar
                    dataKey="value"
                    name={label(metric)}
                    fill={COLORS[0]}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty />
        )}
      </CardContent>
    </Card>
  );
}
export default function AnalyticsPage() {
  const [range, setRange] = useState(() => presetRange(28));
  const [draft, setDraft] = useState(range);
  const [error, setError] = useState("");
  const [trend, setTrend] = useState("sessions");
  const url = `/api/p1/google-analytics?${new URLSearchParams(range)}`;
  const query = useQuery<Reports>({
    queryKey: [url],
    queryFn: async () => (await apiRequest("GET", url)).json(),
    staleTime: 300_000,
    retry: false,
  });
  const live = useQuery<Live>({
    queryKey: ["/api/p1/google-analytics/realtime"],
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
  const data = query.data,
    reports = data?.reports,
    totals = reports?.totals?.rows[0]?.metrics,
    previous = reports?.previousTotals?.rows[0]?.metrics;
  const daily = useMemo(() => {
    if (!data || !reports?.daily?.rows.length) return [];
    const byDate = new Map(
      flatten(reports.daily).map((row) => [
        String(row.date).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3"),
        row,
      ]),
    );
    const points = [];
    for (
      let stamp = Date.parse(data.dateRange.startDate);
      stamp <= Date.parse(data.dateRange.endDate);
      stamp += 86400000
    ) {
      const date = new Date(stamp).toISOString().slice(0, 10);
      points.push({ ...byDate.get(date), date });
    }
    return points;
  }, [data, reports]);
  function apply() {
    const days = (Date.parse(draft.endDate) - Date.parse(draft.startDate)) / 86400000 + 1;
    if (!Number.isFinite(days) || days < 1 || days > 93) {
      setError("Choose a valid date range of up to 93 days.");
      return;
    }
    setError("");
    setRange(draft);
  }
  const cards = [
    ["activeUsers", "Active users", Users],
    ["sessions", "Sessions", MousePointer2],
    ["screenPageViews", "Page views", Eye],
    ["engagementRate", "Engagement rate", Activity],
    ["averageSessionDuration", "Avg. session", Timer],
    ["keyEvents", "Key events", Target],
  ] as const;
  return (
    <AdminSidebar>
      <main className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-teal-600">
              <BarChart3 className="size-4" />
              P1 Website · Google Analytics
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Website analytics</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Traffic, acquisition and engagement across your public website.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={query.isFetching}
              onClick={() => {
                void query.refetch();
                void live.refetch();
              }}
            >
              <RefreshCw className={`mr-2 size-4 ${query.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://analytics.google.com/analytics/web/#/p554712298"
                target="_blank"
                rel="noreferrer"
              >
                Google Analytics
                <ExternalLink className="ml-2 size-4" />
              </a>
            </Button>
          </div>
        </header>
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {[7, 28, 90].map((days) => (
              <Button
                key={days}
                size="sm"
                variant={
                  JSON.stringify(range) === JSON.stringify(presetRange(days))
                    ? "default"
                    : "outline"
                }
                onClick={() => {
                  const next = presetRange(days);
                  setDraft(next);
                  setRange(next);
                  setError("");
                }}
              >
                Last {days} days
              </Button>
            ))}
          </div>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              apply();
            }}
          >
            <label className="text-xs text-muted-foreground">
              From
              <Input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                className="mt-1 w-40"
                required
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Through
              <Input
                type="date"
                value={draft.endDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                className="mt-1 w-40"
                required
              />
            </label>
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </form>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Radio className="size-4 text-teal-600" />
            Last 30 minutes:{" "}
            <strong className="text-foreground">
              {live.data
                ? metricFormat(
                    live.data.reports.totals?.rows[0]?.metrics.activeUsers ?? 0,
                    "activeUsers",
                  )
                : live.isError
                  ? "Unavailable"
                  : "…"}
            </strong>{" "}
            active users
          </span>
          {data && (
            <>
              <span>Updated {new Date(data.fetchedAt).toLocaleTimeString()}</span>
              <span>
                Property timezone: {reports?.totals?.metadata.timeZone || "Google property setting"}
              </span>
              <span>
                Compared with {data.previousDateRange.startDate} – {data.previousDateRange.endDate}
              </span>
            </>
          )}
        </div>
        {query.isLoading ? (
          <div role="status" className="grid gap-4 sm:grid-cols-3">
            {cards.map(([key]) => (
              <div key={key} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
            <span className="sr-only">Loading Google Analytics reports</span>
          </div>
        ) : query.isError ? (
          <Card>
            <CardContent className="space-y-3 p-8">
              <h2 className="text-lg font-semibold">Reports are unavailable</h2>
              <p role="alert" className="text-sm text-muted-foreground">
                {query.error.message}
              </p>
              <p className="text-sm text-muted-foreground">
                Live tracking and report access are separate connections. No sample numbers are
                shown.
              </p>
              <Button onClick={() => void query.refetch()}>Try again</Button>
            </CardContent>
          </Card>
        ) : (
          data && (
            <>
              {data.status === "empty" && (
                <div
                  role="status"
                  className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-4 text-sm"
                >
                  No processed data is available for this period yet. Tracking began September 16,
                  2026; standard Google Analytics reports can take 24–48 hours to populate.
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {cards.map(([metric, title, Icon]) => (
                  <Card key={metric} className="overflow-hidden shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{title}</span>
                        <Icon className="size-4 text-teal-600" />
                      </div>
                      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
                        {totals?.[metric] === undefined
                          ? "—"
                          : metricFormat(totals[metric], metric)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {comparison(totals?.[metric], previous?.[metric])}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Note report={reports?.totals} />
              <Tabs defaultValue="overview" className="space-y-5">
                <div className="overflow-x-auto">
                  <TabsList className="h-11 w-max">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="audience">Audience & technology</TabsTrigger>
                    <TabsTrigger value="events">Events</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="overview" className="space-y-5">
                  <Card className="shadow-sm">
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">Traffic over time</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Daily totals in the property timezone
                        </p>
                      </div>
                      <select
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        aria-label="Trend metric"
                        value={trend}
                        onChange={(e) => setTrend(e.target.value)}
                      >
                        {["sessions", "activeUsers", "screenPageViews"].map((m) => (
                          <option key={m} value={m}>
                            {label(m)}
                          </option>
                        ))}
                      </select>
                    </CardHeader>
                    <CardContent>
                      <Note report={reports?.daily} />
                      {daily.length ? (
                        <div
                          className="h-80"
                          role="img"
                          aria-label={`${label(trend)} over the selected period. Exact values available in the daily activity table.`}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={daily}
                              accessibilityLayer
                              margin={{ left: 0, right: 16, top: 12, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="ga-trend" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
                                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0.01} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                vertical={false}
                                stroke="currentColor"
                                opacity={0.08}
                              />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11 }}
                                minTickGap={45}
                                tickFormatter={(s) => s.slice(5)}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 11 }}
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--card))",
                                  borderColor: "hsl(var(--border))",
                                  borderRadius: 10,
                                }}
                              />
                              <Area
                                dataKey={trend}
                                name={label(trend)}
                                type="monotone"
                                stroke="#0d9488"
                                strokeWidth={2.5}
                                fill="url(#ga-trend)"
                                isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <Empty />
                      )}
                    </CardContent>
                  </Card>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <Breakdown title="Acquisition mix" report={reports?.channels} />
                    <Breakdown title="Devices" report={reports?.devices} donut />
                  </div>
                  <ReportTable title="Daily activity" report={reports?.daily} />
                </TabsContent>
                <TabsContent value="acquisition" className="space-y-5">
                  <div className="grid gap-5 lg:grid-cols-2">
                    <Breakdown title="Traffic channels" report={reports?.channels} />
                    <Breakdown title="Top sources" report={reports?.sourceMedium} />
                  </div>
                  <ReportTable title="Channels" report={reports?.channels} />
                  <ReportTable title="Source and medium" report={reports?.sourceMedium} />
                  <ReportTable title="Campaigns" report={reports?.campaigns} />
                </TabsContent>
                <TabsContent value="content" className="space-y-5">
                  <ReportTable title="Pages and screens" report={reports?.pages} />
                  <ReportTable title="Landing pages" report={reports?.landingPages} />
                </TabsContent>
                <TabsContent value="audience" className="space-y-5">
                  <div className="grid gap-5 lg:grid-cols-2">
                    <Breakdown title="Device mix" report={reports?.devices} donut />
                    <Breakdown title="Top countries" report={reports?.countries} />
                  </div>
                  {[
                    ["Countries", "countries"],
                    ["Regions", "regions"],
                    ["Cities", "cities"],
                    ["Devices", "devices"],
                    ["Browsers", "browsers"],
                  ].map(([title, key]) => (
                    <ReportTable key={key} title={title} report={reports?.[key as GAReportKey]} />
                  ))}
                </TabsContent>
                <TabsContent value="events" className="space-y-5">
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Key events are events marked as important in Google Analytics. They are not
                    confirmed inquiries or qualified leads. Review accepted inquiries and sales
                    outcomes in the{" "}
                    <a className="font-medium text-primary underline" href="/admin/crm">
                      CRM pipeline
                    </a>
                    . The current tag tracks page views; form and call conversions have not been
                    configured in GA.
                  </div>
                  <ReportTable title="Events" report={reports?.events} />
                </TabsContent>
              </Tabs>
              <footer className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
                <p>
                  Source: Google Analytics Data API · property {data.propertyId} · reports cached
                  for 5 minutes. Realtime refreshes once a minute.
                </p>
                <p>
                  Active users are distinct within each report; daily or segment user counts should
                  not be added together. Engagement rate is engaged sessions divided by sessions.
                  Average session duration is measured in seconds. Recent data can change as Google
                  processes it.
                </p>
                <p>
                  Search keywords, ad costs, revenue, and confirmed lead attribution require
                  additional linked sources or event configuration; they are not inferred here.
                </p>
              </footer>
            </>
          )
        )}
      </main>
    </AdminSidebar>
  );
}
