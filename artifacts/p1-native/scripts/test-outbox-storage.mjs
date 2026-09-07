import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const require = createRequire(
  path.join(root, "artifacts/api-server/package.json"),
);
const { build } = require("esbuild");
const directory = mkdtempSync(path.join(tmpdir(), "p1-outbox-db-"));
globalThis.outboxDirectory = directory;
globalThis.outboxQueries = [];
const shim = `import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY=1;const keys=new Map();export async function getItemAsync(k){return keys.get(k)||null}export async function setItemAsync(k,v){keys.set(k,v)}export async function deleteItemAsync(k){keys.delete(k)}export async function deleteDatabaseAsync(name,folder){fs.unlinkSync(path.join(folder,name))}export const CryptoDigestAlgorithm={SHA256:'sha256'};export async function digestStringAsync(a,v){return crypto.createHash(a).update(v).digest('hex')}export async function getRandomBytesAsync(n){return crypto.randomBytes(n)}
export const Paths={document:globalThis.outboxDirectory};export class Directory{constructor(a,b){this.uri=path.join(a,b)}create(){fs.mkdirSync(this.uri,{recursive:true})}}export class File{constructor(a,b){this.uri=path.join(a.uri,b)}get exists(){return fs.existsSync(this.uri)}}
export async function openDatabaseAsync(name,options,folder){const db=new DatabaseSync(path.join(folder,name));return {async execAsync(sql){db.exec(sql.replace(/PRAGMA key = [^;]+;/g,''))},async getFirstAsync(sql,...args){if(sql==='PRAGMA cipher_version')return {cipher_version:'test boundary only'};globalThis.outboxQueries.push(sql);return db.prepare(sql).get(...args)},async getAllAsync(sql,...args){globalThis.outboxQueries.push(sql);return db.prepare(sql).all(...args)},async runAsync(sql,...args){return db.prepare(sql).run(...args)},async closeAsync(){db.close()}}}`;
await build({
  entryPoints: [path.join(root, "artifacts/p1-native/src/native/vault.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: path.join(directory, "vault.mjs"),
  plugins: [
    {
      name: "native-test-boundaries",
      setup(b) {
        b.onResolve({ filter: /^expo-/ }, (a) => ({
          path: a.path,
          namespace: "shim",
        }));
        b.onLoad({ filter: /.*/, namespace: "shim" }, () => ({
          contents: shim,
          loader: "js",
        }));
      },
    },
  ],
});
const { openVault } = await import(
  "file://" + path.join(directory, "vault.mjs")
);
const a = await openVault("https://outbox.synthetic.test", "A"),
  b = await openVault("https://outbox.synthetic.test", "B");
const id = (n) => "11111111-1111-4111-8111-" + String(n).padStart(12, "0");
const at = "2026-09-07T12:00:00.000Z";
for (let n = 0; n < 105; n++)
  await a.enqueue({
    id: id(n),
    workOrderId: id(900),
    baseVersion: 1,
    kind: n % 2 ? "note" : "issue",
    payload: { text: "Synthetic capture " + n },
    capturedAt: at,
  });
await a.recordResults([
  { id: id(2), status: "conflict" },
  { id: id(77), status: "conflict" },
]);
const db = new DatabaseSync(
  path.join(directory, "p1-private", a.scope + ".db"),
);
for (const n of [4, 55, 106])
  db.prepare("INSERT INTO photos(id,manifest,bytes) VALUES(?,?,?)").run(
    id(n),
    JSON.stringify({
      id: id(n),
      workOrderId: id(900),
      capturedAt: at,
      classification: "general",
    }),
    Buffer.alloc(512 * 1024, 9),
  );
const before = db
  .prepare(
    "SELECT (SELECT count(*) FROM operations) ops,(SELECT count(*) FROM photos) photos",
  )
  .get();
globalThis.outboxQueries = [];
let cursor = null;
const seen = [],
  sizes = [];
do {
  const page = await a.outbox(cursor);
  assert.equal(page.total, 108);
  assert.equal(page.pending, 106);
  assert.equal(page.conflicts, 2);
  assert.ok(page.items.length <= 50);
  seen.push(...page.items.map((x) => x.kind + ":" + x.id));
  sizes.push(page.items.length);
  cursor = page.nextCursor;
} while (cursor);
assert.equal(seen.length, 108);
assert.equal(new Set(seen).size, 108);
assert.deepEqual(sizes, [50, 50, 8]);
assert.equal(
  globalThis.outboxQueries.some((sql) => /\bbytes\b/.test(sql)),
  false,
);
assert.equal((await b.outbox()).total, 0);
assert.deepEqual(
  db
    .prepare(
      "SELECT (SELECT count(*) FROM operations) ops,(SELECT count(*) FROM photos) photos",
    )
    .get(),
  before,
);
await assert.rejects(a.outbox({ id: "", capturedAt: at, kind: "photo" }));
const first = await a.outbox();
await a.recordResults([{ id: first.nextCursor.id, status: "accepted" }]);
const next = await a.outbox(first.nextCursor);
assert.ok(next.items.length);
assert.equal(
  first.items.some((x) =>
    next.items.some((y) => x.id === y.id && x.kind === y.kind),
  ),
  false,
);
await a.close();
await b.close();
db.close();
writeFileSync(
  path.join(directory, "result.json"),
  JSON.stringify(
    {
      pass: true,
      total: 108,
      pageSizes: sizes,
      metadataOnly: true,
      otherAccountEmpty: true,
      readOnlyCountsPreserved: true,
      limits:
        "Real SQLite; SecureStore/cipher adapters mocked, no native encryption claim",
    },
    null,
    2,
  ),
);
console.log(
  "PASS outbox: 108 retained operation/photo rows, 50/50/8 pages, duplicate timestamps/IDs across types, conflicts, account isolation, read-only metadata, cursor deletion stability.",
);
console.log("Evidence " + directory);
