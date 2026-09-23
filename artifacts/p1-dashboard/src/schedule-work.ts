import { scheduleDate } from "./schedule-dates";

/** The calendar is the Schedule index; My Day still lists every assignment for its date. */
export function visibleWorkOrders<
  T extends { id: string; scheduled_at?: string | null },
>(
  work: T[],
  view: "Schedule" | "My Day",
  selectedWorkId: string | null,
  fieldDay: string,
): T[] {
  return work.filter((item) =>
    view === "Schedule"
      ? Boolean(selectedWorkId && item.id === selectedWorkId)
      : Boolean(
          item.scheduled_at && scheduleDate(item.scheduled_at) === fieldDay,
        ),
  );
}

/** The schedule API accepts at most 32 inclusive calendar days per request. */
export function scheduleQueryRanges(
  days: string[],
): { from: string; through: string }[] {
  const ranges: { from: string; through: string }[] = [];
  for (let index = 0; index < days.length; index += 32) {
    ranges.push({
      from: days[index],
      through: days[Math.min(index + 31, days.length - 1)],
    });
  }
  return ranges;
}
