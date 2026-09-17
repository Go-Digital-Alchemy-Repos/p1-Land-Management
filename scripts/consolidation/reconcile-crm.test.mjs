import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reconcileCrm, main } from "./reconcile-crm.mjs";
const fixture = () => ({
  schemaVersion: 1,
  sourceInstanceId: "instance-a",
  coreLeads: [
    {
      id: "core-lead",
      stage: "won",
      formSubmissionId: "submission",
      ownerId: "core-user",
    },
  ],
  coreClients: [
    {
      id: "core-client",
      sourceLeadId: "core-lead",
      ownerId: null,
      accountOwnerId: "core-user",
    },
  ],
  coreNotes: [
    {
      id: "note",
      entity: "lead",
      parentId: "core-lead",
      createdById: "core-user",
    },
  ],
  coreTasks: [
    {
      id: "task",
      entity: "client",
      parentId: "core-client",
      createdById: null,
      assignedToId: "core-user",
      completed: false,
    },
  ],
  dashboardLeads: [{ id: "lead", status: "won", convertedClientId: "client" }],
  dashboardClients: [{ id: "client" }],
  canonicalUsers: [{ id: "user" }],
  identityLinks: [
    { coreUserId: "core-user", canonicalUserId: "user", revokedAt: null },
  ],
  recordLinks: [],
  receipts: [
    {
      sourceInstanceId: "instance-a",
      submissionId: "submission",
      leadId: "lead",
    },
  ],
});
const codes = (report) => report.issues.map((row) => row.code);
test("existing commercial handoffs and converted clients are identified by record IDs", () => {
  const report = reconcileCrm(fixture());
  assert.deepEqual(report.issues, []);
  assert.deepEqual(
    report.proposals.find((row) => row.entity === "lead"),
    {
      entity: "lead",
      sourceId: "core-lead",
      targetId: "lead",
      action: "review_existing",
      basis: "commercial_submission_receipt",
    },
  );
  assert.deepEqual(
    report.proposals.find((row) => row.entity === "client"),
    {
      entity: "client",
      sourceId: "core-client",
      targetId: "client",
      action: "review_existing",
      basis: "converted_lead_client",
    },
  );
  assert.equal(report.automaticImportAllowed, false);
  assert.equal(report.releaseApproval, false);
});
test("submission IDs from another source instance never collapse inquiries", () => {
  const input = fixture();
  input.receipts[0].sourceInstanceId = "instance-b";
  const report = reconcileCrm(input);
  assert(
    report.proposals.every(
      (row) => row.action === "review_unmapped" && row.targetId === null,
    ),
  );
  input.coreLeads.push({
    ...input.coreLeads[0],
    id: "manual",
    formSubmissionId: null,
  });
  assert.equal(
    reconcileCrm(input).proposals.filter((row) => row.entity === "lead").length,
    2,
  );
});
test("conflicting explicit and receipt mappings block parent and child migration candidates", () => {
  const input = fixture();
  input.dashboardLeads.push({
    id: "another",
    status: "new",
    convertedClientId: null,
  });
  input.recordLinks.push({
    entity: "lead",
    sourceId: "core-lead",
    targetId: "another",
  });
  const report = reconcileCrm(input);
  assert(codes(report).includes("conflicting_targets"));
  assert(codes(report).includes("source_lead_mapping_unresolved"));
  assert(codes(report).includes("parent_mapping_blocked"));
  assert(report.proposals.every((row) => row.action === "blocked"));
});
test("duplicate source submissions and target coalescing cannot silently merge records", () => {
  const input = fixture();
  input.coreLeads.push({ ...input.coreLeads[0], id: "duplicate" });
  const report = reconcileCrm(input);
  assert.equal(
    codes(report).filter((code) => code === "duplicate_submission").length,
    2,
  );
  input.coreLeads[1].formSubmissionId = null;
  input.recordLinks.push({
    entity: "lead",
    sourceId: "duplicate",
    targetId: "lead",
  });
  const collision = reconcileCrm(input);
  assert.equal(
    codes(collision).filter((code) => code === "multiple_sources_for_target")
      .length,
    2,
  );
  assert.equal(
    collision.proposals.find((row) => row.entity === "client").action,
    "blocked",
  );
});
test("orphans, missing destinations, revoked identities and stage differences are explicit findings", () => {
  const input = fixture();
  input.coreNotes[0].parentId = "missing";
  input.identityLinks[0].revokedAt = "2030-01-01T00:00:00Z";
  input.dashboardLeads[0].status = "qualified";
  input.dashboardClients = [];
  const report = reconcileCrm(input);
  for (const code of [
    "parent_missing",
    "owner_identity_unresolved",
    "account_owner_identity_unresolved",
    "author_identity_unresolved",
    "assignee_identity_unresolved",
    "stage_requires_reconciliation",
    "candidate_target_missing",
  ])
    assert(codes(report).includes(code), code);
});
test("ambiguous receipts, unknown stages and dangling mapping sources remain visible", () => {
  const input = fixture();
  input.receipts.push({ ...input.receipts[0] });
  input.coreLeads[0].stage = "legacy-stage";
  input.recordLinks.push({
    entity: "lead",
    sourceId: "missing",
    targetId: "missing",
  });
  const report = reconcileCrm(input);
  for (const code of [
    "ambiguous_receipt",
    "unknown_source_stage",
    "mapping_source_missing",
    "mapping_target_missing",
  ])
    assert(codes(report).includes(code));
});
test("input order does not change proposals or issues and inputs are not mutated", () => {
  const input = fixture();
  input.coreLeads.push({
    ...input.coreLeads[0],
    id: "second",
    formSubmissionId: null,
  });
  const before = structuredClone(input);
  const result = reconcileCrm(input);
  assert.deepEqual(input, before);
  for (const value of Object.values(input))
    if (Array.isArray(value)) value.reverse();
  assert.deepEqual(reconcileCrm(input), result);
});
test("strict projections reject PII/payload fields, invalid records and duplicate IDs", () => {
  for (const field of ["email", "body", "password", "formData"]) {
    const input = fixture();
    input.coreLeads[0][field] = "private";
    assert.throws(() => reconcileCrm(input), /projection/);
  }
  const input = fixture();
  input.coreNotes.push({ ...input.coreNotes[0] });
  assert.throws(() => reconcileCrm(input), /Duplicate/);
  const malformed = fixture();
  malformed.coreTasks[0].completed = "false";
  assert.throws(() => reconcileCrm(malformed), /projection/);
});
test("CLI writes a private deterministic report with an input digest and never overwrites files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "p1-crm-reconcile-"));
  try {
    const input = join(dir, "input.json"),
      output = join(dir, "report.json");
    const raw = JSON.stringify(fixture());
    await writeFile(input, raw);
    const counts = await main(["--input", input, "--output", output]);
    assert.equal(counts.coreNotes, 1);
    const report = JSON.parse(await readFile(output, "utf8"));
    assert.match(report.sourceSha256, /^[a-f0-9]{64}$/);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    await assert.rejects(main(["--input", input, "--output", output]));
    await assert.rejects(main(["--input", input, "--output", input]));
    assert.equal(await readFile(input, "utf8"), raw);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("large duplicate groups preserve every finding without quadratic related-ID output", () => {
  const input = fixture();
  input.coreLeads = Array.from({ length: 2000 }, (_, i) => ({
    ...input.coreLeads[0],
    id: `source-${i}`,
  }));
  input.coreClients = [];
  input.coreNotes = [];
  input.coreTasks = [];
  const report = reconcileCrm(input);
  assert.equal(report.proposals.length, 2000);
  const issues = report.issues.filter(
    (row) => row.code === "duplicate_submission",
  );
  assert.equal(issues.length, 2000);
  assert(
    issues.every(
      (row) => row.relatedIds.length === 20 && row.relatedTotal === 2000,
    ),
  );
  assert(report.proposals.every((row) => row.action === "blocked"));
});
