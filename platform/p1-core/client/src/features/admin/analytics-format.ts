export function metricFormat(value: number, metric: string) {
  if (/Rate$/.test(metric) || metric === "ctr")
    return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(
      value,
    );
  if (/Duration|engagementDuration/i.test(metric))
    return `${Math.floor(Math.round(value) / 60)}m ${Math.round(value) % 60}s`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}
export function comparison(current: number | undefined, previous: number | undefined) {
  if (current === undefined || previous === undefined) return "Comparison unavailable";
  if (previous === 0) return current === 0 ? "No change" : "No prior baseline";
  const change = (current - previous) / previous;
  return `${change > 0 ? "+" : ""}${(change * 100).toFixed(1)}% vs previous period`;
}
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
}
export function presetRange(days: number) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}
