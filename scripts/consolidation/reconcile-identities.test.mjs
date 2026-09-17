import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reconcileIdentities, main } from "./reconcile-identities.mjs";
const fixture = () => ({
  schemaVersion: 1,
  coreAccounts: [
    { id: "core-owner", email: "owner@example.test", role: "admin" },
  ],
  dashboardAccounts: [
    {
      id: "owner",
      email: "owner@example.test",
      role: "owner",
      active: true,
      reviewedAt: null,
    },
  ],
  links: [
    { coreUserId: "core-owner", canonicalUserId: "owner", revokedAt: null },
  ],
});
test("existing ID links are authoritative and email matches never create links", () => {
  const input = fixture();
  input.coreAccounts[0].email = "different@example.test";
  const report = reconcileIdentities(input);
  assert.equal(report.counts.issues, 0);
  assert.deepEqual(report.candidates, []);
  input.links = [];
  input.coreAccounts[0].email = " OWNER@example.test ";
  const result = reconcileIdentities(input);
  assert.equal(result.issues[0].code, "unlinked_core_account");
  assert.deepEqual(result.candidates, [
    {
      coreUserId: "core-owner",
      canonicalUserId: "owner",
      requiresDualAccountProof: true,
    },
  ]);
  assert.equal(result.automaticLinkingAllowed, false);
  assert.equal(result.releaseApproval, false);
  assert.equal(input.links.length, 0);
  assert(!JSON.stringify(result).includes("@"));
});
test("duplicate identities, revoked/dangling links and unreviewed or ineligible accounts are explicit", () => {
  const input = fixture();
  input.coreAccounts.push({
    id: "core-2",
    email: "OWNER@example.test",
    role: "editor",
  });
  input.dashboardAccounts.push({
    id: "member",
    email: "owner@example.test",
    role: "member",
    active: true,
    reviewedAt: null,
  });
  input.links.push({
    coreUserId: "core-owner",
    canonicalUserId: "member",
    revokedAt: "2026-01-01",
  });
  input.links.push({
    coreUserId: "missing",
    canonicalUserId: "member",
    revokedAt: null,
  });
  let result = reconcileIdentities(input),
    codes = new Set(result.issues.map((row) => row.code));
  for (const code of [
    "duplicate_core_email",
    "duplicate_dashboard_email",
    "multiple_links_for_core",
    "multiple_links_for_dashboard",
    "revoked_link_requires_disposition",
    "dangling_link",
    "permissions_not_reviewed",
    "unlinked_core_account",
  ])
    assert(codes.has(code), code);
  assert.deepEqual(result.candidates, []);
  for (const role of ["crew", "client", null]) {
    input.dashboardAccounts[1].role = role;
    result = reconcileIdentities(input);
    assert(
      result.issues.some(
        (row) => row.code === "linked_dashboard_not_eligible_for_cms",
      ),
    );
  }
  input.dashboardAccounts[0].active = false;
  assert(
    reconcileIdentities(input).issues.some(
      (row) => row.code === "active_owner_missing",
    ),
  );
});
test("inventories fail closed on unsupported roles, duplicate source IDs and secret fields", () => {
  for (const mutate of [
    (x) => x.coreAccounts.push(x.coreAccounts[0]),
    (x) => (x.dashboardAccounts[0].role = "admin"),
    (x) => (x.coreAccounts[0].password = "SECRET"),
    (x) => (x.links[0].initialGrantId = "SECRET"),
    (x) => (x.dashboardAccounts[0].reviewedAt = "invalid"),
  ]) {
    const input = fixture();
    mutate(input);
    assert.throws(() => reconcileIdentities(input));
  }
  const input = fixture();
  input.coreAccounts.push({ id: "z", email: "z@example.test", role: "editor" });
  const a = reconcileIdentities(input);
  input.coreAccounts.reverse();
  assert.deepEqual(reconcileIdentities(input), a);
});
test("CLI produces private read-only evidence and refuses to replace files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "p1-identity-reconciliation-"));
  try {
    const source = join(dir, "inventory.json"),
      output = join(dir, "report.json");
    await writeFile(source, JSON.stringify(fixture()));
    const before = await readFile(source, "utf8");
    await main(["--input", source, "--output", output]);
    const report = JSON.parse(await readFile(output, "utf8"));
    assert.match(report.sourceSha256, /^[a-f0-9]{64}$/);
    assert.equal(report.mode, "read_only");
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    assert.equal(await readFile(source, "utf8"), before);
    await assert.rejects(
      main(["--input", source, "--output", source]),
      /must differ/,
    );
    await assert.rejects(
      main(["--input", source, "--output", output]),
      /EEXIST/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
