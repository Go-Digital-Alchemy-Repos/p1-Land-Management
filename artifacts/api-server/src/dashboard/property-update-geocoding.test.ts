import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { pool } from "./database";
import { auth } from "./auth";
import { api } from "./api";
import { HttpError } from "./policy";
import { ZodError } from "zod";

const testOrigin = process.env.DASHBOARD_TEST_ORIGIN;
if (testOrigin && !testOrigin.startsWith("http://localhost:"))
  throw Error("Property geocoding tests require an isolated local server");
after(() => pool.end());

test(
  "property address edits update a pin or remove an obsolete location without geocoding unchanged addresses",
  { skip: !testOrigin },
  async () => {
    const manager = randomUUID();
    const client = randomUUID();
    const property = randomUUID();
    await pool.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [manager, "Map manager", `${manager}@example.test`],
    );
    await pool.query(
      "INSERT INTO staff_profile(user_id,role) VALUES($1,'manager')",
      [manager],
    );
    await pool.query("INSERT INTO client(id,name) VALUES($1,$2)", [
      client,
      "Map client",
    ]);
    await pool.query(
      "INSERT INTO property(id,client_id,name,address,access_instructions,latitude,longitude,location_precision) VALUES($1,$2,$3,$4,'',$5,$6,'approximate')",
      [
        property,
        client,
        "Map property",
        "100 Old Lane, Charlotte, NC",
        35.2271,
        -80.8431,
      ],
    );

    const originalSession = auth.api.getSession;
    const originalFetch = globalThis.fetch;
    let calls = 0;
    (auth.api as any).getSession = async ({ headers }: any) => {
      const userId = headers.get("x-test-user");
      return userId
        ? {
            user: { id: userId, name: "Map manager", emailVerified: true },
            session: { id: "synthetic" },
          }
        : null;
    };
    globalThis.fetch = (async () => {
      calls++;
      return new Response(
        JSON.stringify({
          result: {
            addressMatches: [{ coordinates: { x: -81.0348, y: 34.9974 } }],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const app = express();
    app.use(express.json());
    app.use("/api/v1", api);
    app.use(
      (
        error: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        if (error instanceof ZodError)
          return res.status(400).json({ error: "Invalid input" });
        if (error instanceof HttpError)
          return res.status(error.status).json({ error: error.message });
        return res
          .status(500)
          .json({ error: "Unable to complete this request" });
      },
    );
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const url = `http://127.0.0.1:${(server.address() as any).port}/api/v1/properties/${property}`;
    const update = (body: Record<string, unknown>) =>
      originalFetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-user": manager },
        body: JSON.stringify(body),
      });
    try {
      let response = await update({
        name: "Map property",
        address: "200 New Lane, Rock Hill, SC",
        acreage: null,
        version: 1,
      });
      assert.equal(response.status, 200);
      assert.equal(calls, 1);
      assert.deepEqual(
        (
          await pool.query(
            "SELECT latitude,longitude,location_precision,version FROM property WHERE id=$1",
            [property],
          )
        ).rows[0],
        {
          latitude: 34.9974,
          longitude: -81.0348,
          location_precision: "approximate",
          version: 2,
        },
      );

      response = await update({
        name: "Renamed property",
        address: "200 New Lane, Rock Hill, SC",
        acreage: null,
        version: 2,
      });
      assert.equal(response.status, 200);
      assert.equal(calls, 1);
      assert.deepEqual(
        (
          await pool.query(
            "SELECT latitude,longitude,location_precision,version FROM property WHERE id=$1",
            [property],
          )
        ).rows[0],
        {
          latitude: 34.9974,
          longitude: -81.0348,
          location_precision: "approximate",
          version: 3,
        },
      );

      globalThis.fetch = (async () => {
        calls++;
        return new Response(
          JSON.stringify({ result: { addressMatches: [] } }),
          { status: 200 },
        );
      }) as typeof fetch;
      response = await update({
        name: "Renamed property",
        address: "300 Unresolved Road, SC",
        acreage: null,
        version: 3,
      });
      assert.equal(response.status, 200);
      assert.equal(calls, 2);
      assert.deepEqual(
        (
          await pool.query(
            "SELECT latitude,longitude,location_precision,version FROM property WHERE id=$1",
            [property],
          )
        ).rows[0],
        {
          latitude: null,
          longitude: null,
          location_precision: null,
          version: 4,
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
      (auth.api as any).getSession = originalSession;
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
);
