import assert from "node:assert/strict";
import { test } from "node:test";
import { scheduleQueryRanges, visibleWorkOrders } from "../src/schedule-work";
import { scheduleDays } from "../src/schedule-dates";

const work = [
  { id: "one", scheduled_at: "2026-09-22T13:00:00Z" },
  { id: "two", scheduled_at: "2026-09-22T16:00:00Z" },
  { id: "three", scheduled_at: "2026-09-23T13:00:00Z" },
];

test("keeps the Schedule index concise and shows only the deep-linked work order", () => {
  assert.deepEqual(visibleWorkOrders(work, "Schedule", null, "2026-09-22"), []);
  assert.deepEqual(visibleWorkOrders(work, "Schedule", "two", "2026-09-22"), [
    work[1],
  ]);
  assert.deepEqual(
    visibleWorkOrders(work, "Schedule", "missing", "2026-09-22"),
    [],
  );
});

test("preserves all My Day assignments on the selected operating date", () => {
  assert.deepEqual(
    visibleWorkOrders(work, "My Day", "one", "2026-09-22"),
    work.slice(0, 2),
  );
  assert.deepEqual(visibleWorkOrders(work, "My Day", null, "2026-09-23"), [
    work[2],
  ]);
});

test("splits the 42-day month view into valid inclusive API ranges", () => {
  const days = scheduleDays("2026-09-22", "month");
  const ranges = scheduleQueryRanges(days);
  assert.deepEqual(ranges, [
    { from: days[0], through: days[31] },
    { from: days[32], through: days[41] },
  ]);
  assert.deepEqual(scheduleQueryRanges(scheduleDays("2026-09-22", "week")), [
    { from: "2026-09-21", through: "2026-09-27" },
  ]);
});
