import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { emailTemplates, type EmailTemplate } from "@shared/schema";

export class EmailTemplateStorage {
  async getTemplate(slug: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.slug, slug));
    return template;
  }

  async getAllTemplates(): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates).orderBy(asc(emailTemplates.name));
  }

  async updateTemplate(
    slug: string,
    data: { subject?: string; htmlBody?: string; isActive?: boolean },
  ): Promise<EmailTemplate | undefined> {
    const [updated] = await db
      .update(emailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailTemplates.slug, slug))
      .returning();
    return updated;
  }

  async upsertTemplate(data: {
    slug: string;
    name: string;
    module?: string;
    subject: string;
    htmlBody: string;
    description: string;
    variables: string[];
    isActive?: boolean;
  }): Promise<EmailTemplate> {
    const existing = await this.getTemplate(data.slug);
    if (existing) {
      const [updated] = await db
        .update(emailTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(emailTemplates.slug, data.slug))
        .returning();
      return updated;
    }
    const [created] = await db.insert(emailTemplates).values(data).returning();
    return created;
  }
}
