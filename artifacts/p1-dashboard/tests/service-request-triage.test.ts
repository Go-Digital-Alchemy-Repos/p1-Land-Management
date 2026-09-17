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
  assert.equal(serviceRequestUiPolicy("sales"), "read");
  assert.equal(serviceRequestUiPolicy("finance"), "read");
  assert.equal(serviceRequestUiPolicy("dispatch"), "manage");
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
  assert.equal(canPrepareServiceRequestDraft("manager", "scheduled"), true);
  assert.equal(canPrepareServiceRequestDraft("dispatch", "new"), false);
  assert.equal(canPrepareServiceRequestDraft("owner", "converted"), false);
});
