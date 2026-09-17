import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canPrepareServiceRequestDraft,
  serviceRequestTransitionTargets,
  serviceRequestUiPolicy,
} from "../src/service-request-triage.policy";

test("service-request triage UI keeps client and crew views minimized", () => {
  assert.equal(serviceRequestUiPolicy("client"), "minimized");
  assert.equal(serviceRequestUiPolicy("crew"), "none");
  assert.equal(serviceRequestUiPolicy("sales"), "none");
  assert.equal(serviceRequestUiPolicy("finance"), "none");
  assert.equal(serviceRequestUiPolicy("dispatch"), "none");
  assert.equal(canPrepareServiceRequestDraft("client", "triaged"), false);
  assert.equal(canPrepareServiceRequestDraft("crew", "triaged"), false);
  assert.equal(canPrepareServiceRequestDraft("finance", "triaged"), false);
});

test("service-request triage offers only lifecycle transitions and draft-safe conversion", () => {
  assert.deepEqual(serviceRequestTransitionTargets("new"), [
    "triaged",
    "closed",
    "cancelled",
  ]);
  assert.deepEqual(serviceRequestTransitionTargets("converted"), []);
  assert.deepEqual(
    serviceRequestTransitionTargets("unknown legacy status"),
    [],
  );
  assert.equal(canPrepareServiceRequestDraft("owner", "triaged"), true);
  assert.equal(canPrepareServiceRequestDraft("member", "scheduled", ["customers.requests", "operations.schedule"]), true);
  assert.equal(canPrepareServiceRequestDraft("dispatch", "new"), false);
  assert.equal(canPrepareServiceRequestDraft("owner", "converted"), false);
});

test("request management and scheduling require independent grants", () => {
  assert.equal(serviceRequestUiPolicy("member", ["customers.requests"]), "manage");
  assert.equal(canPrepareServiceRequestDraft("member", "triaged", ["customers.requests"]), false);
  assert.equal(serviceRequestUiPolicy("crew", ["customers.requests"]), "none");
});
