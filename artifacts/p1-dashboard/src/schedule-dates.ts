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
export function scheduleDays(value: string, mode: "day" | "week") {
  if (mode === "day") return [value];
  const weekday = new Date(value + "T12:00:00Z").getUTCDay();
  const monday = shiftScheduleDate(value, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftScheduleDate(monday, i));
}
export function scheduleTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: scheduleTimeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
