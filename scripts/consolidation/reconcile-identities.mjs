import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

function record(value, fields, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !fields.includes(key))
  )
    throw new Error(`Invalid ${label} fields`);
}
function string(value, label) {
  if (typeof value !== "string" || !value.trim() || value.length > 1000)
    throw new Error(`Invalid ${label}`);
  return value;
}
function date(value, label) {
  if (
    value !== null &&
    (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
  )
    throw new Error(`Invalid ${label}`);
}
function accounts(rows, core) {
  if (!Array.isArray(rows))
    throw new Error("Account inventory must be an array");
  const ids = new Set();
  return rows.map((row) => {
    record(
      row,
      core
        ? ["id", "email", "role"]
        : ["id", "email", "role", "active", "reviewedAt"],
      "account",
    );
    const id = string(row.id, "account ID");
    if (ids.has(id)) throw new Error("Duplicate source account ID");
    ids.add(id);
    const email = string(row.email, "email").trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Invalid account email");
    if (
      core
        ? !["admin", "editor"].includes(row.role)
        : ![
            null,
            "owner",
            "member",
            "manager",
            "dispatch",
            "sales",
            "finance",
            "crew",
            "client",
          ].includes(row.role)
    )
      throw new Error("Unknown account role");
    if (!core) {
      if (typeof row.active !== "boolean")
        throw new Error("Invalid active state");
      date(row.reviewedAt, "review timestamp");
    }
    return { ...row, id, email };
  });
}
export function reconcileIdentities(input) {
  record(
    input,
    ["schemaVersion", "coreAccounts", "dashboardAccounts", "links"],
    "inventory",
  );
  if (input.schemaVersion !== 1)
    throw new Error("Unsupported inventory schema");
  const core = accounts(input.coreAccounts, true),
    dashboard = accounts(input.dashboardAccounts, false);
  if (!Array.isArray(input.links))
    throw new Error("Link inventory must be an array");
  const issues = [],
    candidates = [],
    links = [];
  const issue = (code, coreIds = [], dashboardIds = []) =>
    issues.push({
      code,
      coreIds: [...coreIds].sort(),
      dashboardIds: [...dashboardIds].sort(),
    });
  const coreMap = new Map(core.map((row) => [row.id, row])),
    dashboardMap = new Map(dashboard.map((row) => [row.id, row]));
  const byCore = new Map(),
    byDashboard = new Map();
  for (const row of input.links) {
    record(
      row,
      ["coreUserId", "canonicalUserId", "revokedAt"],
      "identity link",
    );
    string(row.coreUserId, "Core link ID");
    string(row.canonicalUserId, "canonical link ID");
    date(row.revokedAt, "revocation timestamp");
    links.push(row);
    byCore.set(row.coreUserId, [...(byCore.get(row.coreUserId) || []), row]);
    byDashboard.set(row.canonicalUserId, [
      ...(byDashboard.get(row.canonicalUserId) || []),
      row,
    ]);
    if (!coreMap.has(row.coreUserId) || !dashboardMap.has(row.canonicalUserId))
      issue("dangling_link", [row.coreUserId], [row.canonicalUserId]);
    if (row.revokedAt !== null)
      issue(
        "revoked_link_requires_disposition",
        [row.coreUserId],
        [row.canonicalUserId],
      );
  }
  for (const [id, rows] of byCore)
    if (rows.length > 1)
      issue(
        "multiple_links_for_core",
        [id],
        rows.map((row) => row.canonicalUserId),
      );
  for (const [id, rows] of byDashboard)
    if (rows.length > 1)
      issue(
        "multiple_links_for_dashboard",
        rows.map((row) => row.coreUserId),
        [id],
      );
  const groupEmail = (rows) => {
    const map = new Map();
    for (const row of rows)
      map.set(row.email, [...(map.get(row.email) || []), row]);
    return map;
  };
  const coreEmails = groupEmail(core),
    dashboardEmails = groupEmail(dashboard);
  for (const rows of coreEmails.values())
    if (rows.length > 1)
      issue(
        "duplicate_core_email",
        rows.map((row) => row.id),
      );
  for (const rows of dashboardEmails.values())
    if (rows.length > 1)
      issue(
        "duplicate_dashboard_email",
        [],
        rows.map((row) => row.id),
      );
  for (const row of core) {
    const linked = byCore.get(row.id) || [];
    if (!linked.length) {
      issue("unlinked_core_account", [row.id]);
      const matches = dashboardEmails.get(row.email) || [];
      if (
        matches.length === 1 &&
        coreEmails.get(row.email).length === 1 &&
        !byDashboard.has(matches[0].id)
      )
        candidates.push({
          coreUserId: row.id,
          canonicalUserId: matches[0].id,
          requiresDualAccountProof: true,
        });
    }
  }
  for (const row of dashboard) {
    if (row.role === null) issue("dashboard_profile_missing", [], [row.id]);
    if (
      row.active &&
      !["owner", "crew", "client", null].includes(row.role) &&
      row.reviewedAt === null
    )
      issue("permissions_not_reviewed", [], [row.id]);
    if (
      byDashboard.has(row.id) &&
      (!row.active ||
        row.role === null ||
        row.role === "client" ||
        row.role === "crew")
    )
      issue(
        "linked_dashboard_not_eligible_for_cms",
        byDashboard.get(row.id).map((link) => link.coreUserId),
        [row.id],
      );
  }
  if (!dashboard.some((row) => row.role === "owner" && row.active))
    issue("active_owner_missing");
  issues.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  candidates.sort((a, b) => a.coreUserId.localeCompare(b.coreUserId));
  return {
    schemaVersion: 1,
    mode: "read_only",
    counts: {
      coreAccounts: core.length,
      dashboardAccounts: dashboard.length,
      links: links.length,
      issues: issues.length,
    },
    issues,
    candidates,
    automaticLinkingAllowed: false,
    releaseApproval: false,
  };
}
export async function main(args) {
  if (args.length !== 4 || args[0] !== "--input" || args[2] !== "--output")
    throw new Error(
      "Usage: node scripts/consolidation/reconcile-identities.mjs --input inventory.json --output report.json",
    );
  if (args[1] === args[3]) throw new Error("Input and output must differ");
  const raw = await readFile(args[1]);
  const report = reconcileIdentities(JSON.parse(raw.toString()));
  report.sourceSha256 = createHash("sha256").update(raw).digest("hex");
  // Exclusive creation avoids replacing the source, another report or a symlink.
  await writeFile(args[3], JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  return report.counts;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2))
    .then((counts) => process.stdout.write(JSON.stringify(counts) + "\n"))
    .catch((error) => {
      process.stderr.write(
        error instanceof SyntaxError
          ? "Invalid inventory JSON\n"
          : error.message + "\n",
      );
      process.exitCode = 1;
    });
