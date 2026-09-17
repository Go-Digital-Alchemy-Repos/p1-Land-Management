import assert from "node:assert/strict";
import { test } from "node:test";
import {
  csvCell,
  comparison,
  metricFormat,
  presetRange,
} from "../src/marketing/report-format";
import {
  canAccessRoute,
  routeFromPath,
  NAVIGATION_GROUPS,
} from "../src/dashboard-routes";
test("Marketing precedes Settings and reporting routes require independent grants", () => {
  assert.equal(
    NAVIGATION_GROUPS.indexOf("Marketing") + 1,
    NAVIGATION_GROUPS.indexOf("Settings"),
  );
  const analytics = routeFromPath("/marketing/reporting/analytics"),
    search = routeFromPath("/marketing/reporting/search-console");
  assert.equal(
    canAccessRoute(analytics, "member", ["marketing.analytics.view"]),
    true,
  );
  assert.equal(
    canAccessRoute(search, "member", ["marketing.analytics.view"]),
    false,
  );
  assert.equal(
    canAccessRoute(analytics, "member", ["marketing.search-console.view"]),
    false,
  );
  assert.equal(
    canAccessRoute(search, "member", ["marketing.search-console.view"]),
    true,
  );
  for (const role of ["manager", "client", "crew"])
    assert.equal(canAccessRoute(analytics, role, []), false);
});
test("report formatting preserves percentages, unavailable comparisons and safe CSV cells", () => {
  assert.equal(metricFormat(0.25, "ctr"), "25%");
  assert.equal(comparison(5, 0), "No prior baseline");
  assert.equal(comparison(undefined, 2), "Comparison unavailable");
  for (const value of [
    "=SUM(A1:A2)",
    "+1",
    "-1",
    "@user",
    "\tcommand",
    "  =formula",
  ])
    assert(csvCell(value).startsWith("\"'"));
  assert.equal(csvCell('a"b'), '"a""b"');
});

test("search presets use Pacific calendar dates around UTC midnight", () => {
  assert.deepEqual(
    presetRange(7, "America/Los_Angeles", new Date("2026-09-17T01:00:00Z")),
    { startDate: "2026-09-09", endDate: "2026-09-15" },
  );
});
