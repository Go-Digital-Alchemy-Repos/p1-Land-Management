import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  AnalyticsOverview,
  AnalyticsSummaryCards,
} from "../../../platform/p1-core/client/src/components/shared/analytics-overview-presentation";
import { MarketingReports } from "../src/marketing/MarketingReports";
const api = vi.hoisted(() => ({
  getMarketingAnalytics: vi.fn(),
  getMarketingSearchConsole: vi.fn(),
  getMarketingRealtime: vi.fn(),
}));
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("recharts", () => {
  const pass = ({ children }: any) => <>{children}</>;
  const chart =
    (name: string) =>
    ({ children, data, layout, accessibilityLayer }: any) => (
      <div
        data-chart={name}
        data-points={JSON.stringify(data)}
        data-layout={layout}
        data-accessible={String(accessibilityLayer)}
      >
        <svg>{children}</svg>
      </div>
    );
  return {
    ResponsiveContainer: pass,
    AreaChart: chart("area"),
    BarChart: chart("bar"),
    PieChart: chart("pie"),
    Area: ({ dataKey, connectNulls }: any) => (
      <g data-series={dataKey} data-connect={String(connectNulls)} />
    ),
    Bar: pass,
    Pie: pass,
    Cell: pass,
    Legend: pass,
    CartesianGrid: pass,
    Tooltip: pass,
    XAxis: pass,
    YAxis: pass,
  };
});
let root: Root, host: HTMLDivElement;
const report = (dimensions: string[], metrics: string[], rows: any[]) => ({
  dimensions,
  metrics,
  rows,
  rowCount: rows.length,
  truncated: false,
  metadata: {},
});
const totals = report(
  [],
  ["activeUsers", "sessions"],
  [{ dimensions: {}, metrics: { activeUsers: 125, sessions: 180 } }],
);
const daily = report(
  ["date"],
  ["sessions", "activeUsers"],
  [
    {
      dimensions: { date: "20260901" },
      metrics: { sessions: 2, activeUsers: 1 },
    },
    {
      dimensions: { date: "20260903" },
      metrics: { sessions: 7, activeUsers: 4 },
    },
  ],
);
const channels = report(
  ["channel"],
  ["sessions", "activeUsers"],
  [
    {
      dimensions: { channel: "Organic search with full label" },
      metrics: { sessions: 9, activeUsers: 5 },
    },
  ],
);
const devices = report(
  ["deviceCategory"],
  ["sessions"],
  [{ dimensions: { deviceCategory: "desktop" }, metrics: { sessions: 9 } }],
);
const range = { startDate: "2026-09-01", endDate: "2026-09-03" };
const data = (users = 125) => ({
  status: "ready",
  propertyId: "1",
  dateRange: range,
  previousDateRange: range,
  fetchedAt: "2026-09-04T12:00:00Z",
  reports: {
    totals: {
      ...totals,
      rows: [
        { dimensions: {}, metrics: { activeUsers: users, sessions: 180 } },
      ],
    },
    previousTotals: totals,
    daily,
    channels,
    devices,
  },
});
const format = (value: number) => String(value);
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  api.getMarketingRealtime.mockImplementation(() => new Promise(() => {}));
  api.getMarketingAnalytics.mockResolvedValue(data());
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render(node: React.ReactNode) {
  await act(async () => root.render(node));
}
async function click(text: string) {
  const button = [...host.querySelectorAll("button")].find(
    (b) => b.textContent === text,
  )!;
  expect(button).toBeTruthy();
  await act(async () => button.click());
}
it("shares six truthful KPI cards with standalone colorful icons", async () => {
  await render(
    <AnalyticsSummaryCards
      totals={{ activeUsers: 125, sessions: 0 }}
      format={format}
      comparison={() => "Comparison unavailable"}
    />,
  );
  expect(host.querySelectorAll(".analytics-summary-card")).toHaveLength(6);
  expect(
    host.querySelector('[aria-label="Active users"] .analytics-summary-value')
      ?.textContent,
  ).toBe("125");
  expect(
    host.querySelector('[aria-label="Sessions"] .analytics-summary-value')
      ?.textContent,
  ).toBe("0");
  expect(
    host.querySelector('[aria-label="Page views"] .analytics-summary-value')
      ?.textContent,
  ).toBe("—");
  expect(
    new Set([...host.querySelectorAll("svg")].map((svg) => svg.style.color))
      .size,
  ).toBeGreaterThan(1);
  expect(
    host.querySelectorAll(".analytics-summary-card header > svg"),
  ).toHaveLength(6);
});
it("retains original overview grouping, readable horizontal breakdown and missing-date gaps", async () => {
  await render(
    <AnalyticsOverview
      daily={daily}
      channels={channels}
      devices={devices}
      range={range}
      label={(key) => key}
      format={format}
      table={(title) => <div data-table>{title}</div>}
    />,
  );
  expect(
    host
      .querySelector(".analytics-overview-pair")
      ?.querySelectorAll(".analytics-breakdown"),
  ).toHaveLength(2);
  expect(host.querySelectorAll("[data-table]")).toHaveLength(1);
  expect(host.querySelector("[data-table]")?.textContent).toBe(
    "Daily activity",
  );
  const area = host.querySelector('[data-chart="area"]')!;
  const points = JSON.parse(area.getAttribute("data-points")!);
  expect(points).toHaveLength(3);
  expect(points[1]).toEqual({ date: "2026-09-02" });
  expect(area.getAttribute("data-accessible")).toBe("true");
  expect(
    host.querySelector("[data-connect]")?.getAttribute("data-connect"),
  ).toBe("false");
  expect(
    host.querySelector('[data-chart="bar"]')?.getAttribute("data-layout"),
  ).toBe("vertical");
  expect(
    host.querySelector('[data-chart="bar"]')?.getAttribute("data-points"),
  ).toContain("Organic search with full label");
  const select = host.querySelector(
    '[aria-label="Trend metric"]',
  ) as HTMLSelectElement;
  await act(async () => {
    select.value = "activeUsers";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(host.querySelector("[data-series]")?.getAttribute("data-series")).toBe(
    "activeUsers",
  );
});
it("preserves native metric choices and reports actual empty data", async () => {
  await render(
    <AnalyticsOverview
      daily={{ ...daily, rows: [] }}
      channels={channels}
      devices={devices}
      range={range}
      label={(key) => key}
      format={format}
      table={() => null}
      allowMetricSelection
    />,
  );
  expect(host.querySelector(".analytics-overview-empty")?.textContent).toBe(
    "No data for this period.",
  );
  expect(
    host.querySelectorAll('[aria-label="Acquisition mix metric"] option'),
  ).toHaveLength(2);
  expect(host.querySelector('[data-chart="area"]')).toBeNull();
});
it("native adapter uses shared overview but retains tables in acquisition and date-fetch ownership", async () => {
  let oldResolve!: (value: unknown) => void;
  api.getMarketingAnalytics.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        oldResolve = resolve;
      }),
  );
  await render(<MarketingReports source="analytics" />);
  const firstSignal = api.getMarketingAnalytics.mock.calls[0][1].signal;
  await click("Last 7 days");
  expect(firstSignal.aborted).toBe(true);
  expect(host.querySelector(".analytics-overview")).toBeTruthy();
  await act(async () => oldResolve(data(999)));
  expect(
    host.querySelector('[aria-label="Active users"] .analytics-summary-value')
      ?.textContent,
  ).toBe("125");
  await click("Acquisition");
  expect(host.querySelector(".analytics-overview")).toBeNull();
  expect(
    [...host.querySelectorAll("button")].some(
      (b) => b.textContent === "Export CSV",
    ),
  ).toBe(true);
});
it("keeps Analytics and Search Console transports independent", async () => {
  api.getMarketingSearchConsole.mockRejectedValue({
    data: { message: "Search Console access denied" },
  });
  await render(<MarketingReports source="search-console" />);
  expect(api.getMarketingAnalytics).not.toHaveBeenCalled();
  expect(api.getMarketingRealtime).not.toHaveBeenCalled();
  expect(host.querySelector('[role="alert"]')?.textContent).toBe(
    "Search Console access denied",
  );
  expect(host.querySelector(".analytics-summary")).toBeNull();
});
