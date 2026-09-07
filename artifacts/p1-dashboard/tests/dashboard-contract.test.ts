import { test } from "node:test";
import assert from "node:assert/strict";
import {
  listCommercialInquiries,
  updateCommercialFollowUp,
  getSchedule,
  rescheduleWork,
  updateWorkReadiness,
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
    await updateWorkReadiness("work-id", {
      version: 4,
      prerequisites: [{ label: "Equipment: inspection", done: true }],
      reason: "Inspection completed",
    });
    assert.equal(calls.at(-1)!.init?.method, "POST");
    assert.equal(
      new URL(calls.at(-1)!.url, "https://example.test").pathname,
      "/api/v1/work-orders/work-id/readiness",
    );
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.init?.body)), {
      version: 4,
      prerequisites: [{ label: "Equipment: inspection", done: true }],
      reason: "Inspection completed",
    });
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

test("generated identity transport preserves nullable role and optional MFA state without granting assurance", async () => {
  const { getDashboardMe } =
    await import("@workspace/api-client-react/dashboard");
  const original = globalThis.fetch;
  let response: Record<string, unknown> = {
    id: "inactive",
    name: "Fixture",
    email: "fixture@example.test",
    role: null,
    mfaRequired: false,
    ownerMfaRequired: false,
  };
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "/api/v1/me");
    assert.equal(init?.method, "GET");
    assert.equal(init?.body, undefined);
    return Response.json(response);
  };
  try {
    assert.deepEqual(await getDashboardMe(), response);
    response = {
      ...response,
      role: "owner",
      twoFactorEnabled: null,
      mfaRequired: true,
      ownerMfaRequired: true,
    };
    const owner = await getDashboardMe();
    assert.equal(owner.mfaRequired, true);
    assert.equal(owner.ownerMfaRequired, true);
    assert.equal(owner.twoFactorEnabled, null);
  } finally {
    globalThis.fetch = original;
  }
});

test("generated property reads preserve role-minimized snapshots and unknown historical payloads", async () => {
  const { listDashboardProperties, getPropertyTimeline, listPropertyFiles } =
    await import("@workspace/api-client-react/dashboard");
  const original = globalThis.fetch;
  const property = {
    id: "property",
    client_id: "client",
    name: "Fixture",
    address: "Synthetic",
    acreage: null,
  };
  const event = {
    id: "event",
    kind: "note",
    payload: { historicalField: "retained" },
    conflict: false,
    published: true,
    captured_at: "2026-09-07T09:00:00Z",
    title: "Visit",
  };
  const file = {
    id: "file",
    name: "before",
    mime: "image/webp",
    classification: "before",
    published: true,
    created_at: "2026-09-07T09:00:00Z",
  };
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.method, "GET");
    const path = String(input);
    assert.ok(
      [
        "/api/v1/properties",
        "/api/v1/properties/property/timeline",
        "/api/v1/properties/property/files",
      ].includes(path),
    );
    return Response.json(
      path.endsWith("/timeline")
        ? [event]
        : path.endsWith("/files")
          ? [file]
          : [property],
    );
  };
  try {
    const [p] = await listDashboardProperties();
    assert.deepEqual(p, property);
    assert.equal(p.access_instructions, undefined);
    assert.equal(p.acreage, null);
    assert.deepEqual(await getPropertyTimeline("property"), [event]);
    assert.deepEqual(await listPropertyFiles("property"), [file]);
  } finally {
    globalThis.fetch = original;
  }
});

test("generated binary upload preserves exact bytes, typed target headers and native auth headers", async () => {
  const { uploadFieldPhoto, getPrivateFileContent } =
    await import("@workspace/api-client-react/dashboard");
  const original = globalThis.fetch;
  const bytes = new Uint8Array([137, 80, 78, 71, 0, 255, 3]);
  const blob = new Blob([bytes], { type: "image/png" });
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls++;
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer synthetic-test-token",
    );
    if (String(input).endsWith("/content"))
      return new Response(blob, { headers: { "Content-Type": "image/png" } });
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, blob);
    assert.deepEqual(
      new Uint8Array(await (init?.body as Blob).arrayBuffer()),
      bytes,
    );
    const h = new Headers(init?.headers);
    assert.equal(h.get("Content-Type"), "image/png");
    assert.equal(h.get("x-p1-property"), "property");
    assert.equal(h.get("x-p1-work"), "work");
    assert.equal(h.get("x-p1-classification"), "before");
    return Response.json({ id: "photo", status: "accepted" }, { status: 201 });
  };
  const options = {
    headers: new Headers({ Authorization: "Bearer synthetic-test-token" }),
  };
  try {
    assert.deepEqual(
      await uploadFieldPhoto(
        "photo",
        blob,
        {
          "x-p1-property": "property",
          "x-p1-work": "work",
          "x-p1-classification": "before",
        },
        options,
      ),
      { id: "photo", status: "accepted" },
    );
    const downloaded = await getPrivateFileContent("photo", options);
    assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()), bytes);
    await assert.rejects(
      uploadFieldPhoto(
        "photo",
        new Blob([bytes]),
        { "x-p1-property": "property", "x-p1-work": "work" },
        options,
      ),
      /must declare/,
    );
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});
