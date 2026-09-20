/** Google calendar dates are not instants; format without timezone conversion. */
export function dimensionFormat(value: string | undefined, dimension: string) {
  if (!value) return "—";
  if (dimension !== "date") return value;
  const match = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) return value;
  return `${month}/${day}/${year}`;
}

export function metricFormat(value: number, metric: string) {
  if (/Rate$/.test(metric) || metric === "ctr")
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(value);
  if (/Duration|engagementDuration/i.test(metric))
    return `${Math.floor(Math.round(value) / 60)}m ${Math.round(value) % 60}s`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
    value,
  );
}
export function comparison(
  current: number | undefined,
  previous: number | undefined,
) {
  if (current === undefined || previous === undefined)
    return "Comparison unavailable";
  if (previous === 0) return current === 0 ? "No change" : "No prior baseline";
  const change = (current - previous) / previous;
  return `${change > 0 ? "+" : ""}${(change * 100).toFixed(1)}% vs previous period`;
}
export function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${(/^(?:[=+@\-\t\r]|\s+[=+@-])/.test(text) ? "'" : "") + text.replaceAll('"', '""')}"`;
}
export function presetRange(days: number, timeZone = "UTC", now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  const end = new Date(
    `${value("year")}-${value("month")}-${value("day")}T00:00:00Z`,
  );
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
