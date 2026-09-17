import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { pool } from "./database";

const base = process.env.DASHBOARD_TEST_ORIGIN;
if (base && !base.startsWith("http://localhost:"))
  throw new Error("Service request tests require an isolated local origin");
after(() => pool.end());

test(
  "service requests retain compatible intake, isolate clients, and convert once into an unscheduled planning draft",
  { skip: !base },
  async () => {
    const clientId = randomUUID(),
      otherClientId = randomUUID();
    const propertyId = randomUUID(),
      otherPropertyId = randomUUID();
    await pool.query(
      "INSERT INTO client(id,name) VALUES($1,'Service request client'),($2,'Other client')",
      [clientId, otherClientId],
    );
    await pool.query(
      "INSERT INTO property(id,client_id,name,address,lifecycle) VALUES($1,$2,'Service request property','Synthetic','operational'),($3,$4,'Other property','Synthetic','operational')",
      [propertyId, clientId, otherPropertyId, otherClientId],
    );

    const users: Record<string, { id: string; cookie: string }> = {};
    for (const role of [
      "manager",
      "finance",
      "crew",
      "client",
      "otherClient",
    ] as const) {
      const uid = randomUUID(),
        sid = randomUUID(),
        token = randomUUID();
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [uid, role, `${uid}@example.test`],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,$2)",
        [uid, role === "otherClient" ? "client" : role],
      );
      await pool.query(
        'INSERT INTO session(id,"expiresAt",token,"userId") VALUES($1,now()+interval \'1 hour\',$2,$3)',
        [sid, token, uid],
      );
      users[role] = {
        id: uid,
        cookie:
          "p1-dashboard.session_token=" +
          encodeURIComponent(
            token +
              "." +
              createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
                .update(token)
                .digest("base64"),
          ),
      };
    }
    await pool.query(
      "INSERT INTO client_access(client_id,user_id) VALUES($1,$2),($3,$4)",
      [clientId, users.client.id, otherClientId, users.otherClient.id],
    );

    async function request(
      role: keyof typeof users,
      path: string,
      body?: unknown,
      method = body === undefined ? "GET" : "POST",
    ) {
      const response = await fetch(base + path, {
        method,
        headers: {
          origin: base!,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          cookie: users[role].cookie,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, body: (await response.json()) as any };
    }

    const opened = await request("client", "/api/v1/requests", {
      propertyId,
      description: "Please inspect the north entry after the storm.",
    });
    assert.equal(opened.status, 201);
    const requestId = opened.body.id;
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM service_request_event WHERE service_request_id=$1 AND event_type='created'",
          [requestId],
        )
      ).rows[0].n,
      1,
    );
    const clientRead = await request(
      "client",
      `/api/v1/service-requests/${requestId}`,
    );
    assert.deepEqual(
      {
        status: clientRead.status,
        statusLabel: clientRead.body.status,
        exposesSubmitter: "user_id" in clientRead.body,
        exposesVersion: "version" in clientRead.body,
      },
      {
        status: 200,
        statusLabel: "received",
        exposesSubmitter: false,
        exposesVersion: false,
      },
    );
    assert.equal(
      (await request("otherClient", `/api/v1/service-requests/${requestId}`))
        .status,
      404,
    );
    assert.equal(
      (await request("crew", `/api/v1/service-requests/${requestId}`)).status,
      403,
    );
    assert.equal(
      (
        await request(
          "finance",
          `/api/v1/service-requests/${requestId}/transitions`,
          {
            expectedVersion: 1,
            status: "triaged",
            reason: "No dispatch authority",
          },
        )
      ).status,
      403,
    );

    const triaged = await request(
      "manager",
      `/api/v1/service-requests/${requestId}/transitions`,
      {
        expectedVersion: 1,
        status: "triaged",
        reason: "Office reviewed the request",
      },
    );
    assert.deepEqual(
      {
        status: triaged.status,
        version: triaged.body.version,
        state: triaged.body.status,
      },
      { status: 200, version: 2, state: "triaged" },
    );
    assert.equal(
      (
        await request(
          "manager",
          `/api/v1/service-requests/${requestId}/transitions`,
          { expectedVersion: 1, status: "closed", reason: "Stale editor" },
        )
      ).status,
      409,
    );
    assert.equal(
      (await request("client", `/api/v1/service-requests/${requestId}`)).body
        .status,
      "under_review",
    );

    const conversion = {
      operationId: randomUUID(),
      expectedRequestVersion: 2,
      title: "North entry inspection",
      scope: "Inspect storm damage and document required follow-up.",
      checklist: [{ label: "Photograph entry", done: false }],
      prerequisites: [{ label: "Confirm gate access", done: false }],
    };
    const preview = await request(
      "manager",
      `/api/v1/service-requests/${requestId}/conversion-preview`,
      {
        title: conversion.title,
        scope: conversion.scope,
        checklist: conversion.checklist,
        prerequisites: conversion.prerequisites,
      },
    );
    assert.deepEqual(
      {
        status: preview.status,
        workStatus: preview.body.workOrder.status,
        assigned: preview.body.workOrder.assignedTo,
        scheduled: preview.body.workOrder.scheduledAt,
        providerActions: preview.body.providerActions,
      },
      {
        status: 200,
        workStatus: "draft",
        assigned: null,
        scheduled: null,
        providerActions: [],
      },
    );
    const first = await request(
      "manager",
      `/api/v1/service-requests/${requestId}/conversions`,
      conversion,
    );
    assert.equal(first.status, 201);
    const work = (
      await pool.query(
        "SELECT status,assigned_to,scheduled_at,published FROM work_order WHERE id=$1",
        [first.body.id],
      )
    ).rows[0];
    assert.deepEqual(work, {
      status: "draft",
      assigned_to: null,
      scheduled_at: null,
      published: false,
    });
    // Other integration files share this disposable database and may legitimately
    // create unrelated jobs. A conversion must not enqueue anything that refers to
    // its unique request or newly created work order.
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM outbox WHERE payload::text LIKE '%' || $1 || '%' OR payload::text LIKE '%' || $2 || '%'",
          [requestId, first.body.id],
        )
      ).rows[0].n,
      0,
    );
    const retry = await request(
      "manager",
      `/api/v1/service-requests/${requestId}/conversions`,
      conversion,
    );
    assert.deepEqual(
      { status: retry.status, id: retry.body.id, created: retry.body.created },
      { status: 200, id: first.body.id, created: false },
    );
    assert.equal(
      (
        await request(
          "manager",
          `/api/v1/service-requests/${requestId}/conversions`,
          { ...conversion, title: "Changed operation payload" },
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          "manager",
          `/api/v1/service-requests/${requestId}/conversions`,
          {
            ...conversion,
            operationId: randomUUID(),
            expectedRequestVersion: 3,
          },
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM service_request_conversion WHERE service_request_id=$1",
          [requestId],
        )
      ).rows[0].n,
      1,
    );
    const history = await request(
      "finance",
      `/api/v1/service-requests/${requestId}/history`,
    );
    assert.equal(history.status, 200);
    assert.deepEqual(
      history.body.map((entry: any) => entry.event_type).sort(),
      ["converted", "created", "transitioned"],
    );
    await assert.rejects(
      pool.query(
        "UPDATE service_request_event SET reason='changed' WHERE service_request_id=$1",
        [requestId],
      ),
      /append-only/,
    );

    const cancelled = await request("client", "/api/v1/requests", {
      propertyId,
      description: "This duplicate request should be cancelled.",
    });
    assert.equal(
      (
        await request(
          "manager",
          `/api/v1/service-requests/${cancelled.body.id}/transitions`,
          {
            expectedVersion: 1,
            status: "cancelled",
            reason: "Duplicate service request",
          },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "manager",
          `/api/v1/service-requests/${cancelled.body.id}/conversions`,
          {
            ...conversion,
            operationId: randomUUID(),
            expectedRequestVersion: 2,
          },
        )
      ).status,
      409,
    );
  },
);
