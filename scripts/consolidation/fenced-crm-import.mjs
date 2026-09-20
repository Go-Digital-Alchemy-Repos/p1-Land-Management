import { readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  reviewedCrmImportPlan,
  importCrmPayloads,
} from "./import-crm-payloads.mjs";
import { exportCrmPayloads } from "./export-crm-payloads.mjs";
import { parseCrmJson, digestCrmValue } from "./prepare-crm-payloads.mjs";
import { verifyCrmImport } from "./verify-crm-import.mjs";
const fail = (code) => {
  throw Error(code);
};

/** Source locks are a temporary, exact-batch fence, not permanent legacy retirement. */
export async function fencedCrmImport(
  sourcePool,
  targetPool,
  input,
  review,
  { dryRun = true, sourceInstanceId, sourceTimezone } = {},
) {
  if (
    typeof dryRun !== "boolean" ||
    sourceInstanceId !== input.sourceInstanceId ||
    sourceTimezone !== "UTC"
  )
    fail("crm_fence_explicit_source_required");
  const plan = reviewedCrmImportPlan(input, review);
  if (
    review.schemaVersion !== 2 ||
    !input.records.leads.length ||
    input.records.leads.length > 100 ||
    Object.entries(input.records).some(([k, v]) => k !== "leads" && v.length)
  )
    fail("crm_fence_lead_only_batch_required");
  const leads = input.records.leads.map((r) => r.id).sort();
  const submissions = input.records.leads.map((r) => r.formSubmissionId).sort();
  if (
    submissions.some((id) => !id) ||
    new Set(submissions).size !== submissions.length
  )
    fail("crm_fence_distinct_submissions_required");
  const additive = new Set(review.inquiryMappings.map((m) => m.sourceId));
  const additiveSubmissions = new Set(
    input.records.leads
      .filter((r) => additive.has(r.id))
      .map((r) => r.formSubmissionId),
  );
  const source = await sourcePool.connect();
  let targetStarted = false,
    sourceLost = false,
    targetResult,
    verification,
    fenceId;
  const lost = () => {
    sourceLost = true;
  };
  source.on?.("error", lost);
  const check = async () => {
    if (sourceLost) fail("crm_fence_source_lost");
    const status = (
      await source.query(
        "SELECT current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') read_only,pg_current_xact_id()::text fence_id",
      )
    ).rows[0];
    if (
      status.fence_id !== fenceId ||
      status.isolation !== "read committed" ||
      status.read_only !== "off"
    )
      fail("crm_fence_transaction_lost");
  };
  // Check the held source connection before each target statement, including COMMIT.
  // This reduces the failure window but is explicitly not distributed atomic commit.
  const guardedTarget = {
    async connect() {
      const c = await targetPool.connect();
      return {
        async query(...args) {
          if (/^(ROLLBACK)/i.test(String(args[0]))) return c.query(...args);
          await check();
          return c.query(...args);
        },
        release: (...args) => c.release(...args),
      };
    },
  };
  try {
    await source.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    fenceId = (await source.query("SELECT pg_current_xact_id()::text id"))
      .rows[0].id;
    await source.query("SET LOCAL lock_timeout='5s'");
    await source.query("SET LOCAL statement_timeout='15s'");
    await source.query("SET LOCAL idle_in_transaction_session_timeout='90s'");
    const forms = (
      await source.query(
        "SELECT DISTINCT form_id FROM cms_form_submissions WHERE id=ANY($1::varchar[]) ORDER BY form_id",
        [submissions],
      )
    ).rows.map((r) => r.form_id);
    if (!forms.length) fail("crm_fence_submissions_missing");
    await source.query(
      "SELECT id FROM cms_forms WHERE id=ANY($1::varchar[]) ORDER BY id FOR SHARE",
      [forms],
    );
    const jobs = (
      await source.query(
        "SELECT id,submission_id,status,payload->>'kind' kind FROM cms_form_effect_jobs WHERE submission_id=ANY($1::varchar[]) ORDER BY id FOR UPDATE",
        [submissions],
      )
    ).rows;
    if (jobs.some((j) => !["completed", "skipped"].includes(j.status)))
      fail("crm_fence_effect_pending");
    if (
      jobs.some(
        (j) =>
          additiveSubmissions.has(j.submission_id) &&
          j.kind === "commercial_dashboard_intake",
      )
    )
      fail("crm_fence_additive_handoff_exists");
    const lockedSubmissions = (
      await source.query(
        "SELECT id,form_id FROM cms_form_submissions WHERE id=ANY($1::varchar[]) ORDER BY id FOR UPDATE",
        [submissions],
      )
    ).rows;
    if (
      lockedSubmissions.length !== submissions.length ||
      lockedSubmissions.some((r) => !forms.includes(r.form_id))
    )
      fail("crm_fence_submission_changed");
    const slugs = (
      await source.query(
        "SELECT s.id,f.slug FROM cms_form_submissions s JOIN cms_forms f ON f.id=s.form_id WHERE s.id=ANY($1::varchar[]) ORDER BY s.id",
        [submissions],
      )
    ).rows;
    if (
      slugs.some(
        (r) => additiveSubmissions.has(r.id) && r.slug !== "p1-estimate",
      )
    )
      fail("crm_fence_additive_form_not_generic");
    const recheckedJobs = (
      await source.query(
        "SELECT id FROM cms_form_effect_jobs WHERE submission_id=ANY($1::varchar[]) ORDER BY id",
        [submissions],
      )
    ).rows;
    if (
      digestCrmValue(recheckedJobs) !==
      digestCrmValue(jobs.map((j) => ({ id: j.id })))
    )
      fail("crm_fence_effect_set_changed");
    const lockedLeads = (
      await source.query(
        "SELECT id,form_submission_id FROM crm_leads WHERE id=ANY($1::varchar[]) ORDER BY id FOR UPDATE",
        [leads],
      )
    ).rows;
    if (
      lockedLeads.length !== leads.length ||
      lockedLeads.some(
        (r) =>
          input.records.leads.find((l) => l.id === r.id)?.formSubmissionId !==
          r.form_submission_id,
      )
    )
      fail("crm_fence_lead_changed");
    for (const [table, column] of [
      ["crm_clients", "source_lead_id"],
      ["crm_lead_notes", "lead_id"],
      ["crm_lead_tasks", "lead_id"],
    ]) {
      if (
        (
          await source.query(
            `SELECT id FROM ${table} WHERE ${column}=ANY($1::varchar[]) LIMIT 1`,
            [leads],
          )
        ).rowCount
      )
        fail("crm_fence_relationship_changed");
    }
    await check();
    // Exporter uses independent read-only snapshots and validates all six tables,
    // columns, exact timestamps and JSON. The selected rows cannot change meanwhile.
    const fresh = await exportCrmPayloads(sourcePool, targetPool, {
      sourceInstanceId,
      sourceTimezone,
    });
    if (
      fresh.manifest.sourceContentSha256 !== plan.sourceContentSha256 ||
      digestCrmValue(fresh.input.targetInventory.identityLinks) !==
        digestCrmValue(input.targetInventory.identityLinks)
    )
      fail("crm_fence_source_snapshot_changed");
    await check();
    targetStarted = true;
    targetResult = await importCrmPayloads(guardedTarget, input, review, {
      dryRun,
    });
    if (!dryRun) {
      verification = await verifyCrmImport(guardedTarget, input, review);
      if (!verification.verified)
        fail("crm_fence_target_reconciliation_required");
    }
    await check();
    await source.query("ROLLBACK"); // source writes are never performed
    return {
      schemaVersion: 1,
      mode: dryRun ? "dry-run" : "apply",
      sourceContentSha256: plan.sourceContentSha256,
      manifestSha256: plan.manifestSha256,
      sourceFence: "released_after_target_check",
      targetResult,
      verified: verification?.verified ?? null,
      sourceRetired: false,
      releaseApproval: false,
    };
  } catch (error) {
    try {
      await source.query("ROLLBACK");
    } catch {
      sourceLost = true;
    }
    const result = Error(
      targetStarted
        ? "crm_fence_target_outcome_requires_exact_reconciliation"
        : /^crm_/.test(error.message)
          ? error.message
          : "crm_fence_source_check_failed",
    );
    result.targetMayHaveCommitted = targetStarted && !dryRun;
    throw result;
  } finally {
    source.off?.("error", lost);
    source.release(
      sourceLost ? Error("Source fence connection lost") : undefined,
    );
  }
}
async function privateJson(path) {
  if ((await stat(path)).size > 32 * 1024 * 1024) fail("crm_fence_input_limit");
  const raw = await readFile(path);
  if (raw.length > 32 * 1024 * 1024) fail("crm_fence_input_limit");
  return parseCrmJson(raw);
}
export async function main(args) {
  if (
    ![6, 8].includes(args.length) ||
    args[0] !== "--input" ||
    args[2] !== "--review" ||
    args[4] !== "--output" ||
    (args.length === 8 &&
      (args[6] !== "--mode" || !["dry-run", "apply"].includes(args[7]))) ||
    !process.env.CORE_DATABASE_URL ||
    !process.env.DASHBOARD_DATABASE_URL ||
    args[5] === args[1] ||
    args[5] === args[3]
  )
    fail("crm_fence_arguments");
  const require = createRequire(
    new URL("../../artifacts/api-server/package.json", import.meta.url),
  );
  const { Pool } = require("pg");
  const source = new Pool({
    connectionString: process.env.CORE_DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 10000,
  });
  const target = new Pool({
    connectionString: process.env.DASHBOARD_DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 10000,
  });
  // Reserve output before touching databases; failure evidence survives uncertain COMMIT.
  await writeFile(
    args[5],
    JSON.stringify({ status: "not_completed", targetOutcome: "unconfirmed" }) +
      "\n",
    { flag: "wx", mode: 0o600 },
  );
  try {
    const result = await fencedCrmImport(
      source,
      target,
      await privateJson(args[1]),
      await privateJson(args[3]),
      {
        dryRun: args[7] !== "apply",
        sourceInstanceId: process.env.CRM_SOURCE_INSTANCE_ID,
        sourceTimezone: process.env.CRM_SOURCE_TIMEZONE,
      },
    );
    await writeFile(args[5], JSON.stringify(result, null, 2) + "\n", {
      mode: 0o600,
    });
    return result;
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2))
    .then((r) => console.log(JSON.stringify(r)))
    .catch(() => {
      console.error(
        "Fenced CRM run not confirmed. Retain the exact reviewed plan and reconcile target state before retrying; never compensate by deleting imported records.",
      );
      process.exitCode = 1;
    });
