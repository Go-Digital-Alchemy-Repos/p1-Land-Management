const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const repo = path.resolve(__dirname, "../../..");
const { build } = require(repo + "/artifacts/api-server/node_modules/esbuild");

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p1-photo-recovery-"));
  globalThis.qaDirectory = dir;
  const shim = `import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY=1;const keys=new Map();export async function getItemAsync(k){return keys.get(k)||null}export async function setItemAsync(k,v){keys.set(k,v)}export async function deleteItemAsync(k){keys.delete(k)}export const CryptoDigestAlgorithm={SHA256:'sha256'};export async function digestStringAsync(a,v){return crypto.createHash(a).update(v).digest('hex')}export async function getRandomBytesAsync(n){return crypto.randomBytes(n)}
const local=(value)=>String(value).startsWith('file://')?new URL(String(value)):value;export const Paths={document:globalThis.qaDirectory};export class Directory{constructor(a,b){this.uri=path.join(a,b)}create(){fs.mkdirSync(this.uri,{recursive:true})}}export class File{constructor(a,b){this.uri=b===undefined?local(a):path.join(a.uri,b)}get exists(){return fs.existsSync(this.uri)}async bytes(){return new Uint8Array(fs.readFileSync(this.uri))}delete(){fs.unlinkSync(this.uri)}}
export async function openDatabaseAsync(name,options,folder){const db=new DatabaseSync(path.join(folder,name));return {async execAsync(sql){db.exec(sql.replace(/PRAGMA key = [^;]+;/g,''))},async getFirstAsync(sql,...args){if(sql==='PRAGMA cipher_version')return {cipher_version:'mock cipher boundary; real SQLite transactions'};return db.prepare(sql).get(...args)},async getAllAsync(sql,...args){return db.prepare(sql).all(...args)},async runAsync(sql,...args){return db.prepare(sql).run(...args)},async closeAsync(){db.close()}}}`;
  await build({
    entryPoints: [repo + "/artifacts/p1-native/src/native/vault.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: dir + "/vault.mjs",
    plugins: [
      {
        name: "native-synthetic-adapters",
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
  const { openVault } = await import("file://" + dir + "/vault.mjs");
  const assert = require("node:assert/strict");
  const photo = {
    id: "11111111-1111-4111-8111-111111111111",
    workOrderId: "22222222-2222-4222-8222-222222222222",
    propertyId: "33333333-3333-4333-8333-333333333333",
    mime: "image/jpeg",
    classification: "general",
    capturedAt: "2026-09-08T12:00:00.000Z",
  };
  const recoverable = path.join(dir, "interrupted.jpg");
  fs.writeFileSync(recoverable, Buffer.from([1, 2, 3, 4]));
  let vault = await openVault("https://synthetic.invalid", "crew-a");
  await vault.download([
    {
      id: photo.workOrderId,
      version: 1,
      checklist: [],
    },
  ]);
  await vault.close();
  const scope = crypto
    .createHash("sha256")
    .update(JSON.stringify(["https://synthetic.invalid", "crew-a"]))
    .digest("hex");
  const legacy = new DatabaseSync(path.join(dir, "p1-private", scope + ".db"));
  legacy.exec(
    "DROP TABLE photo_staging; UPDATE metadata SET value='1' WHERE key='version'",
  );
  legacy.close();
  vault = await openVault("https://synthetic.invalid", "crew-a", true);
  await vault.rememberTemporaryPhoto(photo, "file://" + recoverable);
  await vault.close();
  vault = await openVault("https://synthetic.invalid", "crew-a", true);
  assert.deepEqual(await vault.recoverTemporaryPhotos(), {
    recovered: 1,
    cleaned: 0,
    missing: 0,
    missingIds: [],
  });
  assert.equal(fs.existsSync(recoverable), false);
  assert.deepEqual(await vault.pendingPhotoIds(), [photo.id]);
  const missing = { ...photo, id: "44444444-4444-4444-8444-444444444444" };
  await vault.rememberTemporaryPhoto(
    missing,
    "file://" + path.join(dir, "gone.jpg"),
  );
  await vault.close();
  vault = await openVault("https://synthetic.invalid", "crew-a", true);
  assert.deepEqual(await vault.recoverTemporaryPhotos(), {
    recovered: 0,
    cleaned: 0,
    missing: 1,
    missingIds: [missing.id],
  });
  await vault.close();
  console.log(
    "PASS actual vault against disposable SQLite: v1→v2 migration, restart recovery, encrypted pending photo retention and missing temporary-photo accounting. Expo secure/cipher adapters mocked; no SQLCipher device claim.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
