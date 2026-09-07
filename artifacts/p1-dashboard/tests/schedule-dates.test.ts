import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scheduleDate,
  scheduleDays,
  shiftScheduleDate,
  scheduleTime,
} from "../src/schedule-dates";
test("New York calendar groups UTC timestamps across midnight and DST", () => {
  assert.equal(scheduleDate("2032-03-14T04:30:00Z"), "2032-03-13");
  assert.equal(scheduleDate("2032-03-14T07:30:00Z"), "2032-03-14");
  assert.equal(scheduleTime("2032-03-14T07:30:00Z"), "3:30 AM");
  assert.equal(scheduleTime("2032-11-07T06:30:00Z"), "1:30 AM");
  assert.deepEqual(scheduleDays("2032-03-14", "week"), [
    "2032-03-08",
    "2032-03-09",
    "2032-03-10",
    "2032-03-11",
    "2032-03-12",
    "2032-03-13",
    "2032-03-14",
  ]);
  assert.deepEqual(scheduleDays("2032-03-14", "day"), ["2032-03-14"]);
  assert.equal(shiftScheduleDate("2032-03-01", -1), "2032-02-29");
  assert.equal(shiftScheduleDate("2032-12-31", 1), "2033-01-01");
});
