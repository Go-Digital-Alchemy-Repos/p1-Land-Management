import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scheduleDate,
  scheduleDateTime,
  scheduleDays,
  shiftScheduleDate,
  shiftScheduleMonth,
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
  assert.deepEqual(scheduleDays("2032-03-14", "month"), [
    "2032-03-01", "2032-03-02", "2032-03-03", "2032-03-04", "2032-03-05", "2032-03-06", "2032-03-07",
    "2032-03-08", "2032-03-09", "2032-03-10", "2032-03-11", "2032-03-12", "2032-03-13", "2032-03-14",
    "2032-03-15", "2032-03-16", "2032-03-17", "2032-03-18", "2032-03-19", "2032-03-20", "2032-03-21",
    "2032-03-22", "2032-03-23", "2032-03-24", "2032-03-25", "2032-03-26", "2032-03-27", "2032-03-28",
    "2032-03-29", "2032-03-30", "2032-03-31", "2032-04-01", "2032-04-02", "2032-04-03", "2032-04-04",
    "2032-04-05", "2032-04-06", "2032-04-07", "2032-04-08", "2032-04-09", "2032-04-10", "2032-04-11",
  ]);
  assert.equal(shiftScheduleDate("2032-03-01", -1), "2032-02-29");
  assert.equal(shiftScheduleDate("2032-12-31", 1), "2033-01-01");
  assert.equal(shiftScheduleMonth("2032-01-31", 1), "2032-02-29");
  assert.equal(shiftScheduleMonth("2032-03-31", -1), "2032-02-29");
});

test("scheduled visit display uses month/day/year and compact 12-hour Eastern time", () => {
  assert.equal(scheduleDateTime("2026-09-19T12:00:00.000Z"), "09/19/2026 8:00am");
  assert.equal(scheduleDateTime("2026-09-19T14:00:00Z"), "09/19/2026 10:00am");
  assert.equal(scheduleDateTime("2026-01-20T00:30:00Z"), "01/19/2026 7:30pm");
  assert.equal(scheduleDateTime("2032-03-14T07:30:00Z"), "03/14/2032 3:30am");
  assert.equal(scheduleDateTime(null), "—");
  assert.equal(scheduleDateTime(undefined), "—");
  assert.equal(scheduleDateTime("invalid"), "—");
});
