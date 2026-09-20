import {
  AnalyticsOverview,
  AnalyticsSummaryCards,
} from "../../../../platform/p1-core/client/src/components/shared/analytics-overview-presentation";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getMarketingAnalytics,
  getMarketingRealtime,
  getMarketingSearchConsole,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingAnalytics,
  MarketingSearchConsole,
  MarketingRealtime,
  MarketingReport,
} from "../../../../lib/api-client-react/src/dashboard/models";
import {
  comparison,
  csvCell,
  metricFormat,
  presetRange,
} from "./report-format";
import "./marketing-reports.css";

type Source = "analytics" | "search-console";
type Range = { startDate: string; endDate: string };
const names: Record<string, string> = {
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
  clicks: "Search clicks",
  impressions: "Impressions",
  ctr: "Click-through rate",
  position: "Average position",
  query: "Search query",
  page: "Page",
};
const label = (key: string) => names[key] || key;
function reportError(error: unknown) {
  const payload = (error as { data?: { message?: unknown; error?: unknown } })
    ?.data;
  if (typeof payload?.message === "string") return payload.message;
  if (typeof payload?.error === "string") return payload.error;
  return "Reports could not be loaded. Check your connection and try again.";
}

const flattened = (report: MarketingReport) =>
  report.rows.map((row) => ({ ...row.dimensions, ...row.metrics }));
const sections = {
  overview: ["daily", "channels", "devices"],
  acquisition: ["channels", "sourceMedium", "campaigns"],
  pages: ["pages", "landingPages"],
  audience: ["countries", "regions", "cities", "devices", "browsers"],
  events: ["events"],
};
const reportNames: Record<string, string> = {
  daily: "Daily performance",
  channels: "Acquisition channels",
  sourceMedium: "Source / medium",
  campaigns: "Campaigns",
  pages: "Pages",
  landingPages: "Landing pages",
  countries: "Countries",
  regions: "Regions",
  cities: "Cities",
  devices: "Devices",
  browsers: "Browsers",
  events: "Events",
  queries: "Search queries",
};

function Disclosures({ report }: { report: MarketingReport }) {
  return (
    <div className="report-disclosures">
      {report.metadata.subjectToThresholding && (
        <p>Google applies privacy thresholds to this report.</p>
      )}
      {report.metadata.dataLossFromOtherRow && (
        <p>Google groups some values into “(other)”.</p>
      )}
      {!!report.metadata.samplingMetadatas?.length && (
        <p>Google returned sampled data.</p>
      )}
      {report.metadata.emptyReason && <p>{report.metadata.emptyReason}</p>}
      {report.truncated && (
        <p>
          Results are limited. Google reports {report.rowCount.toLocaleString()}{" "}
          rows; only {report.rows.length.toLocaleString()} loaded rows are
          available here.
        </p>
      )}
    </div>
  );
}
function ReportTable({
  title,
  report,
}: {
  title: string;
  report: MarketingReport;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({
    key: report.metrics[0] || report.dimensions[0],
    descending: true,
  });
  const [page, setPage] = useState(0);
  const columns = [...report.dimensions, ...report.metrics];
  const rows = useMemo(
    () =>
      report.rows
        .filter((row) =>
          Object.values(row.dimensions)
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((a, b) => {
          const av = a.metrics[sort.key] ?? a.dimensions[sort.key] ?? "",
            bv = b.metrics[sort.key] ?? b.dimensions[sort.key] ?? "";
          return (
            (typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv))) *
            (sort.descending ? -1 : 1)
          );
        }),
    [report, search, sort],
  );
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / 10) - 1));
  function exportRows() {
    const contents = [
      columns.map(label).map(csvCell).join(","),
      ...rows.map((row) =>
        columns
          .map((key) => csvCell(row.dimensions[key] ?? row.metrics[key]))
          .join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([contents], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `p1-${title.toLowerCase().replaceAll(" ", "-")}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="report-card" aria-label={title}>
      <header>
        <h3>{title}</h3>
        <div className="report-controls">
          <label>
            Search rows
            <input
              aria-label={`Search ${title}`}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </label>
          <button onClick={exportRows} disabled={!rows.length}>
            Export CSV
          </button>
        </div>
      </header>
      <Disclosures report={report} />
      {!rows.length ? (
        <p className="empty">
          {report.rows.length
            ? "No matching rows."
            : "No data for this period."}
        </p>
      ) : (
        <div className="report-table-scroll">
          <table>
            <thead>
              <tr>
                {columns.map((key) => (
                  <th
                    key={key}
                    aria-sort={
                      sort.key === key
                        ? sort.descending
                          ? "descending"
                          : "ascending"
                        : "none"
                    }
                  >
                    <button
                      onClick={() => {
                        setSort({
                          key,
                          descending:
                            sort.key === key ? !sort.descending : true,
                        });
                        setPage(0);
                      }}
                    >
                      {label(key)}{" "}
                      {sort.key === key ? (sort.descending ? "↓" : "↑") : "↕"}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(current * 10, current * 10 + 10).map((row, index) => (
                <tr key={index}>
                  {columns.map((key) => (
                    <td key={key}>
                      {row.metrics[key] !== undefined
                        ? metricFormat(row.metrics[key], key)
                        : row.dimensions[key] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer>
        <span>
          {rows.length.toLocaleString()} matching loaded rows. Export includes
          all matching rows.
        </span>
        <div>
          <button disabled={current === 0} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          <span>
            Page {current + 1} of {Math.max(1, Math.ceil(rows.length / 10))}
          </span>
          <button
            disabled={(current + 1) * 10 >= rows.length}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      </footer>
    </section>
  );
}
function ReportChart({
  report,
  title,
  daily = false,
  range,
}: {
  report: MarketingReport;
  title: string;
  daily?: boolean;
  range: Range;
}) {
  const [metric, setMetric] = useState(
    report.metrics.includes("sessions") ? "sessions" : report.metrics[0],
  );
  const selected = report.metrics.includes(metric) ? metric : report.metrics[0];
  const rows = useMemo(() => {
    const values = flattened(report);
    if (!daily)
      return values
        .sort((a, b) => Number(b[selected] || 0) - Number(a[selected] || 0))
        .slice(0, 10);
    const byDate = new Map(
      values.map((row) => [
        String(row.date).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3"),
        row,
      ]),
    );
    const points = [];
    for (
      let day = Date.parse(range.startDate);
      day <= Date.parse(range.endDate);
      day += 86400000
    ) {
      const date = new Date(day).toISOString().slice(0, 10);
      points.push({ ...byDate.get(date), date });
    }
    return points;
  }, [report, selected, daily, range]);
  return (
    <section className="report-card">
      <header>
        <h3>{title}</h3>
        <label>
          Chart metric
          <select
            aria-label={`${title} metric`}
            value={selected}
            onChange={(event) => setMetric(event.target.value)}
          >
            {report.metrics.map((key) => (
              <option key={key} value={key}>
                {label(key)}
              </option>
            ))}
          </select>
        </label>
      </header>
      {!report.rows.length ? (
        <p className="empty">No chart data for this period.</p>
      ) : (
        <div
          className="report-chart"
          role="img"
          aria-label={`${title}. Exact values are in the corresponding table.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            {daily ? (
              <AreaChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" minTickGap={40} />
                <YAxis
                  tickFormatter={(value) => metricFormat(value, selected)}
                />
                <Tooltip
                  formatter={(value) => metricFormat(Number(value), selected)}
                  contentStyle={{
                    background: "var(--surface)",
                    color: "var(--ink)",
                    borderColor: "var(--line)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={selected}
                  name={label(selected)}
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  connectNulls={false}
                />
              </AreaChart>
            ) : report.dimensions.includes("deviceCategory") &&
              !/Rate$|Duration|ctr|position/i.test(selected) ? (
              <PieChart>
                <Pie
                  data={rows}
                  dataKey={selected}
                  nameKey={report.dimensions[0]}
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {rows.map((_, index) => (
                    <Cell
                      key={index}
                      fill={
                        [
                          "#3b82f6",
                          "#8b5cf6",
                          "#14b8a6",
                          "#f59e0b",
                          "#ec4899",
                          "#64748b",
                        ][index % 6]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => metricFormat(Number(value), selected)}
                  contentStyle={{
                    background: "var(--surface)",
                    color: "var(--ink)",
                    borderColor: "var(--line)",
                  }}
                />
                <Legend />
              </PieChart>
            ) : (
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey={report.dimensions[0]}
                  tickFormatter={(value) => String(value).slice(0, 20)}
                />
                <YAxis
                  tickFormatter={(value) => metricFormat(value, selected)}
                />
                <Tooltip
                  formatter={(value) => metricFormat(Number(value), selected)}
                  contentStyle={{
                    background: "var(--surface)",
                    color: "var(--ink)",
                    borderColor: "var(--line)",
                  }}
                />
                <Bar
                  dataKey={selected}
                  name={label(selected)}
                  fill="hsl(var(--primary))"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      <p className="muted">
        {daily
          ? "Missing dates remain gaps; they are not assumed to be zero."
          : "Top 10 loaded rows for the selected metric. Segment values are not added to calculate totals."}
      </p>
    </section>
  );
}
function Realtime({ refresh }: { refresh: number }) {
  const [data, setData] = useState<MarketingRealtime>();
  const [error, setError] = useState("");
  useEffect(() => {
    let controller: AbortController | undefined;
    const load = async () => {
      if (document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      const current = controller;
      try {
        const result = await getMarketingRealtime({ signal: current.signal });
        if (!current.signal.aborted) {
          setData(result);
          setError("");
        }
      } catch (error) {
        if (!current.signal.aborted) {
          setData(undefined);
          setError(reportError(error));
        }
      }
    };
    void load();
    const timer = setInterval(() => void load(), 60000);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearInterval(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", load);
    };
  }, [refresh]);
  return (
    <section className="report-card" aria-label="Realtime reports">
      <h2>Last 30 minutes</h2>
      {error ? (
        <p role="status">Realtime unavailable: {error}</p>
      ) : !data ? (
        <p role="status">Loading realtime…</p>
      ) : (
        <>
          <p className="report-realtime-total">
            {data.reports.totals.rows[0]?.metrics.activeUsers === undefined
              ? "—"
              : metricFormat(
                  data.reports.totals.rows[0].metrics.activeUsers,
                  "activeUsers",
                )}{" "}
            active users
          </p>
          <div className="report-two-columns">
            <ReportTable
              title="Realtime countries"
              report={data.reports.countries}
            />
            <ReportTable
              title="Realtime devices"
              report={data.reports.devices}
            />
          </div>
          <p className="muted">
            Updated {new Date(data.fetchedAt).toLocaleString()}. Refreshes every
            minute while visible; server cache is 30 seconds.
          </p>
        </>
      )}
    </section>
  );
}
export function MarketingReports({ source }: { source: Source }) {
  const [range, setRange] = useState<Range>(() =>
    presetRange(
      28,
      source === "search-console" ? "America/Los_Angeles" : "UTC",
    ),
  );
  const [draft, setDraft] = useState(range);
  const [refresh, setRefresh] = useState(0);
  const [inputError, setInputError] = useState("");
  const [state, setState] = useState<{
    data?: MarketingAnalytics | MarketingSearchConsole;
    error?: string;
    loading: boolean;
  }>({ loading: true });
  const [tab, setTab] = useState<keyof typeof sections>("overview");
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    const read =
      source === "analytics"
        ? getMarketingAnalytics
        : getMarketingSearchConsole;
    void read(range, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ loading: false, error: reportError(error) });
      });
    return () => controller.abort();
  }, [source, range.startDate, range.endDate, refresh]);
  const data = state.data,
    reports = data?.reports as Record<string, MarketingReport> | undefined;
  const totals = reports?.totals.rows[0]?.metrics,
    previous = reports?.previousTotals.rows[0]?.metrics;
  const metrics =
    source === "analytics"
      ? [
          "activeUsers",
          "sessions",
          "screenPageViews",
          "engagementRate",
          "averageSessionDuration",
          "keyEvents",
        ]
      : ["clicks", "impressions", "ctr", "position"];
  const timeZone =
    source === "search-console"
      ? "America/Los_Angeles"
      : reports?.totals.metadata.timeZone || "UTC";
  const keys =
    source === "analytics"
      ? sections[tab]
      : ["daily", "queries", "pages", "countries", "devices"];
  return (
    <section
      className="marketing-reporting"
      aria-label={
        source === "analytics"
          ? "Google Analytics reports"
          : "Search Console reports"
      }
    >
      <p className="muted">
        {source === "analytics"
          ? "Traffic, acquisition and engagement on the public website. Dates use the selected Analytics property’s reporting timezone."
          : "Web search · finalized data · Pacific time. Recent days may not be available. Search clicks differ from Analytics sessions."}
      </p>
      <div className="report-card report-controls">
        <div className="report-presets">
          {[7, 28, 90].map((days) => (
            <button
              key={days}
              aria-pressed={
                JSON.stringify(range) ===
                JSON.stringify(presetRange(days, timeZone))
              }
              onClick={() => {
                const next = presetRange(days, timeZone);
                setRange(next);
                setDraft(next);
                setInputError("");
              }}
            >
              Last {days} days
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const days =
              (Date.parse(draft.endDate) - Date.parse(draft.startDate)) /
                86400000 +
              1;
            if (!Number.isFinite(days) || days < 1 || days > 93) {
              setInputError("Choose a valid date range of up to 93 days.");
              return;
            }
            setInputError("");
            setRange(draft);
          }}
        >
          <label>
            From
            <input
              type="date"
              required
              value={draft.startDate}
              onChange={(event) =>
                setDraft({ ...draft, startDate: event.target.value })
              }
            />
          </label>
          <label>
            Through
            <input
              type="date"
              required
              value={draft.endDate}
              onChange={(event) =>
                setDraft({ ...draft, endDate: event.target.value })
              }
            />
          </label>
          <button type="submit">Apply dates</button>
        </form>
        <button
          onClick={() => setRefresh((value) => value + 1)}
          disabled={state.loading}
        >
          Refresh reports
        </button>
      </div>
      {inputError && (
        <p role="alert" className="error">
          {inputError}
        </p>
      )}
      {source === "analytics" && <Realtime refresh={refresh} />}
      {state.loading ? (
        <p role="status">Loading reports…</p>
      ) : state.error ? (
        <section className="report-card">
          <p role="alert">{state.error}</p>
          <p className="muted">
            No demo data is substituted. Each source requires its own configured
            property and provider permission.
          </p>
        </section>
      ) : (
        data &&
        reports && (
          <>
            {data.status === "empty" && (
              <p role="status">No data is available for this period.</p>
            )}
            {source === "analytics" ? (
              <AnalyticsSummaryCards
                totals={totals}
                previous={previous}
                format={metricFormat}
                comparison={comparison}
              />
            ) : (
              <div className="report-metrics">
                {metrics.map((key) => (
                  <article className="report-card" key={key}>
                    <h3>{label(key)}</h3>
                    <strong>
                      {totals?.[key] === undefined
                        ? "—"
                        : metricFormat(totals[key], key)}
                    </strong>
                    <p className="muted">
                      {comparison(totals?.[key], previous?.[key])}
                    </p>
                  </article>
                ))}
              </div>
            )}
            <Disclosures report={reports.totals} />
            {source === "analytics" && (
              <nav
                className="report-tabs"
                aria-label="Analytics report sections"
              >
                {Object.keys(sections).map((key) => (
                  <button
                    key={key}
                    aria-pressed={tab === key}
                    onClick={() => setTab(key as keyof typeof sections)}
                  >
                    {key[0].toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </nav>
            )}
            {tab === "events" && source === "analytics" && (
              <p className="notice">
                Key events are Google Analytics events, not confirmed inquiries
                or qualified leads. Review accepted inquiries and outcomes in
                Sales. Public form/call conversion tracking is separate from
                these reports.
              </p>
            )}
            {source === "analytics" && tab === "overview" ? (
              <AnalyticsOverview
                daily={reports.daily}
                channels={reports.channels}
                devices={reports.devices}
                range={data.dateRange}
                label={label}
                format={metricFormat}
                note={(report) => <Disclosures report={report} />}
                table={(title, report) =>
                  report ? <ReportTable title={title} report={report} /> : null
                }
                allowMetricSelection
              />
            ) : (
              keys.map(
                (key) =>
                  reports[key] && (
                    <div className="report-section" key={key}>
                      <ReportChart
                        title={reportNames[key]}
                        report={reports[key]}
                        daily={key === "daily"}
                        range={data.dateRange}
                      />
                      <ReportTable
                        title={reportNames[key]}
                        report={reports[key]}
                      />
                    </div>
                  ),
              )
            )}
            <footer className="report-source">
              <a
                href={
                  source === "analytics"
                    ? `https://analytics.google.com/analytics/web/#/p${encodeURIComponent((data as MarketingAnalytics).propertyId)}`
                    : `https://search.google.com/search-console/performance/search-analytics?resource_id=${encodeURIComponent((data as MarketingSearchConsole).siteUrl)}`
                }
                target="_blank"
                rel="noreferrer"
              >
                Open{" "}
                {source === "analytics" ? "Google Analytics" : "Search Console"}
              </a>
              <p>
                Source:{" "}
                {source === "analytics"
                  ? `Google Analytics Data API · property ${(data as MarketingAnalytics).propertyId}`
                  : `Google Search Console API · ${(data as MarketingSearchConsole).siteUrl}`}{" "}
                · Updated {new Date(data.fetchedAt).toLocaleString()} · cached
                for 5 minutes.
              </p>
              <p>
                Period: {data.dateRange.startDate} – {data.dateRange.endDate}.
                Comparison: {data.previousDateRange.startDate} –{" "}
                {data.previousDateRange.endDate}.{" "}
                {reports.totals.metadata.timeZone &&
                  `Property timezone: ${reports.totals.metadata.timeZone}.`}
              </p>
              <p>
                Totals come directly from Google, not sums of segmented rows.
                Reports load at most 10,000 rows per breakdown; exports contain
                matching loaded rows only.
              </p>
              {source === "search-console" && (
                <p>
                  Google omits anonymized queries and returns top results. CTR
                  is clicks divided by impressions; lower average position is
                  generally better. This report does not provide indexing
                  coverage, URL inspection, Core Web Vitals, or guaranteed rank
                  tracking.
                </p>
              )}
            </footer>
          </>
        )
      )}
    </section>
  );
}
