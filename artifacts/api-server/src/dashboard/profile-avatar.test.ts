import { after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import sharp from "sharp";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { pool } from "./database";
import { auth } from "./auth";
import { profileApi } from "./profile";
import { HttpError } from "./policy";

const testOrigin = process.env.DASHBOARD_TEST_ORIGIN;
if (testOrigin && !testOrigin.startsWith("http://localhost:"))
  throw Error("Profile avatar tests require an isolated local server");
after(() => pool.end());

test(
  "profile avatar uploads are private, constrained, and converted with real database state",
  { skip: !testOrigin },
  async () => {
    const member = randomUUID();
    const other = randomUUID();
    const concurrentMembers = Array.from({ length: 5 }, randomUUID);
    for (const id of [member, other, ...concurrentMembers]) {
      await pool.query(
        'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
        [id, "Synthetic", `${id}@example.test`],
      );
      await pool.query("INSERT INTO staff_profile(user_id,role) VALUES($1,'manager')", [
        id,
      ]);
    }

    const originalSession = auth.api.getSession;
    const originalSend = S3Client.prototype.send;
    const keys = [
      "S3_ENDPOINT",
      "S3_BUCKET",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
    ];
    const priorEnvironment = Object.fromEntries(
      keys.map((key) => [key, process.env[key]]),
    );
    Object.assign(process.env, {
      S3_ENDPOINT: "http://127.0.0.1:1",
      S3_BUCKET: "synthetic",
      S3_ACCESS_KEY_ID: "synthetic",
      S3_SECRET_ACCESS_KEY: "synthetic",
    });
    const objects = new Map<string, Buffer>();
    const deleted: string[] = [];
    let holdUploads = false;
    let heldUploads = 0;
    let markFourUploadsReady!: () => void;
    let releaseHeldUploads!: () => void;
    let fourUploadsReady = Promise.resolve();
    let heldUploadRelease = Promise.resolve();
    (auth.api as any).getSession = async ({ headers }: any) => {
      const id = headers.get("x-test-user");
      return id
        ? {
            user: { id, name: "Synthetic", emailVerified: true },
            session: { id: "synthetic" },
          }
        : null;
    };
    (S3Client.prototype as any).send = async (command: any) => {
      if (command instanceof PutObjectCommand) {
        objects.set(command.input.Key!, Buffer.from(command.input.Body as Buffer));
        if (holdUploads) {
          if (++heldUploads === 4) markFourUploadsReady();
          await heldUploadRelease;
        }
        return {};
      }
      if (command instanceof DeleteObjectCommand) {
        deleted.push(command.input.Key!);
        objects.delete(command.input.Key!);
        return {};
      }
      assert.ok(command instanceof GetObjectCommand);
      return {
        Body: {
          transformToByteArray: async () => objects.get(command.input.Key!),
        },
      };
    };

    const app = express();
    app.use("/api/v1", profileApi);
    app.use(
      (
        error: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        if (error instanceof HttpError)
          return res.status(error.status).json({ error: error.message });
        return res.status(500).json({ error: "Unable to complete this request" });
      },
    );
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
    const bytes = await sharp({
      create: { width: 4, height: 4, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    const upload = (id: string, body: Uint8Array = bytes) =>
      fetch(`${base}/profile/avatar`, {
        method: "POST",
        headers: { "content-type": "image/png", "x-test-user": id },
        body: body as unknown as NonNullable<Parameters<typeof fetch>[1]>["body"],
      });
    try {
      let response = await fetch(`${base}/profile/avatar`, {
        method: "POST",
        headers: { "content-type": "image/png" },
        body: bytes,
      });
      assert.equal(response.status, 401);
      assert.equal(objects.size, 0);

      response = await upload(member, Buffer.from("not an image"));
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: "Upload a JPEG, PNG, or WebP image",
      });

      response = await upload(member, Buffer.alloc(5 * 1024 * 1024 + 1));
      assert.equal(response.status, 413);
      assert.deepEqual(await response.json(), {
        error: "Avatar image exceeds the 5 MiB upload limit",
      });

      response = await upload(member);
      assert.equal(response.status, 201);
      const receipt = (await response.json()) as { avatarUrl: string };
      assert.match(receipt.avatarUrl, /^\/api\/v1\/profile\/avatar\?v=\d+$/);
      const initial = (
        await pool.query(
          "SELECT object_key,mime,bytes FROM account_avatar WHERE user_id=$1",
          [member],
        )
      ).rows[0];
      assert.match(initial.object_key, new RegExp(`^avatars/${member}/.+\\.webp$`));
      assert.equal(initial.mime, "image/webp");
      assert.ok(initial.bytes > 0);

      response = await fetch(`${base}/profile/avatar`, {
        headers: { "x-test-user": member },
      });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type")!, /image\/webp/);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.ok((await response.arrayBuffer()).byteLength > 0);

      response = await fetch(`${base}/profile/avatar`, {
        headers: { "x-test-user": other },
      });
      assert.equal(response.status, 404);

      response = await upload(member);
      assert.equal(response.status, 201);
      assert.deepEqual(deleted, [initial.object_key]);

      // Keep four authenticated uploads inside storage long enough to prove
      // that a fifth cannot consume another raw-buffer/Sharp work slot.
      holdUploads = true;
      heldUploads = 0;
      fourUploadsReady = new Promise<void>((resolve) => {
        markFourUploadsReady = resolve;
      });
      heldUploadRelease = new Promise<void>((resolve) => {
        releaseHeldUploads = resolve;
      });
      const active = concurrentMembers
        .slice(0, 4)
        .map((id) => upload(id));
      await fourUploadsReady;
      response = await upload(concurrentMembers[4]);
      assert.equal(response.status, 429);
      assert.deepEqual(await response.json(), {
        error: "Avatar uploads are busy; retry shortly",
      });
      releaseHeldUploads();
      holdUploads = false;
      assert.deepEqual(
        (await Promise.all(active)).map((result) => result.status),
        [201, 201, 201, 201],
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      (auth.api as any).getSession = originalSession;
      S3Client.prototype.send = originalSend;
      for (const key of keys)
        priorEnvironment[key] === undefined
          ? delete process.env[key]
          : (process.env[key] = priorEnvironment[key]);
    }
  },
);
