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

test("property reference photos stay private to staff and assigned crews", { skip: !testUrl }, async () => {
  const manager = randomUUID(), crew = randomUUID(), otherCrew = randomUUID(), clientUser = randomUUID();
  for (const [id, role] of [[manager, "manager"], [crew, "crew"], [otherCrew, "crew"], [clientUser, "client"]]) {
    await pool.query('INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)', [id, "Synthetic", `${id}@example.test`]);
    await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,$2)", [id, role]);
  }
  await pool.query("INSERT INTO business_account_access(user_id,capabilities) VALUES($1,$2)", [manager, ["customers.properties"]]);
  const clientId = randomUUID(), propertyId = randomUUID(), workId = randomUUID(), photoId = randomUUID();
  await pool.query("INSERT INTO client(id,name) VALUES($1,'Synthetic photo test')", [clientId]);
  await pool.query("INSERT INTO property(id,client_id,name,address) VALUES($1,$2,'Synthetic site','Test only')", [propertyId, clientId]);
  await pool.query("INSERT INTO work_order(id,property_id,title,assigned_to,status) VALUES($1,$2,'Synthetic visit',$3,'scheduled')", [workId, propertyId, crew]);

  const originalSession = auth.api.getSession, originalSend = S3Client.prototype.send;
  const keys = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, { S3_ENDPOINT: "http://127.0.0.1:1", S3_BUCKET: "synthetic", S3_ACCESS_KEY_ID: "synthetic", S3_SECRET_ACCESS_KEY: "synthetic" });
  const objects = new Map<string, Buffer>();
  let writes = 0;
  (auth.api as any).getSession = async ({ headers }: any) => headers.get("x-test-user") ? ({ user: { id: headers.get("x-test-user"), name: "Synthetic", emailVerified: true }, session: { id: "synthetic" } }) : null;
  (S3Client.prototype as any).send = async (command: any) => {
    if (command instanceof PutObjectCommand) {
      writes++;
      objects.set(command.input.Key!, Buffer.from(command.input.Body as Buffer));
      return {};
    }
    assert.ok(command instanceof GetObjectCommand);
    return { Body: { transformToByteArray: async () => objects.get(command.input.Key!) } };
  };
  const app = express();
  app.use(express.json());
  app.use("/api/v1", filesApi);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof HttpError) res.status(error.status).json({ error: error.message });
    else if (error instanceof ZodError) res.status(400).json({ error: "Invalid input" });
    else res.status(500).json({ error: "Unable to complete this request" });
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const original = await sharp({ create: { width: 8, height: 8, channels: 3, background: "green" } }).png().toBuffer();
  const changed = await sharp({ create: { width: 8, height: 8, channels: 3, background: "blue" } }).png().toBuffer();
  const upload = (user: string, body: Buffer = original) => fetch(`${base}/properties/${propertyId}/photos/${photoId}`, {
    method: "POST", headers: { "x-test-user": user, "content-type": "image/png", "x-p1-file-name": "North gate.png" }, body,
  });
  const list = (user: string) => fetch(`${base}/properties/${propertyId}/photos`, { headers: { "x-test-user": user } });
  const content = (user: string) => fetch(`${base}/files/${photoId}/content`, { headers: { "x-test-user": user } });
  try {
    assert.equal((await upload(crew, Buffer.alloc(15 * 1024 * 1024 + 1))).status, 403, "crew upload denied before parsing body");
    assert.equal((await upload(manager, Buffer.alloc(15 * 1024 * 1024 + 1))).status, 413, "authorized upload is size-limited");
    assert.equal((await upload(manager)).status, 201);
    assert.equal((await upload(manager)).status, 200, "exact retry is idempotent");
    assert.equal((await upload(manager, changed)).status, 409, "same ID cannot replace an image");
    assert.equal(writes, 1);

    let response = await list(crew);
    assert.equal(response.status, 200);
    assert.deepEqual(((await response.json()) as { id: string }[]).map((photo) => photo.id), [photoId]);
    assert.equal((await list(otherCrew)).status, 404);
    assert.equal((await list(clientUser)).status, 403);
    assert.equal((await content(crew)).status, 200);
    assert.equal((await content(otherCrew)).status, 404);
    assert.equal((await content(clientUser)).status, 404);

    response = await fetch(`${base}/properties/${propertyId}/photos/${photoId}`, { method: "PATCH", headers: { "x-test-user": manager, "content-type": "application/json" }, body: JSON.stringify({ description: "Gate beside loading dock" }) });
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { description: string }).description, "Gate beside loading dock");
    assert.equal(((await list(crew).then((r) => r.json())) as { description: string }[])[0].description, "Gate beside loading dock");
    assert.equal((await fetch(`${base}/properties/${propertyId}/photos/${photoId}`, { method: "PATCH", headers: { "x-test-user": crew, "content-type": "application/json" }, body: JSON.stringify({ description: "Unauthorized" }) })).status, 403);
    assert.equal((await fetch(`${base}/properties/${propertyId}/photos/${photoId}`, { method: "PATCH", headers: { "x-test-user": manager, "content-type": "application/json" }, body: JSON.stringify({ description: "x".repeat(501) }) })).status, 400);

    await pool.query("UPDATE work_order SET status='reviewed' WHERE id=$1", [workId]);
    assert.equal((await list(crew)).status, 404, "crew loses gallery access when assignment ends");
    assert.equal((await content(crew)).status, 404, "direct image URL also loses access");
    assert.equal((await list(manager)).status, 200);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    (auth.api as any).getSession = originalSession;
    (S3Client.prototype as any).send = originalSend;
    for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; }
  }
});
