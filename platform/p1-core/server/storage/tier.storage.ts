import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { membershipTiers, type MembershipTier, type InsertMembershipTier } from "@shared/schema";

export class TierStorage {
  async getTier(id: string): Promise<MembershipTier | undefined> {
    const [tier] = await db.select().from(membershipTiers).where(eq(membershipTiers.id, id));
    return tier;
  }

  async getAllTiers(): Promise<MembershipTier[]> {
    return db.select().from(membershipTiers).orderBy(asc(membershipTiers.sortOrder));
  }

  async getActiveTiers(): Promise<MembershipTier[]> {
    return db
      .select()
      .from(membershipTiers)
      .where(eq(membershipTiers.isActive, true))
      .orderBy(asc(membershipTiers.sortOrder));
  }

  async createTier(data: InsertMembershipTier): Promise<MembershipTier> {
    const [tier] = await db.insert(membershipTiers).values(data).returning();
    return tier;
  }

  async updateTier(
    id: string,
    data: Partial<InsertMembershipTier>,
  ): Promise<MembershipTier | undefined> {
    const [tier] = await db
      .update(membershipTiers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(membershipTiers.id, id))
      .returning();
    return tier;
  }
}
