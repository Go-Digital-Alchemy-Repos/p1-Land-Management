import type { PoolClient } from "pg";
import { createHash, randomUUID } from "node:crypto";
import type { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
import {
  compositionCreate,
  compositionEdit,
  compositionContext,
  compositionSelection,
  compositionContent,
  previewComposition,
  compositionTemplateReview,
  compositionTemplateApply,
} from "./agreement-composition.contract";

type TemplateSnapshot = {
  id: string;
  kind: "msa" | "scope" | "cost" | "package";
  version: number;
  name: string;
  body: string;
  payload: Record<string, unknown>;
};
async function audit(
  c: PoolClient,
  userId: string,
  action: string,
  key: string,
  details: unknown = {},
) {
  await c.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
    [
      randomUUID(),
      userId,
      `agreement-draft.${action}`,
      key,
      JSON.stringify(details),
    ],
  );
}
async function contextSnapshot(
  c: PoolClient,
  context: z.infer<typeof compositionContext>,
) {
  const client = context.clientId
    ? (
        await c.query(
          "SELECT name,billing_address FROM client WHERE id=$1 AND archived=false FOR SHARE",
          [context.clientId],
        )
      ).rows[0]
    : null;
  if (context.clientId && !client) throw new HttpError(404, "Client not found");
  const lead = context.leadId
    ? (
        await c.query(
          "SELECT id,property_id,organization_id FROM lead WHERE id=$1 FOR SHARE",
          [context.leadId],
        )
      ).rows[0]
    : null;
  if (context.leadId && !lead) throw new HttpError(404, "Inquiry not found");
  const organization = lead?.organization_id
    ? (
        await c.query(
          "SELECT client_id FROM business_organization WHERE id=$1 FOR SHARE",
          [lead.organization_id],
        )
      ).rows[0]
    : null;
  if (
    organization?.client_id &&
    context.clientId &&
    organization.client_id !== context.clientId
  )
    throw new HttpError(409, "Inquiry belongs to a different client");
  if (
    lead?.property_id &&
    context.propertyId &&
    lead.property_id !== context.propertyId
  )
    throw new HttpError(
      409,
      "Inquiry is already linked to a different property",
    );
  const inquiryProperty = lead?.property_id
    ? (
        await c.query("SELECT client_id FROM property WHERE id=$1 FOR SHARE", [
          lead.property_id,
        ])
      ).rows[0]
    : null;
  if (
    inquiryProperty?.client_id &&
    context.clientId &&
    inquiryProperty.client_id !== context.clientId
  )
    throw new HttpError(409, "Inquiry property belongs to a different client");
  const property = context.propertyId
    ? (
        await c.query(
          "SELECT name,address,client_id,lifecycle FROM property WHERE id=$1 AND archived=false FOR SHARE",
          [context.propertyId],
        )
      ).rows[0]
    : null;
  if (context.propertyId && !property)
    throw new HttpError(404, "Property not found");
  if (
    property &&
    (property.lifecycle === "operational"
      ? property.client_id !== context.clientId
      : !lead || lead.property_id !== context.propertyId || !!context.clientId)
  )
    throw new HttpError(
      409,
      "Property does not match this draft's client or inquiry",
    );
  if (context.sourceEstimateId) {
    const estimate = (
      await c.query("SELECT property_id FROM estimate WHERE id=$1 FOR SHARE", [
        context.sourceEstimateId,
      ])
    ).rows[0];
    if (
      !estimate ||
      !context.propertyId ||
      estimate.property_id !== context.propertyId
    )
      throw new HttpError(
        409,
        "Source estimate must belong to the selected property",
      );
  }
  return {
    "client.name": client?.name ?? null,
    "client.billing_address": client?.billing_address ?? null,
    "property.name": property?.name ?? null,
    "property.address": property?.address ?? null,
  };
}
async function selectTemplates(
  c: PoolClient,
  selection: z.infer<typeof compositionSelection>,
) {
  const sources: TemplateSnapshot[] = [];
  async function read(key: string, kind: TemplateSnapshot["kind"]) {
    const row = (
      await c.query<TemplateSnapshot & { status: string }>(
        "SELECT id,kind,version,name,body,payload,status FROM agreement_template WHERE id=$1 FOR SHARE",
        [key],
      )
    ).rows[0];
    if (!row || row.kind !== kind || row.status !== "published")
      throw new HttpError(409, `Choose a published ${kind} template`);
    const { status, ...snapshot } = row;
    sources.push(snapshot);
    return snapshot;
  }
  let selected = selection;
  if (selection.packageId) {
    const packageRow = await read(selection.packageId, "package");
    selected = {
      packageId: packageRow.id,
      msaId: packageRow.payload.msaId as string,
      scopeId: packageRow.payload.scopeId as string,
      costId: packageRow.payload.costId as string,
    };
  }
  const msa = selected.msaId ? await read(selected.msaId, "msa") : null;
  const scope = selected.scopeId ? await read(selected.scopeId, "scope") : null;
  const cost = selected.costId ? await read(selected.costId, "cost") : null;
  const content = compositionContent.parse({
    terms: msa?.body || "",
    scope: scope?.payload || { items: [], exclusions: "" },
    costs: cost?.payload || { items: [] },
    notes: {
      scope: scope?.body || "",
      cost: cost?.body || "",
      package: sources.find((row) => row.kind === "package")?.body || "",
    },
  });
  // Client rows have their own identities; they never mutate template rows.
  content.scope.items = content.scope.items.map((row) => ({
    ...row,
    id: randomUUID(),
  }));
  content.costs.items = content.costs.items.map((row) => ({
    ...row,
    id: randomUUID(),
  }));
  return { sources, content };
}
export function presentComposition(row: any) {
  const { creation_key, creation_fingerprint, ...view } = row;
  try {
    return {
      ...view,
      preview: previewComposition(row.content, row.context_snapshot, row.dates),
    };
  } catch (error) {
    throw new HttpError(400, (error as Error).message);
  }
}
export async function readComposition(key: string) {
  const row = (
    await pool.query("SELECT * FROM agreement_composition_draft WHERE id=$1", [
      key,
    ])
  ).rows[0];
  if (!row) throw new HttpError(404, "Agreement draft not found");
  return presentComposition(row);
}
export async function createComposition(userId: string, raw: unknown) {
  const b = compositionCreate.parse(raw),
    fingerprint = createHash("sha256").update(JSON.stringify(b)).digest("hex");
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 91315))", [
      `${userId}:${b.operationId}`,
    ]);
    const existing = (
      await c.query(
        "SELECT * FROM agreement_composition_draft WHERE created_by=$1 AND creation_key=$2",
        [userId, b.operationId],
      )
    ).rows[0];
    if (existing) {
      if (existing.creation_fingerprint !== fingerprint)
        throw new HttpError(
          409,
          "Draft creation key was already used for another request",
        );
      return presentComposition(existing);
    }
    const context = await contextSnapshot(c, b.context),
      selected = await selectTemplates(c, b.selection),
      key = randomUUID();
    const row = (
      await c.query(
        `INSERT INTO agreement_composition_draft(id,title,client_id,property_id,lead_id,source_estimate_id,content,dates,source_templates,context_snapshot,created_by,creation_key,creation_fingerprint)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          key,
          b.title,
          b.context.clientId,
          b.context.propertyId,
          b.context.leadId,
          b.context.sourceEstimateId,
          JSON.stringify(selected.content),
          JSON.stringify(b.dates),
          JSON.stringify(selected.sources),
          JSON.stringify(context),
          userId,
          b.operationId,
          fingerprint,
        ],
      )
    ).rows[0];
    const result = presentComposition(row);
    await audit(c, userId, "created", key, {
      sources: selected.sources.map((row) => ({
        id: row.id,
        version: row.version,
      })),
    });
    return result;
  });
}
export async function editComposition(
  userId: string,
  key: string,
  raw: unknown,
) {
  const b = compositionEdit.parse(raw);
  return transaction(async (c) => {
    const old = (
      await c.query(
        "SELECT * FROM agreement_composition_draft WHERE id=$1 FOR UPDATE",
        [key],
      )
    ).rows[0];
    if (!old) throw new HttpError(404, "Agreement draft not found");
    if (old.version !== b.expectedVersion || old.status !== "draft")
      throw new HttpError(
        409,
        "Draft changed or was prepared. Reload before editing.",
      );
    const row = (
      await c.query(
        "UPDATE agreement_composition_draft SET title=$2,content=$3,dates=$4,version=version+1,updated_at=now() WHERE id=$1 RETURNING *",
        [key, b.title, JSON.stringify(b.content), JSON.stringify(b.dates)],
      )
    ).rows[0];
    const result = presentComposition(row);
    await audit(c, userId, "updated", key, { version: row.version });
    return result;
  });
}

export async function changeCompositionContext(
  userId: string,
  key: string,
  expectedVersion: number,
  raw: unknown,
) {
  const context = compositionContext.parse(raw);
  return transaction(async (c) => {
    const old = (
      await c.query(
        "SELECT * FROM agreement_composition_draft WHERE id=$1 FOR UPDATE",
        [key],
      )
    ).rows[0];
    if (!old) throw new HttpError(404, "Agreement draft not found");
    if (old.version !== expectedVersion || old.status !== "draft")
      throw new HttpError(
        409,
        "Draft changed or was prepared. Reload before changing context.",
      );
    const snapshot = await contextSnapshot(c, context);
    const row = (
      await c.query(
        "UPDATE agreement_composition_draft SET client_id=$2,property_id=$3,lead_id=$4,source_estimate_id=$5,context_snapshot=$6,version=version+1,updated_at=now() WHERE id=$1 RETURNING *",
        [
          key,
          context.clientId,
          context.propertyId,
          context.leadId,
          context.sourceEstimateId,
          JSON.stringify(snapshot),
        ],
      )
    ).rows[0];
    await audit(c, userId, "context-changed", key, { version: row.version });
    return presentComposition(row);
  });
}

/** Preview and apply both resolve current published sources under the same locks.
 * The token binds the exact reviewed source snapshots, selection and draft version.
 * It is a consistency token, not an authorization credential.
 */
export async function replaceCompositionTemplates(
  userId: string,
  key: string,
  raw: unknown,
  apply: boolean,
) {
  const b = apply
    ? compositionTemplateApply.parse(raw)
    : compositionTemplateReview.parse(raw);
  return transaction(async (c) => {
    const old = (
      await c.query(
        "SELECT * FROM agreement_composition_draft WHERE id=$1 FOR UPDATE",
        [key],
      )
    ).rows[0];
    if (!old) throw new HttpError(404, "Agreement draft not found");
    if (old.status !== "draft" || old.version !== b.expectedVersion)
      throw new HttpError(
        409,
        "Draft changed or was prepared. Reload and compare again.",
      );
    const selected = await selectTemplates(c, b.selection);
    const kinds = {
      terms: "msa",
      scope: "scope",
      costs: "cost",
      packageNotes: "package",
    } as const;
    for (const section of b.sections) {
      if (!selected.sources.some((source) => source.kind === kinds[section]))
        throw new HttpError(
          400,
          `Choose a published ${kinds[section]} template for ${section}`,
        );
    }
    const content = compositionContent.parse(structuredClone(old.content));
    for (const section of b.sections) {
      if (section === "terms") content.terms = selected.content.terms;
      if (section === "scope") {
        content.scope = selected.content.scope;
        content.notes.scope = selected.content.notes.scope;
      }
      if (section === "costs") {
        content.costs = selected.content.costs;
        content.notes.cost = selected.content.notes.cost;
      }
      if (section === "packageNotes")
        content.notes.package = selected.content.notes.package;
    }
    const reviewToken = createHash("sha256")
      .update(
        JSON.stringify({
          id: key,
          version: old.version,
          selection: b.selection,
          sections: b.sections,
          sources: selected.sources,
        }),
      )
      .digest("hex");
    const reviewed = presentComposition({ ...old, content });
    if (!apply)
      return {
        draftId: key,
        expectedVersion: old.version,
        reviewToken,
        sections: b.sections,
        before: old.content,
        after: content,
        preview: reviewed.preview,
        sources: selected.sources,
      };
    if (!("reviewToken" in b) || b.reviewToken !== reviewToken)
      throw new HttpError(
        409,
        "Template selection changed. Compare the proposed replacement again.",
      );
    // Keep an immutable source history, including sources of overwritten sections.
    // Only the kinds actually applied (and their selected package) enter that history.
    const applied = selected.sources.filter(
      (source) =>
        source.kind === "package" ||
        b.sections.some((section) => kinds[section] === source.kind),
    );
    const history: TemplateSnapshot[] = [...old.source_templates];
    for (const source of applied)
      if (!history.some((item) => item.id === source.id)) history.push(source);
    const row = (
      await c.query(
        "UPDATE agreement_composition_draft SET content=$2,source_templates=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *",
        [key, JSON.stringify(content), JSON.stringify(history)],
      )
    ).rows[0];
    await audit(c, userId, "templates-replaced", key, {
      version: row.version,
      previousVersion: old.version,
      sections: b.sections,
      sources: applied.map((source) => ({
        id: source.id,
        version: source.version,
      })),
      reviewToken,
    });
    return presentComposition(row);
  });
}
