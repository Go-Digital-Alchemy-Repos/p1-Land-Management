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

  const profile = routeFromPath("/profile/");
  assert.equal(profile.kind, "page");
  if (profile.kind !== "page") return;
  assert.equal(profile.page.view, "Profile");
  assert.equal(pathForRoute(profile), "/profile");

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
  assert.equal(canAccessRoute(routeFromPath("/profile"), "client"), true);
  assert.equal(canAccessRoute(routeFromPath("/profile"), "crew"), true);

  const agreement = routeFromPath("/agreements/44444444-4444-4444-8444-444444444444");
  assert.equal(canAccessRoute(agreement, "finance", ["revenue.billing"]), true);
  assert.equal(canAccessRoute(agreement, "sales"), false);
  assert.equal(canAccessRoute(routeFromPath("/projects"), "finance", ["operations.projects"]), true);
  assert.equal(canAccessRoute(routeFromPath("/projects"), "client"), false);
  assert.equal(canAccessRoute(routeFromPath("/clients/22222222-2222-4222-8222-222222222222"), "client"), false);

  assert.equal(defaultRouteForRole("crew").page.path, "/my-day");
  assert.equal(defaultRouteForRole("client").page.path, "/");
});

test("team navigation follows explicit tool grants and ungranted accounts land on their profile", () => {
  for (const role of ["manager", "sales", "finance", "dispatch", "member"]) {
    assert.equal(canAccessRoute(routeFromPath("/sales"), role), false);
    assert.equal(canAccessRoute(routeFromPath("/sales"), role, ["revenue.sales"]), true);
    assert.equal(canAccessRoute(routeFromPath("/billing"), role, ["revenue.sales"]), false);
    assert.equal(canAccessRoute(routeFromPath("/settings/people"), role, ["settings.preferences"]), false);
    assert.equal(defaultRouteForRole(role).page.path, "/profile");
    assert.equal(defaultRouteForRole(role, ["revenue.sales"]).page.path, "/sales");
  }
});

test("workspace deep links cannot bypass the grant for their source section", () => {
  const client = "/clients/22222222-2222-4222-8222-222222222222";
  assert.equal(canAccessRoute(routeFromPath(client), "member", ["customers.clients"]), true);
  assert.equal(canAccessRoute(routeFromPath(client + "/agreements"), "member", ["customers.clients"]), false);
  assert.equal(canAccessRoute(routeFromPath(client + "/agreements"), "member", ["customers.clients", "revenue.agreements"]), true);
  const property = "/properties/11111111-1111-4111-8111-111111111111";
  assert.equal(canAccessRoute(routeFromPath(property + "/schedule"), "crew"), true);
  assert.equal(canAccessRoute(routeFromPath(property + "/agreements"), "crew"), false);
});

test("website Forms uses its own Marketing capability", () => {
  const route = routeFromPath("/marketing/content/forms");
  assert.equal(route.kind, "page");
  assert.equal(canAccessRoute(route, "owner"), true);
  assert.equal(canAccessRoute(route, "member", ["marketing.content.forms"]), true);
  for (const role of ["member", "crew", "client"]) {
    assert.equal(canAccessRoute(route, role, ["marketing.content.pages"]), false);
  }
  assert.equal(canAccessRoute(route, "crew", ["marketing.content.forms"]), false);
});

test("website Events is separate from Forms and other content grants", () => {
  const route=routeFromPath("/marketing/content/events");
  assert.equal(route.kind,"page");
  assert.equal(canAccessRoute(route,"owner"),true);
  assert.equal(canAccessRoute(route,"member",["marketing.content.events"]),true);
  assert.equal(canAccessRoute(route,"member",["marketing.content.forms"]),false);
  assert.equal(canAccessRoute(route,"crew",["marketing.content.events"]),false);
});


test("agreement template management has its own route and does not inherit agreement access", () => {
  const route=routeFromPath("/agreements/templates");
  assert.equal(route.kind,"page");if(route.kind!=="page")return;
  assert.equal(route.page.view,"Agreement Templates");assert.equal(route.record,undefined);
  assert(canAccessRoute(route,"member",["revenue.agreement-templates.manage"]));
  for(const role of ["member","crew","client"])assert.equal(canAccessRoute(route,role,["revenue.agreements","revenue.sales"]),false);
  assert(canAccessRoute(route,"owner",[]));
});


test("agreement drafts have separate Sales write and Agreements read navigation, never template-only or portal access", () => {
  for (const path of ["/agreements/drafts", "/agreements/drafts/44444444-4444-4444-8444-444444444444"]) {
    const route = routeFromPath(path);
    assert.equal(route.kind, "page");
    if (route.kind !== "page") continue;
    assert.equal(route.page.view, "Agreement Drafts");
    assert.equal(pathForRoute(route), path);
    assert.equal(canAccessRoute(route, "owner"), true);
    for (const capability of ["revenue.sales", "revenue.agreements"]) assert.equal(canAccessRoute(route, "member", [capability]), true);
    for (const capability of ["revenue.agreement-templates.manage", "revenue.billing"]) assert.equal(canAccessRoute(route, "member", [capability]), false);
    assert.equal(canAccessRoute(route, "client", ["revenue.sales"]), false);
    assert.equal(canAccessRoute(route, "crew", ["revenue.sales"]), false);
  }
  assert.equal(routeFromPath("/agreements/drafts/nope").kind, "not-found");
});

test("Developer resources is an Owner-only Website System destination", () => {
  const route=routeFromPath("/marketing/system/documents");
  assert.equal(route.kind,"page");
  if(route.kind!=="page")return;
  assert.equal(route.page.view,"Website Documents");
  assert.equal(route.page.section,"Website System");
  assert.equal(canAccessRoute(route,"owner"),true);
  for(const role of ["admin","member","staff","client","crew",null])
    assert.equal(canAccessRoute(route,role,["marketing.content.pages"]),false);
});

test("Onboarding stays under Website System with Owner-only navigation", () => {
  const route=routeFromPath("/marketing/system/onboarding");
  assert.equal(route.kind,"page");if(route.kind!=="page")return;
  assert.equal(route.page.view,"Website Onboarding");assert.equal(route.page.section,"Website System");
  assert.equal(canAccessRoute(route,"owner"),true);
  for(const role of ["admin","member","client","crew",null]) assert.equal(canAccessRoute(route,role,["marketing.content.pages"]),false);
});

test("Email Templates is an Owner-only Website System destination", () => {
 const route=routeFromPath("/marketing/system/email-templates");
 assert.equal(route.kind,"page");if(route.kind!=="page")return;
 assert.equal(route.page.view,"Website Email Templates");assert.equal(route.page.section,"Website System");
 assert.equal(canAccessRoute(route,"owner"),true);
 for(const role of ["admin","member","client","crew",null]) assert.equal(canAccessRoute(route,role,["marketing.content.pages"]),false);
});
