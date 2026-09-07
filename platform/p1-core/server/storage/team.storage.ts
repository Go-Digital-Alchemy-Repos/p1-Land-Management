import { sanitizeTeamBiography } from "../utils/team-biography";
import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { teamMembers } from "@shared/schema";
import type { TeamMemberInput } from "@shared/team";

export class TeamStorage {
  async list() {
    return db.select().from(teamMembers).orderBy(asc(teamMembers.name), asc(teamMembers.id));
  }
  async published() {
    return db
      .select({
        id: teamMembers.id,
        name: teamMembers.name,
        role: teamMembers.role,
        biography: teamMembers.biography,
        excerpt: teamMembers.excerpt,
        photoUrl: teamMembers.photoUrl,
        photoAlt: teamMembers.photoAlt,
        status: teamMembers.status,
      })
      .from(teamMembers)
      .where(eq(teamMembers.status, "published"))
      .orderBy(asc(teamMembers.name), asc(teamMembers.id));
  }
  async create(data: TeamMemberInput, userId: string) {
    const [member] = await db
      .insert(teamMembers)
      .values({
        ...data,
        biography: sanitizeTeamBiography(data.biography),
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    return member;
  }
  async update(id: string, data: TeamMemberInput, userId: string) {
    const [member] = await db
      .update(teamMembers)
      .set({
        ...data,
        biography: sanitizeTeamBiography(data.biography),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.id, id))
      .returning();
    return member;
  }
}
