import { parseCrmJson } from "./prepare-crm-payloads.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  prepareCrmPayloads,
  payloadShapes,
  main,
} from "./prepare-crm-payloads.mjs";
import { at, fixture } from "./crm-payload-fixture.mjs";

test("all six collections retain every field, exact text, timestamps and independent owner identities", () => {
  const input = fixture(),
    original = structuredClone(input),
    manifest = prepareCrmPayloads(input);
  assert.deepEqual(input, original);
  assert.equal(manifest.records.length, 6);
  assert.equal(manifest.counts.blocked, 0);
  for (const row of manifest.records) {
    assert.deepEqual(row.sourceSnapshot, input.records[row.collection][0]);
    assert.match(row.sourceDigest, /^[a-f0-9]{64}$/);
  }
  const note = manifest.records.find((r) => r.collection === "leadNotes");
  assert.equal(note.nativeProjection.body, input.records.leadNotes[0].body);
  assert.equal(note.nativeProjection.createdAt, at);
  assert.equal(note.nativeProjection.authorId, "canonical-user");
  const task = manifest.records.find((r) => r.collection === "clientTasks");
  assert.equal(task.nativeProjection.completed, true);
  assert.equal(task.nativeProjection.assignedToId, null);
  assert.equal(task.nativeProjection.sourceAssignedToId, "missing-user");
  assert.equal(task.nativeProjection.createdById, null);
  const parent = manifest.records.find((r) => r.collection === "clients");
  assert.equal(parent.nativeProjection, null);
  assert.equal(parent.sourceSnapshot.ownerId, "source-user");
  assert.equal(parent.sourceSnapshot.accountOwnerId, "missing-user");
  assert.equal(parent.targetId, "target-client");
  assert(manifest.reconciliation.issues.some((i) => i.code.includes("stage")));
  assert.equal(manifest.automaticImportAllowed, false);
  assert.equal(manifest.releaseApproval, false);
});
test("no implicit onboarding or matching by contact data; missing and conflicting mappings block children", () => {
  const input = fixture();
  input.targetInventory.receipts = [];
  let result = prepareCrmPayloads(input);
  assert.equal(result.counts.blocked, 6);
  assert(result.records.every((r) => r.targetId === null));
  input.targetInventory.receipts = fixture().targetInventory.receipts;
  input.targetInventory.recordLinks = [
    { entity: "lead", sourceId: "source-lead", targetId: "different" },
  ];
  result = prepareCrmPayloads(input);
  assert.equal(result.counts.blocked, 6);
});
test("oversized or blank content and missing dates are preserved and flagged, never truncated or dated now", () => {
  const input = fixture();
  input.records.leadNotes[0].body = "x".repeat(10001);
  input.records.clientNotes[0].createdAt = null;
  input.records.leadTasks[0].title = " ";
  input.records.clientTasks[0].updatedAt = null;
  const result = prepareCrmPayloads(input);
  assert.equal(result.counts.blocked, 4);
  assert.equal(
    result.records.find((r) => r.collection === "leadNotes").sourceSnapshot.body
      .length,
    10001,
  );
  assert.equal(
    result.records.find((r) => r.collection === "clientNotes").nativeProjection
      .createdAt,
    null,
  );
});
test("unknown, missing and duplicate fields/IDs reject incomplete exports; note IDs stay scoped to their source table", () => {
  for (const mutate of [
    (x) => delete x.records.clients[0].billingEmail,
    (x) => (x.records.leads[0].newField = "unmapped"),
    (x) => x.records.leadNotes.push(x.records.leadNotes[0]),
    (x) => (x.records.extra = []),
    (x) => (x.records.leads[0].metadata.bad = undefined),
  ]) {
    const input = fixture();
    mutate(input);
    assert.throws(() => prepareCrmPayloads(input));
  }
  assert.equal(
    prepareCrmPayloads(fixture()).records.filter((r) => r.sourceId === "note")
      .length,
    2,
  );
});
test("timestamps require explicit UTC and valid calendar dates without losing microseconds", () => {
  for (const bad of [
    "2020-02-30T00:00:00Z",
    "2020-02-29T24:00:00Z",
    "2020-02-29T12:00:00",
    "2020-02-29T12:00:00-05:00",
    "2020-02-29T12:00:00.1234567Z",
  ]) {
    const input = fixture();
    input.records.leads[0].createdAt = bad;
    assert.throws(() => prepareCrmPayloads(input));
  }
  assert.equal(
    prepareCrmPayloads(fixture()).records.find((r) => r.collection === "leads")
      .sourceSnapshot.createdAt,
    at,
  );
});
test("duplicate, dangling and revoked identity links never invent canonical authorship", () => {
  for (const mutate of [
    (x) =>
      x.targetInventory.identityLinks.push(x.targetInventory.identityLinks[0]),
    (x) => (x.targetInventory.canonicalUsers = []),
    (x) => (x.targetInventory.identityLinks[0].revokedAt = at),
  ]) {
    const input = fixture();
    mutate(input);
    const note = prepareCrmPayloads(input).records.find(
      (r) => r.collection === "leadNotes",
    );
    assert.equal(note.nativeProjection.authorId, null);
    assert.equal(note.nativeProjection.sourceAuthorId, "source-user");
  }
});
test("record hashes and manifests are deterministic across key/collection order; content changes alter digest", () => {
  const input = fixture();
  input.records.leadNotes.push({
    ...input.records.leadNotes[0],
    id: "other-note",
  });
  const first = prepareCrmPayloads(input);
  input.records.leadNotes.reverse();
  input.records.leads[0].formData = {
    nested: { unknownField: [1, null, false], html: "<b>Literal</b>" },
  };
  assert.deepEqual(prepareCrmPayloads(input), first);
  input.records.leadNotes[0].body += " changed";
  const changed = prepareCrmPayloads(input);
  assert.notEqual(changed.sourceContentSha256, first.sourceContentSha256);
  assert.notEqual(
    changed.records.find((r) => r.sourceId === "other-note").sourceDigest,
    first.records.find((r) => r.sourceId === "other-note").sourceDigest,
  );
});
test("CLI writes a private exclusive file; output and errors never print customer contents", async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-payload-"));
  try {
    const input = join(dir, "source.json"),
      output = join(dir, "manifest.json");
    await writeFile(input, JSON.stringify(fixture()));
    const counts = await main(["--input", input, "--output", output]);
    assert.equal(counts.leads, 1);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    const saved = await readFile(output, "utf8");
    assert.match(JSON.parse(saved).inputFileSha256, /^[a-f0-9]{64}$/);
    await assert.rejects(main(["--input", input, "--output", output]));
    assert.equal(await readFile(output, "utf8"), saved);
    await writeFile(input, "bad private@example.test");
    const failure = spawnSync(
      process.execPath,
      [
        "scripts/consolidation/prepare-crm-payloads.mjs",
        "--input",
        input,
        "--output",
        output,
      ],
      { encoding: "utf8" },
    );
    assert.equal(failure.status, 1);
    assert(!failure.stderr.includes("private@example.test"));
    assert.equal(failure.stdout, "");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("payload contract covers every persisted field of the actual Core CRM tables", async () => {
  const source = await readFile(
    new URL("../../platform/p1-core/shared/schema/crm.ts", import.meta.url),
    "utf8",
  );
  const tables = {
    leads: "crmLeads",
    clients: "crmClients",
    leadNotes: "crmLeadNotes",
    clientNotes: "crmClientNotes",
    leadTasks: "crmLeadTasks",
    clientTasks: "crmClientTasks",
  };
  for (const [collection, name] of Object.entries(tables)) {
    const start = source.indexOf("export const " + name + " = pgTable(");
    assert(start >= 0);
    const end = source.indexOf("\n  (table)", start);
    assert(end > start);
    const keys = [
      ...source.slice(start, end).matchAll(/^    ([A-Za-z]\w*):/gm),
    ].map((m) => m[1]);
    assert.deepEqual(
      Object.keys(payloadShapes[collection]).sort(),
      keys.sort(),
      name + " export contract drift",
    );
  }
});
test("unsafe integers in arbitrary source metadata are rejected rather than rounded into a manifest", () => {
  const input = fixture();
  input.records.leads[0].metadata.unsafe = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => prepareCrmPayloads(input), /JSON values/);
});

test("JSON input precision is checked before numeric rounding can silently change metadata", () => {
  for (const token of [
    "9007199254740993",
    "1.234567890123456789",
    "1e-999",
    "1e999",
  ])
    assert.throws(
      () => parseCrmJson('{"value":' + token + "}"),
      /cannot be preserved/,
    );
  assert.deepEqual(parseCrmJson('{"a":1.2300,"b":1e3,"c":1e-8,"d":-0}'), {
    a: 1.23,
    b: 1000,
    c: 1e-8,
    d: -0,
  });
});
