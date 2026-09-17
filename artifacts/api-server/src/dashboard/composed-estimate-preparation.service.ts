import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { Actor } from "./access";
import { propertyAccess } from "./access";
import { transaction } from "./database";
import { HttpError, requireCapability } from "./policy";
import {
  contextSnapshot,
  presentComposition,
} from "./agreement-composition.service";
import { compositionContext } from "./agreement-composition.contract";
import { compositionPreparation } from "./composed-estimate-preparation.contract";
import { prepareCompositionDocument } from "./composed-estimate-preparation";
import { validatePdfText } from "./estimate-pdf";

/** Internal until composed customer rendering and multi-component approval are
 * integrated. Do not mount a preparation endpoint ahead of those consumers. */
export async function prepareComposedEstimate(
  actor: Actor,
  id: string,
  raw: unknown,
) {
  requireCapability(actor, "revenue.sales");
  const input = compositionPreparation.parse(raw);
  input.schedules.sort((a, b) => a.basis.localeCompare(b.basis));
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  return transaction(async (c) => {
    const row = (
      await c.query(
        "SELECT * FROM agreement_composition_draft WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!row) throw new HttpError(404, "Agreement draft not found");
    if (row.status === "prepared") {
      if (row.preparation_fingerprint !== fingerprint)
        throw new HttpError(
          409,
          "This draft already prepared a different proposal. Open that proposal before making another revision.",
        );
      return {
        draft: presentComposition(row),
        estimateId: row.estimate_id,
        created: false,
      };
    }
    const document = prepareCompositionDocument(row, input);
    if (!row.client_id || !row.property_id)
      throw new HttpError(
        409,
        "Onboard the client and select an operational property before preparing this proposal.",
      );
    await propertyAccess(actor, row.property_id);
    const context = compositionContext.parse({
      clientId: row.client_id,
      propertyId: row.property_id,
      leadId: row.lead_id,
      sourceEstimateId: row.source_estimate_id,
    });
    const current = await contextSnapshot(c, context);
    if (!isDeepStrictEqual(current, row.context_snapshot))
      throw new HttpError(
        409,
        "Client or property details changed. Refresh the draft context and review pricing again.",
      );
    if (
      !(
        await c.query(
          "SELECT 1 FROM property WHERE id=$1 AND client_id=$2 AND lifecycle='operational' AND archived=false FOR SHARE",
          [row.property_id, row.client_id],
        )
      ).rowCount
    )
      throw new HttpError(
        409,
        "Choose an active operational property for this client.",
      );
    if (
      input.projectId &&
      !(
        await c.query(
          "SELECT 1 FROM project_property WHERE project_id=$1 AND property_id=$2 FOR SHARE",
          [input.projectId, row.property_id],
        )
      ).rowCount
    )
      throw new HttpError(409, "Choose a project that includes this property.");
    // Validate every customer-visible source string, including all structured
    // notes and units, before sealing an otherwise uneditable proposal.
    const customerStrings: string[] = [];
    const collect = (value: unknown) => {
      if (typeof value === "string") customerStrings.push(value);
      else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object")
        Object.values(value).forEach(collect);
    };
    collect([row.title, current, document.content, document.dates]);
    validatePdfText(customerStrings.map((text) => ({ text })));
    const estimateId = randomUUID();
    const scope = [
      ...document.content.scope.items.map((item) =>
        [item.title, item.description].filter(Boolean).join("\n"),
      ),
      document.content.notes.scope,
      document.content.scope.exclusions
        ? `Exclusions\n${document.content.scope.exclusions}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    await c.query(
      "INSERT INTO estimate(id,property_id,title,scope,amount_cents,created_by,project_id,kind,terms,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,'composed',$8,now()+($9::integer * interval '1 day'))",
      [
        estimateId,
        row.property_id,
        row.title,
        scope,
        document.authorizedAmountCents,
        actor.id,
        input.projectId,
        document.content.terms,
        input.validForDays,
      ],
    );
    const labels = {
      one_time: "One-time work",
      fixed_monthly: "Monthly services",
      per_visit: "Per-visit services",
    };
    const allocations = [];
    for (const allocation of document.allocations) {
      const allocationId = randomUUID();
      await c.query(
        "INSERT INTO estimate_allocation(id,estimate_id,basis,title,scope,amount_cents,scope_row_ids,cost_row_ids,configuration) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          allocationId,
          estimateId,
          allocation.basis,
          labels[allocation.basis],
          allocation.scope,
          allocation.authorizedAmountCents,
          allocation.scopeRowIds,
          allocation.costRowIds,
          allocation.configuration,
        ],
      );
      allocations.push({
        ...allocation,
        id: allocationId,
        title: labels[allocation.basis],
      });
    }
    for (const [position, item] of document.content.costs.items.entries()) {
      const allocation = allocations.find(
        (candidate) => candidate.basis === item.basis,
      )!;
      await c.query(
        "INSERT INTO estimate_line_item(id,estimate_id,position,description,unit,quantity,unit_price_cents,billing_basis,source_row_id,estimate_allocation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [
          randomUUID(),
          estimateId,
          position,
          item.description,
          item.unit || null,
          item.quantity,
          item.unitPriceCents,
          item.basis,
          item.id,
          allocation.id,
        ],
      );
    }
    const snapshot = {
      schemaVersion: 1,
      draftId: id,
      sourceVersion: row.version,
      party: {
        clientId: row.client_id,
        propertyId: row.property_id,
        ...current,
      },
      content: document.content,
      dates: document.dates,
      sourceTemplates: row.source_templates,
      pricingPlan: row.pricing_plan,
      allocations,
    };
    await c.query("UPDATE estimate SET composition_snapshot=$2 WHERE id=$1", [
      estimateId,
      snapshot,
    ]);
    const version = row.version + 1;
    const plan = {
      ...row.pricing_plan,
      sourceVersion: version,
      review: { ...document.review, sourceVersion: version },
    };
    const saved = (
      await c.query(
        "UPDATE agreement_composition_draft SET status='prepared',estimate_id=$2,preparation_fingerprint=$3,version=$4,pricing_plan=$5,updated_at=now() WHERE id=$1 RETURNING *",
        [id, estimateId, fingerprint, version, plan],
      )
    ).rows[0];
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'agreement-draft.prepared',$3,$4)",
      [
        randomUUID(),
        actor.id,
        id,
        {
          estimateId,
          sourceVersion: row.version,
          version,
          authorizedAmountCents: document.authorizedAmountCents,
          bases: allocations.map((allocation) => allocation.basis),
        },
      ],
    );
    return { draft: presentComposition(saved), estimateId, created: true };
  });
}
