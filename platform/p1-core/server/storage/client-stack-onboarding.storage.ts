import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { clientStackOnboardingEvidence, type ClientStackOnboardingEvidence } from "@shared/schema";

export type ClientStackOnboardingEvidenceKind =
  | "domain_plan"
  | "dns_verification"
  | "readiness_evaluation";

export class ClientStackOnboardingStorage {
  async record(params: {
    stackId: string;
    kind: ClientStackOnboardingEvidenceKind;
    payload: unknown;
    recordedByUserId: string | null;
  }): Promise<ClientStackOnboardingEvidence> {
    const [record] = await db.insert(clientStackOnboardingEvidence).values(params).returning();
    return record;
  }

  list(stackId: string): Promise<ClientStackOnboardingEvidence[]> {
    return db
      .select()
      .from(clientStackOnboardingEvidence)
      .where(eq(clientStackOnboardingEvidence.stackId, stackId))
      .orderBy(desc(clientStackOnboardingEvidence.recordedAt));
  }
}
