import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canAccessRoute,
  defaultRouteForRole,
  pathForRoute,
  routeFromPath,
} from "../src/dashboard-routes";

test("dashboard routes preserve canonical modules, settings, and supported record links", () => {
  const settings = routeFromPath("/settings/security/");
  assert.equal(settings.kind, "page");
  if (settings.kind !== "page") return;
  assert.equal(settings.page.view, "Settings");
  assert.equal(settings.page.settingsSection, "security");
  assert.equal(pathForRoute(settings), "/settings/security");

  const property = routeFromPath("/properties/property-id");
  assert.equal(property.kind, "page");
  if (property.kind !== "page") return;
  assert.deepEqual(property.record, { kind: "property", id: "property-id" });
  assert.equal(pathForRoute(property), "/properties/property-id");

  const work = routeFromPath("/schedule/work-orders/work-id");
  assert.equal(work.kind, "page");
  if (work.kind !== "page") return;
  assert.deepEqual(work.record, { kind: "work-order", id: "work-id" });
  assert.equal(pathForRoute(work), "/schedule/work-orders/work-id");

  const agreement = routeFromPath("/agreements/agreement-id");
  assert.equal(agreement.kind, "page");
  if (agreement.kind !== "page") return;
  assert.deepEqual(agreement.record, { kind: "agreement", id: "agreement-id" });
  assert.equal(pathForRoute(agreement), "/agreements/agreement-id");
});

test("dashboard routes fail closed for unknown and role-restricted destinations", () => {
  assert.equal(routeFromPath("/settings/security/extra").kind, "not-found");
  assert.equal(routeFromPath("/not-a-dashboard-page").kind, "not-found");

  const security = routeFromPath("/settings/security");
  assert.equal(canAccessRoute(security, "owner"), true);
  assert.equal(canAccessRoute(security, "client"), false);

  const agreement = routeFromPath("/agreements/agreement-id");
  assert.equal(canAccessRoute(agreement, "finance"), true);
  assert.equal(canAccessRoute(agreement, "sales"), false);

  assert.equal(defaultRouteForRole("crew").page.path, "/my-day");
  assert.equal(defaultRouteForRole("client").page.path, "/");
});
