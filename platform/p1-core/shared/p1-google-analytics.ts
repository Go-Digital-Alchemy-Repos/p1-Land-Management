export type GAReportKey =
  | "totals"
  | "previousTotals"
  | "daily"
  | "channels"
  | "sourceMedium"
  | "campaigns"
  | "pages"
  | "landingPages"
  | "countries"
  | "regions"
  | "cities"
  | "devices"
  | "browsers"
  | "events";
export interface GADateRange {
  startDate: string;
  endDate: string;
}
export interface GAReport {
  dimensions: string[];
  metrics: string[];
  rows: { dimensions: Record<string, string>; metrics: Record<string, number> }[];
  rowCount: number;
  truncated: boolean;
  metadata: {
    dataLossFromOtherRow?: boolean;
    subjectToThresholding?: boolean;
    emptyReason?: string;
    timeZone?: string;
    currencyCode?: string;
    samplingMetadatas?: { samplesReadCount: string; samplingSpaceSize: string }[];
  };
}
export interface GAReportsResponse {
  status: "ok" | "empty";
  propertyId: string;
  fetchedAt: string;
  dateRange: GADateRange;
  previousDateRange: GADateRange;
  reports: Record<GAReportKey, GAReport>;
}
export interface GARealtimeResponse {
  status: "ok" | "empty";
  propertyId: string;
  fetchedAt: string;
  windowMinutes: 30;
  reports: Record<"totals" | "countries" | "devices", GAReport>;
}
export interface GAErrorResponse {
  status: "unavailable";
  code: "invalid_date_range" | "not_configured" | "provider_unavailable";
  message: string;
}
