/** Child of rehearse-media-provider.ts. Runs with synthetic S3 credentials only. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import express from "express";
import r2PublicRoutes from "../server/routes/r2-public.routes";

async function main() {
  assert.equal(process.argv.length, 4);
  assert.match(process.env.S3_ENDPOINT || "", /^https:\/\/127\.0\.0\.1:\d+$/);
  assert.equal(process.env.S3_BUCKET, "p1-recovery-fixture");
  assert.ok(process.env.NODE_EXTRA_CA_CERTS);
  const dir = process.argv[2];
  const manifest = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as {
    files: Array<{ name: string; sha256: string; mime: string }>;
  };
  const snapshot = JSON.parse(gunzipSync(readFileSync(process.argv[3])).toString("utf8")) as {
    tables: Array<{ name: string; rows: Array<{ filename: string; r2_key: string }> }>;
  };
  const rows = snapshot.tables.filter((table) => table.name === "cms_media");
  assert.equal(rows.length, 1);
  const app = express();
  app.use("/r2", r2PublicRoutes);
  const server = createServer(app);
  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;
    for (const file of manifest.files) {
      assert.match(file.name, /^[a-f0-9]{64}\.(png|webp)$/);
      const matches = rows[0].rows.filter(
        (row) => row.filename.includes(file.sha256) && row.r2_key.includes(file.sha256),
      );
      assert.equal(matches.length, 1);
      const key = matches[0].r2_key;
      assert.match(key, /^cms\/[a-zA-Z0-9/_-]+\.(png|webp)$/);
      const result = await fetch(`http://127.0.0.1:${port}/r2/${key}`);
      assert.equal(result.status, 200, "Core media route failed");
      assert.equal(result.headers.get("content-type"), file.mime);
      assert.equal(result.headers.get("x-content-type-options"), "nosniff");
      const digest = createHash("sha256")
        .update(Buffer.from(await result.arrayBuffer()))
        .digest("hex");
      assert.equal(digest, file.sha256, "Core media bytes changed");
    }
    const privateResult = await fetch(`http://127.0.0.1:${port}/r2/career-resumes/private.png`);
    assert.equal(privateResult.status, 404, "Private object became public");
    process.stdout.write(`Core media route passed: ${manifest.files.length} objects.\n`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main().catch(() => {
  process.stderr.write("Core media delivery rehearsal failed.\n");
  process.exitCode = 1;
});
