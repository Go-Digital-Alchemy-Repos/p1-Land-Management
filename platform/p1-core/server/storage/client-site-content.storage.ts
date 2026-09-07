import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  clientSiteContent,
  clientSiteContentRevisions,
  type ClientSiteContent,
  type ClientSiteContentRevision,
} from "@shared/schema";
import {
  ClientSiteContentConflictError,
  planDraftSave,
  planPublish,
} from "../services/client-site-content-workflow";

export { ClientSiteContentConflictError } from "../services/client-site-content-workflow";

export interface ClientSiteContentIdentity {
  stackId: string;
  routeId: string;
  componentKey: string;
}

export class ClientSiteContentStorage {
  get(identity: ClientSiteContentIdentity): Promise<ClientSiteContent | undefined> {
    return db.query.clientSiteContent.findFirst({
      where: and(
        eq(clientSiteContent.stackId, identity.stackId),
        eq(clientSiteContent.routeId, identity.routeId),
        eq(clientSiteContent.componentKey, identity.componentKey),
      ),
    });
  }

  async saveDraft(
    identity: ClientSiteContentIdentity,
    content: Record<string, unknown>,
    expectedRevision: number,
    userId: string,
    kind: "draft-save" | "restore" = "draft-save",
  ): Promise<ClientSiteContent> {
    return db.transaction(async (tx) => {
      const existing = await tx.query.clientSiteContent.findFirst({
        where: and(
          eq(clientSiteContent.stackId, identity.stackId),
          eq(clientSiteContent.routeId, identity.routeId),
          eq(clientSiteContent.componentKey, identity.componentKey),
        ),
      });
      const { nextRevision } = planDraftSave(existing?.draftRevision ?? null, expectedRevision);
      let saved: ClientSiteContent | undefined;
      if (!existing) {
        [saved] = await tx
          .insert(clientSiteContent)
          .values({
            ...identity,
            draftContent: content,
            draftRevision: nextRevision,
            createdBy: userId,
            updatedBy: userId,
          })
          .returning();
      } else {
        [saved] = await tx
          .update(clientSiteContent)
          .set({
            draftContent: content,
            draftRevision: nextRevision,
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(clientSiteContent.id, existing.id),
              eq(clientSiteContent.draftRevision, expectedRevision),
            ),
          )
          .returning();
        if (!saved) throw new ClientSiteContentConflictError("Draft revision changed");
      }
      await tx.insert(clientSiteContentRevisions).values({
        contentId: saved!.id,
        revision: nextRevision,
        content,
        kind,
        changedBy: userId,
      });
      return saved!;
    });
  }

  async publish(
    identity: ClientSiteContentIdentity,
    expectedRevision: number,
    userId: string,
  ): Promise<ClientSiteContent> {
    return db.transaction(async (tx) => {
      const existing = await tx.query.clientSiteContent.findFirst({
        where: and(
          eq(clientSiteContent.stackId, identity.stackId),
          eq(clientSiteContent.routeId, identity.routeId),
          eq(clientSiteContent.componentKey, identity.componentKey),
        ),
      });
      const { nextRevision, publishedContent } = planPublish(existing, expectedRevision);
      if (!existing) throw new ClientSiteContentConflictError("Draft revision changed");
      const [saved] = await tx
        .update(clientSiteContent)
        .set({
          draftRevision: nextRevision,
          publishedContent,
          publishedRevision: nextRevision,
          publishedBy: userId,
          publishedAt: new Date(),
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(clientSiteContent.id, existing.id),
            eq(clientSiteContent.draftRevision, expectedRevision),
          ),
        )
        .returning();
      if (!saved) throw new ClientSiteContentConflictError("Draft revision changed");
      await tx.insert(clientSiteContentRevisions).values({
        contentId: existing.id,
        revision: nextRevision,
        content: existing.draftContent,
        kind: "publish",
        changedBy: userId,
      });
      return saved;
    });
  }

  async listRevisions(contentId: string): Promise<ClientSiteContentRevision[]> {
    return db
      .select()
      .from(clientSiteContentRevisions)
      .where(eq(clientSiteContentRevisions.contentId, contentId))
      .orderBy(desc(clientSiteContentRevisions.revision));
  }

  async getRevision(
    contentId: string,
    revision: number,
  ): Promise<ClientSiteContentRevision | undefined> {
    return db.query.clientSiteContentRevisions.findFirst({
      where: and(
        eq(clientSiteContentRevisions.contentId, contentId),
        eq(clientSiteContentRevisions.revision, revision),
      ),
    });
  }
}
