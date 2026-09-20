import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { ZodError } from "zod";
import { pool } from "./database";
import { auth } from "./auth";
import { api } from "./api";
import { HttpError } from "./policy";

const testUrl = process.env.COMMERCIAL_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/commercial_bridge_test" ||
    testUrl !== process.env.DASHBOARD_DATABASE_URL
  )
    throw Error("Disposable local database required");
}
after(() => pool.end());

test(
  "field event replay preserves exact receipts and rejects changed identity/content",
  { skip: !testUrl },
  async (t) => {
    const user = randomUUID(),
      other = randomUUID();
    for (const id of [user, other]) {
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,\'Synthetic\',$2,true)',
        [id, `${id}@example.test`],
      );
      await pool.query(
        "INSERT INTO staff_profile(user_id,role) VALUES($1,'member')",
        [id],
      );
      await pool.query(
        "INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)",
        [id, ["operations.schedule"]],
      );
    }
    const client = randomUUID(),
      property = randomUUID(),
      work = randomUUID(),
      otherWork = randomUUID();
    await pool.query("INSERT INTO client(id,name) VALUES($1,'Synthetic')", [
      client,
    ]);
    await pool.query(
      "INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Synthetic','Fixture')",
      [property, client],
    );
    for (const id of [work, otherWork])
      await pool.query(
        "INSERT INTO work_order(id,property_id,title,status) VALUES($1,$2,'Synthetic','scheduled')",
        [id, property],
      );
    const originalSession = auth.api.getSession;
    (auth.api as any).getSession = async ({ headers }: any) =>
      headers.get("x-test-user")
        ? {
            user: {
              id: headers.get("x-test-user"),
              name: "Synthetic",
              emailVerified: true,
            },
            session: { id: "synthetic" },
          }
        : null;
    const app = express();
    app.use(express.json(), api);
    app.use(
      (
        error: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        res
          .status(
            error instanceof HttpError
              ? error.status
              : error instanceof ZodError
                ? 400
                : 500,
          )
          .json({
            error:
              error instanceof HttpError
                ? error.message
                : "Fixture request failed",
          });
      },
    );
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    const call = (event: unknown, actor = user) =>
      fetch(`${base}/field/sync`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-user": actor },
        body: JSON.stringify({ events: [event] }),
      });
    const event = {
      id: randomUUID(),
      workOrderId: work,
      baseVersion: 1,
      kind: "note",
      payload: { text: "Original note", action: "stop" },
      capturedAt: "2026-09-19T12:13:14.123456Z",
    };
    const state = async () => ({
      events: (
        await pool.query(
          "SELECT * FROM field_event WHERE work_order_id=ANY($1::uuid[]) ORDER BY id",
          [[work, otherWork]],
        )
      ).rows,
      work: (
        await pool.query(
          "SELECT * FROM work_order WHERE id=ANY($1::uuid[]) ORDER BY id",
          [[work, otherWork]],
        )
      ).rows,
      audit: (
        await pool.query(
          "SELECT * FROM audit_event WHERE user_id=ANY($1::text[]) ORDER BY id",
          [[user, other]],
        )
      ).rows,
    });
    try {
      assert.equal((await call(event)).status, 200);
      const before = await state();
      await t.test(
        "exact replay tolerates JSON key ordering and timestamp trailing zeros without side effects",
        async () => {
          const response = await call({
            ...event,
            payload: { action: "stop", text: "Original note" },
            capturedAt: "2026-09-19T12:13:14.1234560Z",
          });
          assert.equal(response.status, 200);
          assert.deepEqual(await response.json(), {
            results: [{ id: event.id, status: "accepted" }],
          });
          assert.deepEqual(await state(), before);
        },
      );
      await t.test(
        "changed payload, kind, version, microsecond timestamp, work or actor is rejected unchanged",
        async () => {
          for (const [changed, actor] of [
            [
              { ...event, payload: { ...event.payload, text: "Changed" } },
              user,
            ],
            [{ ...event, kind: "issue" }, user],
            [{ ...event, baseVersion: 2 }, user],
            [{ ...event, capturedAt: "2026-09-19T12:13:14.123457Z" }, user],
            [{ ...event, workOrderId: otherWork }, user],
            [event, other],
          ] as const) {
            const response = await call(changed, actor);
            assert.equal(response.status, 409);
            assert.deepEqual(await response.json(), {
              error: "Operation ID conflict",
            });
            assert.deepEqual(await state(), before);
          }
        },
      );
      await t.test(
        "stored conflict replays its original classification without inserting another event",
        async () => {
          const conflicted = { ...event, id: randomUUID(), baseVersion: 99 };
          assert.equal((await call(conflicted)).status, 200);
          const saved = await state();
          const response = await call(conflicted);
          assert.equal(response.status, 200);
          assert.deepEqual(await response.json(), {
            results: [{ id: conflicted.id, status: "conflict" }],
          });
          assert.deepEqual(await state(), saved);
        },
      );
    } finally {
      (auth.api as any).getSession = originalSession;
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
);
