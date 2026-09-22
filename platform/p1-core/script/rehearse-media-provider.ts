/**
 * Rehearse recovery of a privately retained media archive against disposable
 * local S3 storage. This script must never be run with production credentials.
 *
 * Usage (from platform/p1-core):
 *   npx tsx script/rehearse-media-provider.ts /private/archive-dir /private/snapshot.json.gz /private/evidence.json
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { request } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const IMAGE =
  "quay.io/minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e";
const PREFIX = "clients/p1landmanagement.com/uploads";
const BUCKET = "p1-recovery-fixture";
const USER = "rehearsal-only-access";
const PASSWORD = "rehearsal-only-secret-strong-enough";

type ArchiveFile = { name: string; sha256: string; bytes: number; mime: string };
type RecoverableFile = ArchiveFile & { body: Buffer; key: string };

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function docker(args: string[]): string {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function loadArchive(dir: string, snapshotPath: string): RecoverableFile[] {
  const root = realpathSync(dir);
  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8")) as {
    files?: unknown;
  };
  assert.ok(
    Array.isArray(manifest.files) && manifest.files.length > 0 && manifest.files.length <= 1000,
    "Invalid archive manifest",
  );
  const snapshot = JSON.parse(gunzipSync(readFileSync(snapshotPath)).toString("utf8")) as {
    tables?: Array<{
      name: string;
      rows: Array<{ filename: string; r2_key: string; file_size: number; mime_type: string }>;
    }>;
  };
  const media = snapshot.tables?.filter((table) => table.name === "cms_media") ?? [];
  assert.equal(media.length, 1, "Expected one retained media table");
  assert.equal(
    media[0].rows.length,
    manifest.files.length,
    "Archive and database media counts differ",
  );
  const usedKeys = new Set<string>();
  const names = new Set<string>();
  return manifest.files.map((raw: unknown) => {
    const file = raw as ArchiveFile;
    assert.ok(
      file && typeof file.name === "string" && /^[a-f0-9]{64}\.(png|webp)$/.test(file.name),
      "Invalid archive filename",
    );
    assert.ok(
      typeof file.sha256 === "string" && /^[a-f0-9]{64}$/.test(file.sha256),
      "Invalid archive digest",
    );
    assert.ok(
      file.name.startsWith(file.sha256 + ".") && !names.has(file.name),
      "Duplicate or mismatched archive name",
    );
    assert.ok(
      Number.isSafeInteger(file.bytes) && file.bytes > 0 && file.bytes <= 20_000_000,
      "Invalid archive size",
    );
    assert.ok(
      file.mime === (file.name.endsWith(".png") ? "image/png" : "image/webp"),
      "Invalid archive MIME",
    );
    names.add(file.name);
    const objectPath = realpathSync(path.join(root, "objects", file.name));
    assert.ok(
      objectPath.startsWith(path.join(root, "objects") + path.sep),
      "Archive object escaped directory",
    );
    const body = readFileSync(objectPath);
    assert.equal(body.length, file.bytes, "Archive byte count mismatch");
    assert.equal(sha256(body), file.sha256, "Archive digest mismatch");
    const matches = media[0].rows.filter(
      (row) =>
        row.filename.includes(file.sha256) &&
        row.r2_key.includes(file.sha256) &&
        row.file_size === file.bytes &&
        row.mime_type === file.mime,
    );
    assert.equal(matches.length, 1, "Archive object has no unique database key");
    const key = matches[0].r2_key;
    assert.ok(
      /^cms\/[a-zA-Z0-9/_-]+\.(png|webp)$/.test(key) && !key.includes("..") && !usedKeys.has(key),
      "Unsafe or duplicate media key",
    );
    usedKeys.add(key);
    return { ...file, body, key };
  });
}

async function runCoreChild(args: string[], env: NodeJS.ProcessEnv) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(path.resolve("node_modules/.bin/tsx"), args, { env, stdio: "ignore" });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Core delivery timed out"));
    }, 120_000);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error("Core delivery failed"));
    });
  });
}

async function bodyBytes(body: unknown): Promise<Buffer> {
  assert.ok(body && typeof body === "object" && "transformToByteArray" in body);
  return Buffer.from(
    await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray(),
  );
}

async function waitForMinio(client: S3Client) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("Disposable storage did not become ready");
}

async function main() {
  assert.equal(
    process.argv.length,
    5,
    "Expected private archive, database snapshot and evidence path",
  );
  // Never inherit a configured provider/database destination into this fixture.
  for (const name of Object.keys(process.env)) {
    assert.ok(
      !/^(S3_|R2_|BACKUP_|DATABASE_URL|DASHBOARD_DATABASE_URL)/.test(name),
      "Provider environment is not isolated",
    );
  }
  const files = loadArchive(process.argv[2], process.argv[3]);
  const evidencePath = path.resolve(process.argv[4]);
  assert.ok(
    !evidencePath.startsWith(path.resolve(process.cwd()) + path.sep),
    "Evidence must remain outside the repository",
  );
  docker(["image", "inspect", IMAGE]); // never pull a mutable image during execution
  const name = `p1-media-recovery-${randomUUID()}`;
  let containerId = "";
  let tlsServer: ReturnType<typeof createHttpsServer> | undefined;
  let tlsDir = "";
  try {
    containerId = docker([
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--publish",
      "127.0.0.1::9000",
      "--tmpfs",
      "/data:rw,nosuid,nodev,size=128m",
      "--env",
      `MINIO_ROOT_USER=${USER}`,
      "--env",
      `MINIO_ROOT_PASSWORD=${PASSWORD}`,
      IMAGE,
      "server",
      "/data",
    ]);
    assert.match(containerId, /^[a-f0-9]{64}$/);
    assert.equal(
      docker(["inspect", "--format", "{{.Id}}", name]),
      containerId,
      "Fixture ownership mismatch",
    );
    const portText = docker(["port", containerId, "9000/tcp"]);
    const port = Number(portText.match(/^127\.0\.0\.1:(\d+)$/)?.[1]);
    assert.ok(Number.isInteger(port) && port > 0 && port < 65536, "Unexpected fixture binding");
    const endpoint = `http://127.0.0.1:${port}`;
    const client = new S3Client({
      region: "us-east-1",
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: USER, secretAccessKey: PASSWORD },
    });
    await waitForMinio(client);

    // The private database snapshot supplies the retained CMS keys that the
    // byte archive alone does not contain. No key enters output or evidence.
    for (const file of files) {
      const key = file.key;
      await client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: `${PREFIX}/${key}`,
          Body: file.body,
          ContentType: file.mime,
        }),
      );
      const head = await client.send(
        new HeadObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}/${key}` }),
      );
      assert.equal(head.ContentLength, file.bytes);
      assert.equal(head.ContentType, file.mime);
      const downloaded = await client.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}/${key}` }),
      );
      assert.equal(sha256(await bodyBytes(downloaded.Body)), file.sha256, "Provider byte mismatch");
    }

    // The real Core storage adapter requires HTTPS. Give its child process a
    // one-run local CA and TLS proxy, without weakening production validation.
    tlsDir = mkdtempSync(path.join(tmpdir(), "p1-media-tls-"));
    const cert = path.join(tlsDir, "public.crt");
    const key = path.join(tlsDir, "private.key");
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        key,
        "-out",
        cert,
        "-days",
        "1",
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=IP:127.0.0.1",
      ],
      { stdio: "ignore", timeout: 30_000 },
    );
    tlsServer = createHttpsServer(
      { key: readFileSync(key), cert: readFileSync(cert) },
      (incoming, outgoing) => {
        const upstream = request(
          {
            hostname: "127.0.0.1",
            port,
            method: incoming.method,
            path: incoming.url,
            headers: incoming.headers,
          },
          (response) => {
            outgoing.writeHead(response.statusCode || 502, response.headers);
            response.pipe(outgoing);
          },
        );
        upstream.on("error", () => outgoing.destroy());
        incoming.pipe(upstream);
      },
    );
    await new Promise<void>((resolve) => tlsServer!.listen(0, "127.0.0.1", resolve));
    const tlsPort = (tlsServer.address() as { port: number }).port;
    const childEnv = {
      PATH: process.env.PATH || "/usr/bin:/bin",
      HOME: process.env.HOME || tmpdir(),
      NODE_ENV: "test",
      NODE_EXTRA_CA_CERTS: cert,
      S3_ENDPOINT: `https://127.0.0.1:${tlsPort}`,
      S3_ACCESS_KEY_ID: USER,
      S3_SECRET_ACCESS_KEY: PASSWORD,
      S3_BUCKET: BUCKET,
      S3_REGION: "us-east-1",
      S3_FORCE_PATH_STYLE: "true",
    };
    await runCoreChild(
      ["script/rehearse-media-core-delivery.ts", process.argv[2], process.argv[3]],
      childEnv,
    );
    const result = {
      status: "passed",
      archiveFiles: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
      image: IMAGE,
      verified: [
        "archive digest",
        "private database key mapping",
        "isolated S3 put/head/get",
        "Core /r2 asset delivery with retained keys",
      ],
      limitations: ["disposable MinIO rather than Cloudflare R2", "no production provider restore"],
    };
    writeFileSync(evidencePath, JSON.stringify(result, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    process.stdout.write(
      `Media provider rehearsal passed: ${result.archiveFiles} objects, ${result.totalBytes} bytes.\n`,
    );
  } finally {
    if (tlsServer) await new Promise<void>((resolve) => tlsServer!.close(() => resolve()));
    if (tlsDir) rmSync(tlsDir, { recursive: true, force: true });
    if (containerId && docker(["inspect", "--format", "{{.Id}}", name]) === containerId) {
      docker(["rm", "--force", containerId]);
    }
  }
}

main().catch(() => {
  process.stderr.write(
    "Media provider rehearsal failed; review the private fixture and evidence.\n",
  );
  process.exitCode = 1;
});
