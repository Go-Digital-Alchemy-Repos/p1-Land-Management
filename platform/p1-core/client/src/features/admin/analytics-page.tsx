import {
  AnalyticsOverview,
  AnalyticsSummaryCards,
  AnalyticsBreakdown,
} from "@/components/shared/analytics-overview-presentation";
import type { SearchConsoleResponse } from "@shared/p1-search-console";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpDown,
  BarChart3,
  RefreshCw,
  Search,
  Radio,
  ExternalLink,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
const LABELS: Record<string, string> = {
  clicks: "Search clicks",
  impressions: "Impressions",
  ctr: "Click-through rate",
  position: "Average position",
  query: "Search query",
  page: "Page",
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
  return (
    <AnalyticsBreakdown
      title={title}
      report={report}
      donut={donut}
      label={label}
      format={metricFormat}
      note={(report) => <Note report={report} />}
    />
  );
}
export default function AnalyticsPage() {
  const [range, setRange] = useState(() => presetRange(28));
  const [draft, setDraft] = useState(range);
  const [error, setError] = useState("");
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
  function apply() {
    const days = (Date.parse(draft.endDate) - Date.parse(draft.startDate)) / 86400000 + 1;
    if (!Number.isFinite(days) || days < 1 || days > 93) {
      setError("Choose a valid date range of up to 93 days.");
      return;
    }
    setError("");
    setRange(draft);
  }
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
        <Tabs defaultValue="google-analytics" className="space-y-6">
          <TabsList aria-label="Analytics source">
            <TabsTrigger value="google-analytics">Google Analytics</TabsTrigger>
            <TabsTrigger value="search-console">Search Console</TabsTrigger>
          </TabsList>
          <TabsContent value="google-analytics" className="space-y-6">
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
                    Property timezone:{" "}
                    {reports?.totals?.metadata.timeZone || "Google property setting"}
                  </span>
                  <span>
                    Compared with {data.previousDateRange.startDate} –{" "}
                    {data.previousDateRange.endDate}
                  </span>
                </>
              )}
            </div>
            {query.isLoading ? (
              <div role="status" className="grid gap-4 sm:grid-cols-3">
                {[
                  "activeUsers",
                  "sessions",
                  "screenPageViews",
                  "engagementRate",
                  "averageSessionDuration",
                  "keyEvents",
                ].map((key) => (
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
                      No processed data is available for this period yet. Tracking began September
                      16, 2026; standard Google Analytics reports can take 24–48 hours to populate.
                    </div>
                  )}
                  <AnalyticsSummaryCards
                    totals={totals}
                    previous={previous}
                    format={metricFormat}
                    comparison={comparison}
                  />
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
                      <AnalyticsOverview
                        daily={reports?.daily}
                        channels={reports?.channels}
                        devices={reports?.devices}
                        range={data.dateRange}
                        label={label}
                        format={metricFormat}
                        note={(report) => <Note report={report} />}
                        table={(title, report) => <ReportTable title={title} report={report} />}
                      />
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
                        <ReportTable
                          key={key}
                          title={title}
                          report={reports?.[key as GAReportKey]}
                        />
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
                      Source: Google Analytics Data API · property {data.propertyId} · reports
                      cached for 5 minutes. Realtime refreshes once a minute.
                    </p>
                    <p>
                      Active users are distinct within each report; daily or segment user counts
                      should not be added together. Engagement rate is engaged sessions divided by
                      sessions. Average session duration is measured in seconds. Recent data can
                      change as Google processes it.
                    </p>
                    <p>
                      Search keywords, ad costs, revenue, and confirmed lead attribution require
                      additional linked sources or event configuration; they are not inferred here.
                    </p>
                  </footer>
                </>
              )
            )}
          </TabsContent>
          <TabsContent value="search-console">
            <SearchConsolePanel range={range} />
          </TabsContent>
        </Tabs>
      </main>
    </AdminSidebar>
  );
}

function SearchConsolePanel({ range }: { range: { startDate: string; endDate: string } }) {
  const [metric, setMetric] = useState("clicks");
  const url = `/api/p1/google-analytics/search-console?${new URLSearchParams(range)}`;
  const query = useQuery<SearchConsoleResponse>({
    queryKey: [url],
    queryFn: async () => (await apiRequest("GET", url)).json(),
    staleTime: 300000,
    retry: false,
  });
  const data = query.data;
  const totals = data?.reports.totals.rows[0]?.metrics;
  const previous = data?.reports.previousTotals.rows[0]?.metrics;
  return (
    <section className="space-y-5" aria-label="Google Search Console reports">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Organic search performance</h2>
          <p className="text-sm text-muted-foreground">How people discover P1 in Google Search.</p>
        </div>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
          Refresh Search Console
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Web search · finalized data · Pacific time. Recent days may not be available yet. Search
        clicks differ from Analytics sessions.
      </p>
      {query.isLoading ? (
        <p role="status">Loading Search Console reports…</p>
      ) : query.isError ? (
        <Card>
          <CardContent className="p-6">
            <p role="alert">{query.error.message}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No demo data is substituted. Search Console needs its own property permission and API
              access.
            </p>
          </CardContent>
        </Card>
      ) : (
        data && (
          <>
            {data.status === "empty" && (
              <p role="status">No finalized search data is available for this period.</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {["clicks", "impressions", "ctr", "position"].map((key) => (
                <Card key={key}>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">{LABELS[key]}</p>
                    <p className="mt-3 text-3xl font-semibold">
                      {totals?.[key] === undefined ? "—" : metricFormat(totals[key], key)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {comparison(totals?.[key], previous?.[key])}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Search visibility over time</CardTitle>
                <select
                  aria-label="Search trend metric"
                  className="rounded-md border bg-background p-2 text-sm"
                  value={metric}
                  onChange={(event) => setMetric(event.target.value)}
                >
                  {["clicks", "impressions", "ctr", "position"].map((key) => (
                    <option key={key} value={key}>
                      {LABELS[key]}
                    </option>
                  ))}
                </select>
              </CardHeader>
              <CardContent>
                <div
                  className="h-72"
                  role="img"
                  aria-label="Search trend. Exact values are available in the daily search performance table."
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={flatten(data.reports.daily).sort((a, b) =>
                        String(a.date).localeCompare(String(b.date)),
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={36} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => metricFormat(value, metric)}
                      />
                      <Tooltip formatter={(value) => metricFormat(Number(value), metric)} />
                      <Area
                        type="monotone"
                        dataKey={metric}
                        name={LABELS[metric]}
                        stroke="#0d9488"
                        fill="#0d9488"
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <ReportTable title="Daily search performance" report={data.reports.daily} />
            <ReportTable title="Search queries" report={data.reports.queries} />
            <ReportTable title="Search pages" report={data.reports.pages} />
            <div className="grid gap-5 xl:grid-cols-2">
              <ReportTable title="Search countries" report={data.reports.countries} />
              <ReportTable title="Search devices" report={data.reports.devices} />
            </div>
            <footer className="space-y-2 border-t pt-4 text-xs text-muted-foreground">
              <p>
                Source: Google Search Console API · {data.siteUrl} · refreshed{" "}
                {new Date(data.fetchedAt).toLocaleString()} · cached for 5 minutes.
              </p>
              <p>
                Comparison: {data.previousDateRange.startDate} – {data.previousDateRange.endDate}.
                CTR is clicks divided by impressions. Lower average position is generally better.
                Totals come directly from Google, not sums of query or page rows.
              </p>
              <p>
                Google omits anonymized queries and returns top rows rather than every search. Each
                breakdown loads at most 10,000 rows; table exports include loaded rows only. Empty
                dates are not assumed to have zero traffic. This tab does not represent indexing
                coverage or a rank-tracking guarantee.
              </p>
            </footer>
          </>
        )
      )}
    </section>
  );
}
