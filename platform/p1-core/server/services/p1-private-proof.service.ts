import { createHash } from "node:crypto";
import {
  PRIVATE_PROOF_KEY,
  PRIVATE_PROOF_CATEGORY,
  proofCategories,
  emptyProofDraft,
  proofActionSchema,
  type ProofInventory,
} from "@shared/p1-private-proof";
import { storage } from "../storage";
export class ProofError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const emptyInventory = (): ProofInventory => ({
  revision: 0,
  records: proofCategories.map((category) => ({
    category,
    draft: { ...emptyProofDraft },
    status: "draft",
  })),
  history: [],
});
export function applyProofAction(
  current: ProofInventory,
  input: unknown,
  actor: { id: string; role: string },
): ProofInventory {
  const data = proofActionSchema.parse(input);
  if (data.action !== "save" && actor.role !== "admin")
    throw new ProofError(403, "Administrator review required");
  if (data.revision !== current.revision)
    throw new ProofError(
      409,
      "This inventory changed. Your inputs are retained; reload the latest version before applying your edits.",
    );
  // Never discard history to make room for a write. An explicit archival process is required.
  if (current.history.length >= 10000)
    throw new ProofError(
      409,
      "Audit history capacity reached. Contact the administrator to arrange archival.",
    );
  const next = structuredClone(current);
  const record = next.records[data.index];
  if (data.action === "save") {
    if (!data.draft) throw new ProofError(400, "Draft fields required");
    record.draft = data.draft;
    record.status = "draft";
    delete record.reviewedRevision;
    delete record.reviewer;
    delete record.reviewedAt;
  } else {
    if (data.draft) throw new ProofError(400, "Save draft changes before review");
    const d = record.draft;
    if (
      data.action === "approve" &&
      (!d.title ||
        !d.scope ||
        (!d.sourceUrl && !d.privateReference) ||
        !d.sourceOwner ||
        !d.technicalReviewer ||
        !d.reviewedDate ||
        d.permission !== "granted" ||
        !d.permissionScope ||
        (!d.publicExcerpt && !d.approvedAssetReference) ||
        (d.expiryDate && d.expiryDate < new Date().toISOString().slice(0, 10)))
    )
      throw new ProofError(
        400,
        "Approval requires current provenance, review, permission scope and an approved excerpt or asset reference.",
      );
    record.status = data.action === "approve" ? "approved" : "revoked";
    record.reviewedRevision = current.revision + 1;
    record.reviewer = actor.id;
    record.reviewedAt = new Date().toISOString();
  }
  next.revision++;
  next.history.push({
    action: data.action,
    category: record.category,
    actor: actor.id,
    at: new Date().toISOString(),
    revision: next.revision,
    draftDigest: createHash("sha256").update(JSON.stringify(record.draft)).digest("hex"),
  });
  return next;
}
export async function getPrivateProof() {
  // Bypass process-local caches so all editors receive the current committed revision.
  return (
    ((await storage.settings.readPrivateJson(
      PRIVATE_PROOF_KEY,
      PRIVATE_PROOF_CATEGORY,
    )) as ProofInventory) || emptyInventory()
  );
}
export async function updatePrivateProof(input: unknown, actor: { id: string; role: string }) {
  return storage.settings.updatePrivateJson(PRIVATE_PROOF_KEY, PRIVATE_PROOF_CATEGORY, (current) =>
    applyProofAction((current as ProofInventory) || emptyInventory(), input, actor),
  );
}
