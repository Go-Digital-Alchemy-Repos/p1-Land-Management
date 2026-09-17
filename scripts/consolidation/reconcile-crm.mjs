import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const stages = new Set([
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
]);
const id = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(value);
const nullableId = (value) => value === null || id(value);
function object(value, fields, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !Object.hasOwn(fields, key)) ||
    Object.entries(fields).some(
      ([key, valid]) => !Object.hasOwn(value, key) || !valid(value[key]),
    )
  )
    throw Error(`Invalid ${label} projection`);
}
const entity = (value) => value === "lead" || value === "client";
const text = (value) => typeof value === "string" && value.length <= 200;
const date = (value) =>
  value === null ||
  (typeof value === "string" &&
    /^\d{4}-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)));
const shapes = {
  coreLeads: {
    id,
    stage: text,
    formSubmissionId: nullableId,
    ownerId: nullableId,
  },
  coreClients: {
    id,
    sourceLeadId: nullableId,
    ownerId: nullableId,
    accountOwnerId: nullableId,
  },
  coreNotes: { id, entity, parentId: id, createdById: nullableId },
  coreTasks: {
    id,
    entity,
    parentId: id,
    createdById: nullableId,
    assignedToId: nullableId,
    completed: (value) => typeof value === "boolean",
  },
  dashboardLeads: { id, status: text, convertedClientId: nullableId },
  dashboardClients: { id },
  canonicalUsers: { id },
  identityLinks: { coreUserId: id, canonicalUserId: id, revokedAt: date },
  recordLinks: { entity, sourceId: id, targetId: id },
  receipts: { sourceInstanceId: id, submissionId: id, leadId: id },
};
const sorted = (items) =>
  [...items].sort((a, b) =>
    JSON.stringify(a) < JSON.stringify(b)
      ? -1
      : JSON.stringify(a) > JSON.stringify(b)
        ? 1
        : 0,
  );
const group = (rows, key) => {
  const map = new Map();
  for (const row of rows) {
    const k = key(row);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
};

const referenceSummary = (rows, key) => {
  const ids = [...new Set(rows.map(key))].sort();
  return { length: rows.length, ids: ids.slice(0, 20), total: ids.length };
};
const summarizeGroups = (groups, key) =>
  new Map([...groups].map(([id, rows]) => [id, referenceSummary(rows, key)]));

/** Offline relationship inventory only: never imports, links accounts or merges by contact data. */
export function reconcileCrm(input) {
  object(
    input,
    {
      schemaVersion: (value) => value === 1,
      sourceInstanceId: id,
      ...Object.fromEntries(
        Object.keys(shapes).map((key) => [
          key,
          (value) => Array.isArray(value) && value.length <= 100000,
        ]),
      ),
    },
    "CRM inventory",
  );
  for (const [name, shape] of Object.entries(shapes)) {
    for (const row of input[name]) object(row, shape, name);
    if (
      name.startsWith("core") ||
      name.startsWith("dashboard") ||
      name === "canonicalUsers"
    ) {
      const keys = input[name].map((row) => `${row.entity || ""}:${row.id}`);
      if (new Set(keys).size !== keys.length)
        throw Error(`Duplicate IDs in ${name}`);
    }
  }
  const core = {
    lead: new Map(input.coreLeads.map((row) => [row.id, row])),
    client: new Map(input.coreClients.map((row) => [row.id, row])),
  };
  const destination = {
    lead: new Map(input.dashboardLeads.map((row) => [row.id, row])),
    client: new Map(input.dashboardClients.map((row) => [row.id, row])),
  };
  const users = new Set(input.canonicalUsers.map((row) => row.id));
  const identity = group(
    input.identityLinks.filter((row) => row.revokedAt === null),
    (row) => row.coreUserId,
  );
  const links = group(
    input.recordLinks,
    (row) => `${row.entity}:${row.sourceId}`,
  );
  const receiptRows = group(
    input.receipts.filter(
      (row) => row.sourceInstanceId === input.sourceInstanceId,
    ),
    (row) => row.submissionId,
  );
  const submissionRows = group(
    input.coreLeads.filter((row) => row.formSubmissionId),
    (row) => row.formSubmissionId,
  );
  const receipts = summarizeGroups(receiptRows, (row) => row.leadId);
  const submissions = summarizeGroups(submissionRows, (row) => row.id);
  const issues = [];
  const mappingFailures = new Set();
  const failureCodes = new Set([
    "duplicate_source_mapping",
    "conflicting_targets",
    "candidate_target_missing",
    "duplicate_submission",
    "ambiguous_receipt",
  ]);
  const add = (
    code,
    entity,
    sourceId,
    relatedIds = [],
    relatedTotal = new Set(relatedIds).size,
  ) => {
    if (failureCodes.has(code)) mappingFailures.add(`${entity}:${sourceId}`);
    issues.push({
      code,
      entity,
      sourceId,
      relatedIds: [...new Set(relatedIds)].sort().slice(0, 20),
      relatedTotal,
    });
  };
  const proposals = [];
  const proposed = new Map();
  function author(entity, sourceId, key, coreUserId) {
    if (coreUserId === null) return;
    const targets = identity.get(coreUserId) || [];
    if (targets.length !== 1 || !users.has(targets[0].canonicalUserId))
      add(`${key}_identity_unresolved`, entity, sourceId, [coreUserId]);
  }
  for (const link of input.recordLinks) {
    if (!core[link.entity].has(link.sourceId))
      add("mapping_source_missing", link.entity, link.sourceId, [
        link.targetId,
      ]);
    if (!destination[link.entity].has(link.targetId))
      add("mapping_target_missing", link.entity, link.sourceId, [
        link.targetId,
      ]);
  }
  for (const receipt of input.receipts.filter(
    (row) => row.sourceInstanceId === input.sourceInstanceId,
  ))
    if (!destination.lead.has(receipt.leadId))
      add("receipt_target_missing", "submission", receipt.submissionId, [
        receipt.leadId,
      ]);
  function propose(entity, row, derived, reason) {
    const explicit = links.get(`${entity}:${row.id}`) || [];
    const targets = new Set([
      ...explicit.map((row) => row.targetId),
      ...derived,
    ]);
    if (explicit.length > 1)
      add(
        "duplicate_source_mapping",
        entity,
        row.id,
        explicit.map((row) => row.targetId),
      );
    if (targets.size > 1)
      add("conflicting_targets", entity, row.id, [...targets]);
    const candidate = targets.size === 1 ? [...targets][0] : null;
    const exists = candidate && destination[entity].has(candidate);
    if (candidate && !exists)
      add("candidate_target_missing", entity, row.id, [candidate]);
    const blocked = mappingFailures.has(`${entity}:${row.id}`);
    const proposal = {
      entity,
      sourceId: row.id,
      targetId: blocked ? null : candidate,
      action: blocked
        ? "blocked"
        : exists
          ? "review_existing"
          : "review_unmapped",
      basis: explicit.length
        ? "record_mapping"
        : derived.length
          ? reason
          : "no_record_identity_match",
    };
    proposals.push(proposal);
    proposed.set(`${entity}:${row.id}`, proposal);
    return proposal;
  }
  for (const row of input.coreLeads) {
    const matches = receipts.get(row.formSubmissionId) || {
      length: 0,
      ids: [],
      total: 0,
    };
    const duplicates = submissions.get(row.formSubmissionId);
    if (duplicates && duplicates.length > 1)
      add(
        "duplicate_submission",
        "lead",
        row.id,
        duplicates.ids,
        duplicates.total,
      );
    if (matches.length > 1)
      add("ambiguous_receipt", "lead", row.id, matches.ids, matches.total);
    const proposal = propose(
      "lead",
      row,
      matches.ids,
      "commercial_submission_receipt",
    );
    if (!stages.has(row.stage)) add("unknown_source_stage", "lead", row.id);
    const target = proposal.targetId
      ? destination.lead.get(proposal.targetId)
      : null;
    if (target && target.status !== row.stage)
      add("stage_requires_reconciliation", "lead", row.id, [target.id]);
    author("lead", row.id, "owner", row.ownerId);
  }
  function markCollisions(entity) {
    for (const rows of group(
      proposals.filter((row) => row.entity === entity && row.targetId),
      (row) => row.targetId,
    ).values()) {
      const related = referenceSummary(rows, (row) => row.sourceId);
      if (rows.length > 1)
        for (const row of rows) {
          add(
            "multiple_sources_for_target",
            row.entity,
            row.sourceId,
            related.ids,
            related.total,
          );
          row.action = "blocked";
        }
    }
  }
  markCollisions("lead");
  for (const row of input.coreClients) {
    const parent = row.sourceLeadId
      ? proposed.get(`lead:${row.sourceLeadId}`)
      : null;
    if (row.sourceLeadId && !core.lead.has(row.sourceLeadId))
      add("source_lead_missing", "client", row.id, [row.sourceLeadId]);
    const targetLead = parent?.targetId
      ? destination.lead.get(parent.targetId)
      : null;
    const proposal = propose(
      "client",
      row,
      parent?.action !== "blocked" && targetLead?.convertedClientId
        ? [targetLead.convertedClientId]
        : [],
      "converted_lead_client",
    );
    if (row.sourceLeadId && (!parent || parent.action === "blocked")) {
      add("source_lead_mapping_unresolved", "client", row.id, [
        row.sourceLeadId,
      ]);
      proposal.action = "blocked";
    }
    author("client", row.id, "owner", row.ownerId);
    author("client", row.id, "account_owner", row.accountOwnerId);
  }
  markCollisions("client");
  for (const [collection, kind] of [
    ["coreNotes", "note"],
    ["coreTasks", "task"],
  ])
    for (const row of input[collection]) {
      const recordEntity = `${row.entity}_${kind}`;
      if (!core[row.entity].has(row.parentId))
        add("parent_missing", recordEntity, row.id, [row.parentId]);
      else if (
        proposed.get(`${row.entity}:${row.parentId}`)?.action === "blocked"
      )
        add("parent_mapping_blocked", recordEntity, row.id, [row.parentId]);
      author(recordEntity, row.id, "author", row.createdById);
      if (kind === "task")
        author(recordEntity, row.id, "assignee", row.assignedToId);
    }
  return {
    schemaVersion: 1,
    mode: "read_only",
    sourceInstanceId: input.sourceInstanceId,
    counts: {
      ...Object.fromEntries(
        Object.keys(shapes).map((key) => [key, input[key].length]),
      ),
      issues: issues.length,
    },
    proposals: sorted(proposals),
    issues: sorted(issues),
    automaticImportAllowed: false,
    releaseApproval: false,
  };
}
export async function main(args) {
  if (args.length !== 4 || args[0] !== "--input" || args[2] !== "--output")
    throw Error(
      "Usage: node scripts/consolidation/reconcile-crm.mjs --input inventory.json --output report.json",
    );
  if (args[1] === args[3]) throw Error("Input and output must differ");
  if ((await stat(args[1])).size > 32 * 1024 * 1024)
    throw Error("CRM inventory exceeds 32 MiB");
  const raw = await readFile(args[1]);
  if (raw.length > 32 * 1024 * 1024)
    throw Error("CRM inventory exceeds 32 MiB");
  const report = reconcileCrm(JSON.parse(raw.toString("utf8")));
  report.sourceSha256 = createHash("sha256").update(raw).digest("hex");
  await writeFile(args[3], JSON.stringify(report, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  return report.counts;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2))
    .then((counts) => process.stdout.write(JSON.stringify(counts) + "\n"))
    .catch(() => {
      process.stderr.write(
        "CRM reconciliation failed. Check the input projection and use a new output path.\n",
      );
      process.exitCode = 1;
    });
