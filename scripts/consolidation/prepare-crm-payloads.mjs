import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { reconcileCrm } from "./reconcile-crm.mjs";
const id = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(v);
const string = (v) => typeof v === "string";
const nullable = (check) => (v) => v === null || check(v);
const date = (v) =>
  v === null ||
  (typeof v === "string" &&
    /^(?!0000)\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 19) === v.slice(0, 19));
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const nullableText = nullable(string),
  nullableId = nullable(id);
const common = {
  id,
  name: string,
  email: nullableText,
  phone: nullableText,
  company: nullableText,
  source: string,
  formData: record,
  metadata: record,
  ownerId: nullableId,
  nextFollowUpAt: date,
  createdAt: date,
  updatedAt: date,
};
const note = { id, body: string, createdById: nullableId, createdAt: date };
const task = {
  id,
  title: string,
  dueAt: date,
  completed: (v) => typeof v === "boolean",
  assignedToId: nullableId,
  createdById: nullableId,
  createdAt: date,
  updatedAt: date,
};
export const payloadShapes = {
  leads: {
    ...common,
    message: nullableText,
    stage: string,
    externalId: nullableText,
    formSubmissionId: nullableId,
  },
  clients: {
    ...common,
    sourceLeadId: nullableId,
    clientType: string,
    preferredContactMethod: string,
    onboardingStatus: string,
    status: string,
    accountOwnerId: nullableId,
    serviceStartDate: date,
    renewalDate: date,
    clientSince: date,
    internalTags: (v) => Array.isArray(v) && v.every(string),
    ...Object.fromEntries(
      [
        "primaryEmail",
        "secondaryEmail",
        "primaryPhone",
        "alternatePhone",
        "addressLine1",
        "addressLine2",
        "city",
        "region",
        "postalCode",
        "country",
        "companyName",
        "legalName",
        "website",
        "industry",
        "companySize",
        "businessType",
        "companyPhone",
        "companyEmail",
        "billingContactName",
        "billingEmail",
        "billingPhone",
      ].map((k) => [k, nullableText]),
    ),
  },
  leadNotes: { ...note, leadId: id },
  clientNotes: { ...note, clientId: id },
  leadTasks: { ...task, leadId: id },
  clientTasks: { ...task, clientId: id },
};
function exact(value, shape, label) {
  if (
    !record(value) ||
    Object.keys(value).length !== Object.keys(shape).length ||
    Object.entries(shape).some(
      ([k, check]) => !Object.hasOwn(value, k) || !check(value[k]),
    )
  )
    throw Error("Invalid " + label);
}
function canonical(value, depth = 0) {
  if (depth > 64) throw Error("Payload nesting exceeds 64");
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      (!Number.isInteger(value) || Number.isSafeInteger(value)))
  )
    return value;
  if (Array.isArray(value)) return value.map((v) => canonical(v, depth + 1));
  if (record(value) && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k], depth + 1)]),
    );
  throw Error("Payload must contain JSON values only");
}
export const digestCrmValue = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
const targetKeys = [
  "dashboardLeads",
  "dashboardClients",
  "canonicalUsers",
  "identityLinks",
  "recordLinks",
  "receipts",
];
/** A private preservation manifest. No writes to either application and no migration authority. */
export function prepareCrmPayloads(input) {
  exact(
    input,
    {
      schemaVersion: (v) => v === 1,
      sourceInstanceId: id,
      records: record,
      targetInventory: record,
    },
    "payload export",
  );
  exact(
    input.records,
    Object.fromEntries(
      Object.keys(payloadShapes).map((k) => [
        k,
        (v) => Array.isArray(v) && v.length <= 100000,
      ]),
    ),
    "source collections",
  );
  exact(
    input.targetInventory,
    Object.fromEntries(targetKeys.map((k) => [k, Array.isArray])),
    "target inventory",
  );
  canonical(input); // Reject unsupported/nested values before hashing or projecting.
  for (const [collection, shape] of Object.entries(payloadShapes)) {
    for (const row of input.records[collection]) exact(row, shape, collection);
    if (
      new Set(input.records[collection].map((r) => r.id)).size !==
      input.records[collection].length
    )
      throw Error("Duplicate source IDs");
  }
  const { leads, clients, leadNotes, clientNotes, leadTasks, clientTasks } =
    input.records;
  const notes = (rows, entity) =>
    rows.map((r) => ({
      id: r.id,
      entity,
      parentId: r[entity + "Id"],
      createdById: r.createdById,
    }));
  const tasks = (rows, entity) =>
    rows.map((r) => ({
      ...notes([r], entity)[0],
      assignedToId: r.assignedToId,
      completed: r.completed,
    }));
  const reconciliation = reconcileCrm({
    schemaVersion: 1,
    sourceInstanceId: input.sourceInstanceId,
    coreLeads: leads.map((r) => ({
      id: r.id,
      stage: r.stage,
      formSubmissionId: r.formSubmissionId,
      ownerId: r.ownerId,
    })),
    coreClients: clients.map((r) => ({
      id: r.id,
      sourceLeadId: r.sourceLeadId,
      ownerId: r.ownerId,
      accountOwnerId: r.accountOwnerId,
    })),
    coreNotes: [...notes(leadNotes, "lead"), ...notes(clientNotes, "client")],
    coreTasks: [...tasks(leadTasks, "lead"), ...tasks(clientTasks, "client")],
    ...input.targetInventory,
  });
  const proposed = new Map(
    reconciliation.proposals.map((p) => [p.entity + ":" + p.sourceId, p]),
  );
  const canonicalUsers = new Set(
    input.targetInventory.canonicalUsers.map((u) => u.id),
  );
  const activeLinks = new Map();
  for (const link of input.targetInventory.identityLinks)
    if (link.revokedAt === null) {
      const links = activeLinks.get(link.coreUserId) || [];
      links.push(link);
      activeLinks.set(link.coreUserId, links);
    }
  const actor = (sourceId) => {
    const matches = activeLinks.get(sourceId) || [];
    return matches.length === 1 &&
      canonicalUsers.has(matches[0].canonicalUserId)
      ? matches[0].canonicalUserId
      : null;
  };
  const records = [];
  for (const [collection, rows] of Object.entries(input.records))
    for (const source of rows) {
      const entity = collection.startsWith("lead") ? "lead" : "client",
        kind = collection.endsWith("Notes")
          ? "note"
          : collection.endsWith("Tasks")
            ? "task"
            : "parent";
      const sourceParentId =
        kind === "parent" ? source.id : source[entity + "Id"];
      const mapping = proposed.get(entity + ":" + sourceParentId);
      const blockers = [];
      if (mapping?.action !== "review_existing")
        blockers.push("parent_mapping_requires_review");
      if (kind !== "parent" && source.createdAt === null)
        blockers.push("missing_creation_timestamp");
      if (kind === "task" && source.updatedAt === null)
        blockers.push("missing_update_timestamp");
      const content =
        kind === "note" ? source.body : kind === "task" ? source.title : null;
      if (
        content !== null &&
        (!content.trim() ||
          [...content].length > (kind === "note" ? 10000 : 2000))
      )
        blockers.push("content_exceeds_native_constraints");
      const sourceDigest = digestCrmValue(source);
      const nativeProjection =
        kind === "parent"
          ? null
          : kind === "note"
            ? {
                parentId:
                  mapping?.action === "review_existing"
                    ? mapping.targetId
                    : null,
                body: source.body,
                createdAt: source.createdAt,
                authorId: actor(source.createdById),
                sourceInstanceId: input.sourceInstanceId,
                sourceNoteId: source.id,
                sourceAuthorId: source.createdById,
              }
            : {
                parentId:
                  mapping?.action === "review_existing"
                    ? mapping.targetId
                    : null,
                title: source.title,
                dueAt: source.dueAt,
                completed: source.completed,
                createdAt: source.createdAt,
                updatedAt: source.updatedAt,
                createdById: actor(source.createdById),
                assignedToId: actor(source.assignedToId),
                sourceInstanceId: input.sourceInstanceId,
                sourceTaskId: source.id,
                sourceCreatedById: source.createdById,
                sourceAssignedToId: source.assignedToId,
              };
      records.push({
        collection,
        sourceId: source.id,
        entity,
        kind,
        sourceParentId,
        targetId:
          mapping?.action === "review_existing" ? mapping.targetId : null,
        sourceDigest,
        sourceSnapshot: canonical(source),
        nativeProjection,
        blockers,
        action: blockers.length
          ? "blocked"
          : kind === "parent"
            ? "preserve_parent_snapshot"
            : "review_native_projection",
      });
    }
  records.sort(
    (a, b) =>
      a.collection.localeCompare(b.collection, "en") ||
      a.sourceId.localeCompare(b.sourceId, "en"),
  );
  const manifest = {
    schemaVersion: 1,
    mode: "payload_preservation_preview",
    sourceInstanceId: input.sourceInstanceId,
    sourceContentSha256: digestCrmValue(
      Object.fromEntries(
        Object.entries(input.records).map(([key, rows]) => [
          key,
          [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
        ]),
      ),
    ),
    counts: {
      ...Object.fromEntries(
        Object.entries(input.records).map(([k, v]) => [k, v.length]),
      ),
      blocked: records.filter((r) => r.blockers.length).length,
    },
    reconciliation,
    records,
    automaticImportAllowed: false,
    releaseApproval: false,
  };
  manifest.manifestSha256 = digestCrmValue(manifest);
  return manifest;
}
export async function main(args) {
  if (args.length !== 4 || args[0] !== "--input" || args[2] !== "--output")
    throw Error("Use --input export.json --output manifest.json");
  if (args[1] === args[3]) throw Error("Separate output required");
  if ((await stat(args[1])).size > 32 * 1024 * 1024)
    throw Error("Export exceeds 32 MiB");
  const raw = await readFile(args[1]);
  if (raw.length > 32 * 1024 * 1024) throw Error("Export exceeds 32 MiB");
  const manifest = prepareCrmPayloads(JSON.parse(raw.toString("utf8")));
  manifest.inputFileSha256 = createHash("sha256").update(raw).digest("hex");
  await writeFile(args[3], JSON.stringify(manifest, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  return manifest.counts;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2))
    .then((counts) => process.stdout.write(JSON.stringify(counts) + "\n"))
    .catch(() => {
      process.stderr.write(
        "CRM payload preparation failed. Check the export contract and use a new output path.\n",
      );
      process.exitCode = 1;
    });
