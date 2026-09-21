export const scheduleTimeZone = "America/New_York";
export function scheduleDate(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: scheduleTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export function shiftScheduleDate(value: string, days: number) {
  const date = new Date(value + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function shiftScheduleMonth(value: string, months: number) {
  const current = new Date(value + "T12:00:00Z");
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth() + months;
  const day = current.getUTCDate();
  const first = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}
export function scheduleDays(value: string, mode: "day" | "week" | "month") {
  if (mode === "day") return [value];
  const weekday = new Date(value + "T12:00:00Z").getUTCDay();
  const monday = shiftScheduleDate(value, -((weekday + 6) % 7));
  if (mode === "month") {
    const monthStart = value.slice(0, 8) + "01";
    const monthWeekday = new Date(monthStart + "T12:00:00Z").getUTCDay();
    const firstVisibleDay = shiftScheduleDate(monthStart, -((monthWeekday + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => shiftScheduleDate(firstVisibleDay, i));
  }
  return Array.from({ length: 7 }, (_, i) => shiftScheduleDate(monday, i));
}
export function scheduleTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: scheduleTimeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Display scheduled instants in P1's scheduling timezone, independent of the device. */
export function scheduleDateTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "—";
  const [year, month, day] = scheduleDate(value).split("-");
  const time = scheduleTime(value).replace(/\s/g, "").toLowerCase();
  return `${month}/${day}/${year} ${time}`;
}
