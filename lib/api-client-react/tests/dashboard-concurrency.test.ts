import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deleteMarketingPage,
  deleteWebsiteMenu,
  acquireMarketingPageReservation,
  heartbeatMarketingPageReservation,
  releaseMarketingPageReservation,
} from "../src/dashboard/generated";

test("generated CMS DELETE and lease operations retain JSON concurrency bodies", async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; options?: RequestInit }> = [];
  globalThis.fetch = async (input, options) => {
    calls.push({ url: String(input), options });
    return Response.json({ success: true });
  };
  const proof = {
    expectedVersion: 7,
    editorInstanceId: "11111111-1111-4111-8111-111111111111",
    leaseId: "22222222-2222-4222-8222-222222222222",
  };
  try {
    await deleteMarketingPage("page", proof, { force: "true" });
    await deleteWebsiteMenu("menu", { expectedVersion: 9 });
    await acquireMarketingPageReservation("page", {
      editorInstanceId: proof.editorInstanceId,
    });
    await heartbeatMarketingPageReservation("page", proof);
    await releaseMarketingPageReservation("page", proof);
    assert.match(calls[0].url, /pages\/page\?force=true$/);
    assert.equal(calls[0].options?.method, "DELETE");
    assert.deepEqual(JSON.parse(String(calls[0].options?.body)), proof);
    assert.equal(calls[1].options?.method, "DELETE");
    assert.deepEqual(JSON.parse(String(calls[1].options?.body)), {
      expectedVersion: 9,
    });
    for (const call of calls.slice(2)) {
      assert.equal(call.options?.method, "POST");
      assert.equal(
        JSON.parse(String(call.options?.body)).editorInstanceId,
        proof.editorInstanceId,
      );
    }
    for (const call of calls.slice(3))
      assert.equal(
        JSON.parse(String(call.options?.body)).leaseId,
        proof.leaseId,
      );
  } finally {
    globalThis.fetch = original;
  }
});
