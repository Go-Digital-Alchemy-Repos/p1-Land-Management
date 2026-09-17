import { requireCapability } from "./policy";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_GROUPS,
  CAPABILITIES,
  hasCapability,
  selectAccessGroup,
  accessGroupState,
  suggestedLegacyCapabilities,
} from "@workspace/api-zod/business-access";

test("only owner has automatic known-tool access; roles do not imply grants", () => {
  assert.equal(new Set(CAPABILITIES).size, CAPABILITIES.length);
  for (const capability of CAPABILITIES) {
    assert.equal(hasCapability({ role: "owner" }, capability), true);
    for (const role of [
      "member",
      "manager",
      "dispatch",
      "sales",
      "finance",
      "crew",
      "client",
      null,
    ]) {
      assert.equal(hasCapability({ role }, capability), false);
    }
  }
  assert.equal(hasCapability({ role: "owner" }, "unknown.future-tool"), false);
  for (const role of ["client", "crew"])
    for (const capability of CAPABILITIES) {
      assert.equal(
        hasCapability({ role, capabilities: [...CAPABILITIES] }, capability),
        false,
      );
    }
});
test("reporting permissions are independent of CRM and each other", () => {
  const subject = {
    role: "member",
    capabilities: ["marketing.analytics.view"],
  };
  assert.equal(hasCapability(subject, "marketing.analytics.view"), true);
  assert.equal(hasCapability(subject, "marketing.search-console.view"), false);
  assert.equal(hasCapability(subject, "revenue.sales"), false);
});
test("group selections are explicit leaves and preserve other groups", () => {
  const sales = ["revenue.sales"];
  assert.equal(accessGroupState(sales, "revenue"), "some");
  const all = selectAccessGroup(
    [...sales, "customers.clients"],
    "revenue",
    true,
  );
  assert.equal(accessGroupState(all, "revenue"), "all");
  assert.equal(all.includes("customers.clients"), true);
  assert.deepEqual(selectAccessGroup(all, "revenue", false), [
    "customers.clients",
  ]);
  assert.equal(
    all.some((value) => value.endsWith(".*")),
    false,
  );
  for (const group of ACCESS_GROUPS)
    assert.equal(accessGroupState([], group.id), "none");
});
test("legacy review proposals do not add reporting, marketing, or owner administration", () => {
  for (const role of ["manager", "sales", "finance", "dispatch", "crew"]) {
    const proposed = suggestedLegacyCapabilities(role);
    assert.equal(
      proposed.some((value) => value.startsWith("marketing.")),
      false,
    );
    assert.equal(hasCapability({ role }, "revenue.sales"), false);
  }
  assert.deepEqual(suggestedLegacyCapabilities("client"), []);
  assert.deepEqual(suggestedLegacyCapabilities("crew"), []);
});

test("office capability enforcement ignores old role privileges and keeps portal/crew boundaries", () => {
  for (const role of ["manager", "sales", "finance", "dispatch", "member"]) {
    assert.throws(
      () => requireCapability({ role }, "revenue.sales"),
      /Access denied/,
    );
    assert.doesNotThrow(() =>
      requireCapability(
        { role, capabilities: ["revenue.sales"] },
        "revenue.sales",
      ),
    );
    assert.throws(
      () =>
        requireCapability(
          { role, capabilities: ["revenue.sales"] },
          "revenue.billing",
        ),
      /Access denied/,
    );
  }
  for (const role of ["client", "crew"])
    assert.throws(
      () =>
        requireCapability(
          { role, capabilities: [...CAPABILITIES] },
          "revenue.sales",
        ),
      /Access denied/,
    );
  assert.doesNotThrow(() =>
    requireCapability({ role: "owner" }, "revenue.sales"),
  );
});
