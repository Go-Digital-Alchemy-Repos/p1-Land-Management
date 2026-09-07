import { test } from "node:test";
import assert from "node:assert/strict";
import {
  listCommercialInquiries,
  updateCommercialFollowUp,
  getSchedule,
  rescheduleWork,
} from "@workspace/api-client-react/dashboard";
test("generated dashboard client preserves cursor filters, explicit nulls and conflict errors", async () => {
  const original = globalThis.fetch;
  const calls: { url: string; init?: RequestInit }[] = [];
  let fail = false;
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return fail
      ? Response.json(
          { error: "Inquiry changed; refresh before saving" },
          { status: 409 },
        )
      : Response.json({ items: [], nextCursor: null, id: "test", version: 2 });
  };
  try {
    await listCommercialInquiries({
      status: "contacted",
      ownerId: "unassigned",
      overdue: "true",
      cursor: "opaque_cursor",
    });
    const url = new URL(calls.at(-1)!.url, "https://example.test");
    assert.equal(url.pathname, "/api/v1/commercial-inquiries");
    assert.equal(url.searchParams.get("cursor"), "opaque_cursor");
    assert.equal(url.searchParams.get("ownerId"), "unassigned");
    assert.equal(url.searchParams.get("overdue"), "true");
    await updateCommercialFollowUp("lead-id", {
      expectedVersion: 1,
      ownerId: null,
      nextAction: "Call office",
      nextActionDueAt: null,
      status: "contacted",
    });
    assert.equal(calls.at(-1)!.init?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      expectedVersion: 1,
      ownerId: null,
      nextAction: "Call office",
      nextActionDueAt: null,
      status: "contacted",
    });
    await getSchedule({
      from: "2026-09-07",
      through: "2026-09-13",
      unscheduled: "true",
    });
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").searchParams.get(
        "unscheduled",
      ),
      "true",
    );
    await rescheduleWork("work-id", {
      scheduledAt: "2026-09-07T12:00:00Z",
      version: 1,
      reason: "Client request",
    });
    assert.equal(
      Object.hasOwn(JSON.parse(String(calls.at(-1)!.init?.body)), "assignedTo"),
      false,
    );
    await rescheduleWork("work-id", {
      scheduledAt: "2026-09-07T12:00:00Z",
      assignedTo: null,
      version: 1,
      reason: "Reassign",
    });
    assert.equal(JSON.parse(String(calls.at(-1)!.init?.body)).assignedTo, null);
    fail = true;
    await assert.rejects(
      listCommercialInquiries(),
      (e: unknown) =>
        e instanceof Error &&
        "status" in e &&
        e.status === 409 &&
        e.message.includes("Inquiry changed"),
    );
  } finally {
    globalThis.fetch = original;
  }
});
