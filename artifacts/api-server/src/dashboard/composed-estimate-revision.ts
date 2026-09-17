import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { isDeepStrictEqual } from "node:util";
import type { Actor } from "./access";
import { transaction } from "./database";
import { HttpError, requireCapability } from "./policy";
import { composedEstimateDocument } from "./composed-estimate-document";
import {
  compositionContent,
  previewComposition,
} from "./agreement-composition.contract";
import { presentComposition } from "./agreement-composition.service";
const revisionRequest = z
  .object({
    operationId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
  })
  .strict();
/** Create editable client-specific content from exactly the frozen proposal.
 * Supersession happens only when its replacement is successfully prepared. */
export async function createComposedRevision(
  actor: Actor,
  estimateId: string,
  raw: unknown,
) {
  requireCapability(actor, "revenue.sales");
  const input = revisionRequest.parse(raw);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ kind: "composed-revision", estimateId, ...input }))
    .digest("hex");
  return transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 91315))", [
      `${actor.id}:${input.operationId}`,
    ]);
    const existing = (
      await c.query(
        "SELECT * FROM agreement_composition_draft WHERE created_by=$1 AND creation_key=$2",
        [actor.id, input.operationId],
      )
    ).rows[0];
    if (existing) {
      if (existing.creation_fingerprint !== fingerprint)
        throw new HttpError(
          409,
          "This operation already created a different draft",
        );
      return { draft: presentComposition(existing), created: false };
    }
    const source = (
      await c.query("SELECT * FROM estimate WHERE id=$1 FOR UPDATE", [
        estimateId,
      ])
    ).rows[0];
    if (!source || source.kind !== "composed")
      throw new HttpError(404, "Composed proposal not found");
    if (!source.is_current || source.revision !== input.expectedRevision)
      throw new HttpError(409, "The proposal changed. Reload before revising");
    if (source.status === "approved")
      throw new HttpError(409, "Approved scope requires a change order");
    const { party } = composedEstimateDocument(source.composition_snapshot);
    const frozen = source.composition_snapshot;
    const original = (
      await c.query(
        "SELECT * FROM agreement_composition_draft WHERE id=$1 AND estimate_id=$2 AND status='prepared'",
        [frozen.draftId, source.id],
      )
    ).rows[0];
    const originalMatches =
      original &&
      isDeepStrictEqual(
        previewComposition(
          original.content,
          original.context_snapshot,
          original.dates,
        ).content,
        frozen.content,
      );
    const content = compositionContent.parse(
      originalMatches
        ? original.content
        : {
            ...frozen.content,
            costs: {
              items: frozen.content.costs.items.map(
                ({ totalCents, ...item }: any) => item,
              ),
            },
          },
    );
    content.scope.items = content.scope.items.map((row) => ({
      ...row,
      id: randomUUID(),
    }));
    content.costs.items = content.costs.items.map((row) => ({
      ...row,
      id: randomUUID(),
    }));
    const id = randomUUID();
    const row = (
      await c.query(
        "INSERT INTO agreement_composition_draft(id,title,client_id,property_id,source_estimate_id,revises_estimate_id,revises_estimate_revision,content,dates,source_templates,context_snapshot,created_by,creation_key,creation_fingerprint,lead_id) VALUES($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *",
        [
          id,
          source.title,
          party.clientId,
          party.propertyId,
          source.id,
          source.revision,
          content,
          frozen.dates,
          JSON.stringify(frozen.sourceTemplates),
          {
            "client.name": party.clientName,
            "client.billing_address": party.billingAddress,
            "property.name": party.propertyName,
            "property.address": party.address,
          },
          actor.id,
          input.operationId,
          fingerprint,
          originalMatches ? original.lead_id : null,
        ],
      )
    ).rows[0];
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'agreement-draft.revision_started',$3,$4)",
      [randomUUID(), actor.id, id, { estimateId, revision: source.revision }],
    );
    return { draft: presentComposition(row), created: true };
  });
}
