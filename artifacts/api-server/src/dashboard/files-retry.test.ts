import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { ZodError } from "zod";
import { pool } from "./database";
import { auth } from "./auth";
import { filesApi } from "./files";
import { HttpError } from "./policy";

const testUrl = process.env.COMMERCIAL_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/commercial_bridge_test" || testUrl !== process.env.DASHBOARD_DATABASE_URL)
    throw Error("Disposable local database required");
}
after(() => pool.end());

test("mounted image upload limits and immutable retry metadata with real database and mock storage", { skip: !testUrl }, async (t) => {
  const manager = randomUUID(), other = randomUUID(), crew = randomUUID();
  for (const [id, role] of [[manager, "manager"], [other, "manager"], [crew, "crew"]]) {
    await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [id, role, id + "@example.test"]);
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,$2)", [id, role]);
  }
  const client = randomUUID(), property = randomUUID(), property2 = randomUUID();
  await pool.query("INSERT INTO client(id,name) VALUES($1,'Synthetic')", [client]);
  for (const id of [property, property2])
    await pool.query("INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Synthetic','Test only')", [id, client]);
  const work = randomUUID(), work2 = randomUUID(), foreignWork = randomUUID();
  for (const [id, p] of [[work, property], [work2, property], [foreignWork, property2]])
    await pool.query("INSERT INTO work_order(id,property_id,title,assigned_to,status) VALUES($1,$2,'Synthetic',$3,'scheduled')", [id, p, crew]);

  const originalSession = auth.api.getSession, originalSend = S3Client.prototype.send;
  const keys = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { S3_ENDPOINT: "http://127.0.0.1:1", S3_BUCKET: "synthetic", S3_ACCESS_KEY_ID: "synthetic", S3_SECRET_ACCESS_KEY: "synthetic" });
  let writes = 0, failWrite = false;
  const objects = new Map<string, Buffer>();
  (auth.api as any).getSession = async ({ headers }: any) => headers.get("x-test-user") ? ({ user: { id: headers.get("x-test-user"), name: "Synthetic", emailVerified: true }, session: { id: "synthetic" } }) : null;
  (S3Client.prototype as any).send = async (command: any) => {
    if (command instanceof PutObjectCommand) {
      writes++;
      if (failWrite) { failWrite = false; throw Error("Synthetic storage outage"); }
      objects.set(command.input.Key!, Buffer.from(command.input.Body as Buffer));
      return {};
    }
    assert.ok(command instanceof GetObjectCommand);
    return { Body: { transformToByteArray: async () => objects.get(command.input.Key!) } };
  };
  const app = express();
  app.use("/api/v1", filesApi);
  // Match production's fallback so raw parser 413 must come from the route itself.
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof HttpError) res.status(error.status).json({ error: error.message });
    else if (error instanceof ZodError) res.status(400).json({ error: "Invalid input" });
    else res.status(500).json({ error: "Unable to complete this request" });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const bytes = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } }).png().toBuffer();
  const different = await sharp({ create: { width: 4, height: 4, channels: 3, background: "blue" } }).png().toBuffer();
  const upload = (id: string, extra: Record<string, string> = {}, body = bytes) => fetch(`${base}/files/${id}`, {
    method: "POST", headers: { "content-type": "image/png", "x-test-user": manager, "x-p1-property": property, "x-p1-work": work, "x-p1-classification": "before", ...extra }, body: body as unknown as NonNullable<Parameters<typeof fetch>[1]>["body"],
  });
  try {
    await t.test("oversized raw image returns local 413; unauthorized request is rejected before parsing", async () => {
      const big = Buffer.alloc(15 * 1024 * 1024 + 1);
      let response = await upload(randomUUID(), {}, big);
      assert.equal(response.status, 413);
      assert.deepEqual(await response.json(), { error: "Image exceeds the 15 MiB upload limit" });
      response = await upload(randomUUID(), { "x-test-user": "" }, big);
      assert.equal(response.status, 401);
      assert.equal(writes, 0);
    });
    const id = randomUUID();
    await t.test("new upload201 and exact ready retry200 only write once", async () => {
      let response = await upload(id); assert.equal(response.status, 201);
      assert.deepEqual(await response.json(), { id, status: "accepted" });
      response = await upload(id); assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { id, status: "accepted" });
      assert.equal(writes, 1);
    });
    await t.test("ready retries reject changed work, classification, actor, property or image without writes", async () => {
      const before = (await pool.query("SELECT * FROM file_record WHERE id=$1", [id])).rows[0];
      for (const [headers, body] of [
        [{ "x-p1-work": work2 }, bytes], [{ "x-p1-classification": "after" }, bytes],
        [{ "x-test-user": other }, bytes], [{ "x-p1-property": property2, "x-p1-work": foreignWork }, bytes], [{}, different],
      ] as [Record<string, string>, Buffer][]) {
        const response = await upload(id, headers, body);
        assert.equal(response.status, 409); assert.equal(writes, 1);
      }
      assert.deepEqual((await pool.query("SELECT * FROM file_record WHERE id=$1", [id])).rows[0], before);
    });
    await t.test("pending stable retry resumes after storage outage; changed metadata cannot resume it", async () => {
      const pendingId = randomUUID(); failWrite = true;
      assert.equal((await upload(pendingId)).status, 500);
      assert.equal((await pool.query("SELECT status FROM file_record WHERE id=$1", [pendingId])).rows[0].status, "pending");
      const count = writes;
      assert.equal((await upload(pendingId, { "x-p1-work": work2 })).status, 409);
      assert.equal((await upload(pendingId, { "x-p1-classification": "after" })).status, 409);
      assert.equal(writes, count);
      assert.equal((await upload(pendingId)).status, 201); assert.equal(writes, count + 1);
      assert.equal((await upload(pendingId)).status, 200); assert.equal(writes, count + 1);
    });
    await t.test("concurrent same-ID different-work inserts cannot reach storage twice", async () => {
      const raceId = randomUUID(), count = writes;
      // Force both optimistic reads to see no record so the locked-row check,
      // not the early retry check, must reject the losing metadata.
      const query = pool.query;
      let reads = 0, release!: () => void;
      const bothRead = new Promise<void>(resolve => { release = resolve; });
      (pool as any).query = async (...args: any[]) => {
        const result = await (query as any).apply(pool, args);
        if (args[0] === "SELECT * FROM file_record WHERE id=$1" && args[1]?.[0] === raceId) {
          assert.equal(result.rowCount, 0);
          if (++reads === 2) release();
          await bothRead;
        }
        return result;
      };
      let results: Response[];
      try { results = await Promise.all([upload(raceId), upload(raceId, { "x-p1-work": work2 })]); }
      finally { pool.query = query; }
      assert.equal(reads, 2);
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
      assert.equal(writes, count + 1);
      assert.equal((await pool.query("SELECT count(*)::int AS count FROM file_record WHERE id=$1", [raceId])).rows[0].count, 1);
    });
    await t.test("decoder, assignment, and authenticated private reads remain enforced", async () => {
      const count = writes;
      assert.equal((await upload(randomUUID(), {}, Buffer.from("not an image"))).status, 400);
      assert.equal((await upload(randomUUID(), { "x-p1-work": foreignWork })).status, 403);
      assert.equal((await fetch(`${base}/files/${id}/content`)).status, 401);
      const response = await fetch(`${base}/files/${id}/content`, { headers: { "x-test-user": manager } });
      assert.equal(response.status, 200); assert.match(response.headers.get("content-type")!, /image\/webp/);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.ok((await response.arrayBuffer()).byteLength > 0); assert.equal(writes, count);
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    (auth.api as any).getSession = originalSession;
    S3Client.prototype.send = originalSend;
    for (const key of keys) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key];
  }
});
