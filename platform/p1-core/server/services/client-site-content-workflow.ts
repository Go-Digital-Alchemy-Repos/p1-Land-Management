import type { ClientSiteContent } from "@shared/schema";

export class ClientSiteContentConflictError extends Error {}

type WorkflowState = Pick<ClientSiteContent, "draftContent" | "draftRevision">;

export function planDraftSave(existingRevision: number | null, expectedRevision: number) {
  if ((existingRevision ?? 0) !== expectedRevision) {
    throw new ClientSiteContentConflictError("Draft revision changed");
  }
  return { nextRevision: expectedRevision + 1 };
}

export function planPublish(existing: WorkflowState | undefined, expectedRevision: number) {
  if (!existing || existing.draftRevision !== expectedRevision) {
    throw new ClientSiteContentConflictError("Draft revision changed");
  }
  return { nextRevision: expectedRevision + 1, publishedContent: existing.draftContent };
}
