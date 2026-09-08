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

  const propertyId = "11111111-1111-4111-8111-111111111111";
  const clientId = "22222222-2222-4222-8222-222222222222";
  const workId = "33333333-3333-4333-8333-333333333333";
  const agreementId = "44444444-4444-4444-8444-444444444444";
  const property = routeFromPath(`/properties/${propertyId}/notes-files`);
  assert.equal(property.kind, "page");
  if (property.kind !== "page") return;
  assert.deepEqual(property.record, { kind: "property", id: propertyId, tab: "notes-files" });
  assert.equal(pathForRoute(property), `/properties/${propertyId}/notes-files`);

  const client = routeFromPath(`/clients/${clientId}/properties`);
  assert.equal(client.kind, "page");
  if (client.kind !== "page") return;
  assert.deepEqual(client.record, { kind: "client", id: clientId, tab: "properties" });
  assert.equal(pathForRoute(client), `/clients/${clientId}/properties`);

  const work = routeFromPath(`/schedule/work-orders/${workId}`);
  assert.equal(work.kind, "page");
  if (work.kind !== "page") return;
  assert.deepEqual(work.record, { kind: "work-order", id: workId });
  assert.equal(pathForRoute(work), `/schedule/work-orders/${workId}`);

  const agreement = routeFromPath(`/agreements/${agreementId}`);
  assert.equal(agreement.kind, "page");
  if (agreement.kind !== "page") return;
  assert.deepEqual(agreement.record, { kind: "agreement", id: agreementId });
  assert.equal(pathForRoute(agreement), `/agreements/${agreementId}`);
});

test("dashboard routes fail closed for unknown and role-restricted destinations", () => {
  assert.equal(routeFromPath("/settings/security/extra").kind, "not-found");
  assert.equal(routeFromPath("/clients/invalid/nope").kind, "not-found");
  assert.equal(routeFromPath("/properties/not-a-uuid").kind, "not-found");
  assert.equal(routeFromPath("/not-a-dashboard-page").kind, "not-found");

  const security = routeFromPath("/settings/security");
  assert.equal(canAccessRoute(security, "owner"), true);
  assert.equal(canAccessRoute(security, "client"), false);

  const agreement = routeFromPath("/agreements/44444444-4444-4444-8444-444444444444");
  assert.equal(canAccessRoute(agreement, "finance"), true);
  assert.equal(canAccessRoute(agreement, "sales"), false);
  assert.equal(canAccessRoute(routeFromPath("/clients/22222222-2222-4222-8222-222222222222"), "client"), false);

  assert.equal(defaultRouteForRole("crew").page.path, "/my-day");
  assert.equal(defaultRouteForRole("client").page.path, "/");
});
