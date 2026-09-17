import type { GAReport } from "./p1-google-analytics";
export type SearchReportKey =
  | "totals"
  | "previousTotals"
  | "daily"
  | "queries"
  | "pages"
  | "countries"
  | "devices";
export interface SearchConsoleResponse {
  siteUrl: string;
  fetchedAt: string;
  status: "ok" | "empty";
  dateRange: { startDate: string; endDate: string };
  previousDateRange: { startDate: string; endDate: string };
  reports: Record<SearchReportKey, GAReport>;
}
