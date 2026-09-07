const { build } = require(
  process.cwd() + "/artifacts/api-server/node_modules/esbuild",
);
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p1-checklist-db-"));
  globalThis.qaDirectory = dir;
  const shim = `import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY=1; const keys=new Map();export async function getItemAsync(k){return keys.get(k)||null}export async function setItemAsync(k,v){keys.set(k,v)}export const CryptoDigestAlgorithm={SHA256:'sha256'};export async function digestStringAsync(a,v){return crypto.createHash(a).update(v).digest('hex')}export async function getRandomBytesAsync(n){return crypto.randomBytes(n)}
export const Paths={document:globalThis.qaDirectory};export class Directory{constructor(a,b){this.uri=path.join(a,b)}create(){fs.mkdirSync(this.uri,{recursive:true})}}export class File{constructor(a,b){this.uri=path.join(a.uri,b)}get exists(){return fs.existsSync(this.uri)}}
export async function openDatabaseAsync(name,options,folder){const db=new DatabaseSync(path.join(folder,name));return {async execAsync(sql){db.exec(sql.replace(/PRAGMA key = [^;]+;/g,''))},async getFirstAsync(sql,...args){if(sql==='PRAGMA cipher_version')return {cipher_version:'mock cipher boundary; real SQLite transactions'};return db.prepare(sql).get(...args)},async getAllAsync(sql,...args){return db.prepare(sql).all(...args)},async runAsync(sql,...args){if(globalThis.failChecklistWrite&&sql.startsWith('UPDATE metadata SET'))throw new Error('injected snapshot write failure');return db.prepare(sql).run(...args)},async closeAsync(){db.close()}}}`;
  await build({
    entryPoints: ["artifacts/p1-native/src/native/vault.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: dir + "/vault.mjs",
    plugins: [
      {
        name: "native-synthetic-adapters",
        setup(b) {
          if (process.env.P1_CHECKLIST_BASELINE === "1")
            b.onLoad({ filter: /src\/native\/vault\.ts$/ }, () => ({
              contents: require("node:child_process").execFileSync(
                "git",
                ["show", "f12f752:artifacts/p1-native/src/native/vault.ts"],
                { encoding: "utf8" },
              ),
              resolveDir: path.resolve("artifacts/p1-native/src/native"),
              loader: "ts",
            }));
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
  const w = {
    id: "11111111-1111-4111-8111-111111111111",
    version: 3,
    checklist: [
      { label: "A", done: false },
      { label: "B", done: false },
    ],
  };
  let a = await openVault("https://synthetic.invalid", "a");
  const b = await openVault("https://synthetic.invalid", "b");
  await a.download([w]);
  await b.download([w]);
  const ev = {
    id: "22222222-2222-4222-8222-222222222222",
    workOrderId: w.id,
    baseVersion: 3,
    kind: "checklist",
    payload: {
      items: [
        { label: "A", done: true },
        { label: "B", done: false },
      ],
    },
    capturedAt: "2026-09-07T12:00:00.000Z",
  };
  await a.enqueue(ev);
  await a.close();
  a = await openVault("https://synthetic.invalid", "a", true);
  assert.equal((await a.downloaded())[0].checklist[0].done, true);
  assert.equal((await b.downloaded())[0].checklist[0].done, false);
  const ev2 = {
    ...ev,
    id: "33333333-3333-4333-8333-333333333333",
    payload: {
      items: (await a.downloaded())[0].checklist.map((x) => ({
        ...x,
        done: true,
      })),
    },
  };
  globalThis.failChecklistWrite = true;
  await assert.rejects(a.enqueue(ev2), /injected/);
  globalThis.failChecklistWrite = false;
  assert.equal((await a.pending()).length, 1);
  assert.equal((await a.downloaded())[0].checklist[1].done, false);
  await a.enqueue(ev2);
  await a.download([w]);
  assert.deepEqual(
    (await a.downloaded())[0].checklist.map((x) => x.done),
    [true, true],
  );
  assert.deepEqual(await a.pending(), [ev, ev2]);
  await a.recordResults([
    { id: ev.id, status: "accepted" },
    { id: ev2.id, status: "accepted" },
  ]);
  await a.close();
  a = await openVault("https://synthetic.invalid", "a", true);
  assert.deepEqual(
    (await a.downloaded())[0].checklist.map((x) => x.done),
    [true, true],
  );
  await a.close();
  await b.close();
  console.log(
    "PASS actual vault against disposable real SQLite: reopen, other account, failed-write rollback, retry identity, redownload, accepted-local reopen. Expo secure/cipher adapters mocked; no SQLCipher device claim.",
  );
  console.log("Evidence directory " + dir);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
