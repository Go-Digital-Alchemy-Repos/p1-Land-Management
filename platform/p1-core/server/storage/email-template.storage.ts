import { createHash } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { activityLogs, emailTemplates, type EmailTemplate, type InsertEmailTemplate } from "@shared/schema";

export class EmailTemplateConflictError extends Error {
  readonly statusCode = 409;
  constructor() { super("Email templates changed. Reload saved templates before trying again."); }
}

export function emailTemplateVersion(template: EmailTemplate): string {
  return createHash("sha256").update(JSON.stringify([
    template.id, template.slug, template.name, template.module, template.subject,
    template.htmlBody, template.description, template.variables, template.isActive, template.updatedAt,
  ])).digest("hex");
}

export function emailTemplatesVersion(rows: EmailTemplate[]): string {
  return createHash("sha256").update(JSON.stringify(
    rows.map(row => [row.id, emailTemplateVersion(row)]).sort((a, b) => a[0].localeCompare(b[0])),
  )).digest("hex");
}

type TemplateEdit = Pick<Partial<InsertEmailTemplate>, "subject" | "htmlBody" | "isActive">;
type TemplateAudit = { userId: string; action: string; details: string };

export class EmailTemplateStorage {
  constructor(private readonly database: typeof db = db) {}

  async getVersionedTemplates() {
    const rows = await this.getAllTemplates();
    return { version: emailTemplatesVersion(rows), templates: rows.map(row => ({ ...row, version: emailTemplateVersion(row) })) };
  }

  async getVersionedTemplate(slug: string) {
    const template = await this.getTemplate(slug);
    return template ? { ...template, version: emailTemplateVersion(template) } : undefined;
  }

  /** Serializes the comparison, mutation and audit; reads remain available.
   * Legacy callers must adopt version checks before concurrent editing is exposed.
   */
  private async locked<T>(work: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>): Promise<T> {
    return this.database.transaction(async tx => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`LOCK TABLE email_templates IN SHARE ROW EXCLUSIVE MODE`);
      return work(tx);
    }).catch((error: unknown) => {
      if (error instanceof EmailTemplateConflictError) throw error;
      // Do not expose SQL parameters or email content through HTTP error logs.
      throw Object.assign(new Error("Email template operation failed. Reload saved templates before retrying."), { statusCode: 503 });
    });
  }

  async saveVersionedTemplate(slug: string, data: TemplateEdit, expectedVersion: string, audit: TemplateAudit) {
    return this.locked(async tx => {
      const [current] = await tx.select().from(emailTemplates).where(eq(emailTemplates.slug, slug));
      if (!current || emailTemplateVersion(current) !== expectedVersion) throw new EmailTemplateConflictError();
      // Explicit fields keep identity, branding metadata and variable definitions immutable here.
      const changes: TemplateEdit = {};
      if (data.subject !== undefined) changes.subject = data.subject;
      if (data.htmlBody !== undefined) changes.htmlBody = data.htmlBody;
      if (data.isActive !== undefined) changes.isActive = data.isActive;
      const [saved] = await tx.update(emailTemplates).set({ ...changes, updatedAt: new Date() }).where(eq(emailTemplates.slug, slug)).returning();
      await tx.insert(activityLogs).values(audit);
      return { ...saved, version: emailTemplateVersion(saved) };
    });
  }

  async restoreVersionedTemplates(definitions: InsertEmailTemplate[], expectedVersion: string, audit: TemplateAudit) {
    if (new Set(definitions.map(item => item.slug)).size !== definitions.length)
      throw new Error("Duplicate email template slug");
    return this.locked(async tx => {
      const current = await tx.select().from(emailTemplates);
      if (emailTemplatesVersion(current) !== expectedVersion) throw new EmailTemplateConflictError();
      const bySlug = new Map(current.map(row => [row.slug, row]));
      let created = 0, updated = 0;
      for (const definition of definitions) {
        const { slug, name, module, subject, htmlBody, description, variables } = definition;
        const fields = { slug, name, module: module ?? "system", subject, htmlBody, description, variables };
        const existing = bySlug.get(slug);
        if (existing) {
          // Restore content defaults without reactivating disabled mail or deleting custom templates.
          await tx.update(emailTemplates).set({ ...fields, updatedAt: new Date() }).where(eq(emailTemplates.id, existing.id));
          updated++;
        } else {
          await tx.insert(emailTemplates).values({ ...fields, isActive: definition.isActive ?? true });
          created++;
        }
      }
      await tx.insert(activityLogs).values(audit);
      const rows = await tx.select().from(emailTemplates).orderBy(asc(emailTemplates.name));
      return { created, updated, restored: definitions.length, version: emailTemplatesVersion(rows), templates: rows.map(row => ({ ...row, version: emailTemplateVersion(row) })) };
    });
  }

  async getTemplate(slug: string): Promise<EmailTemplate | undefined> {
    const [template] = await this.database.select().from(emailTemplates).where(eq(emailTemplates.slug, slug));
    return template;
  }

  async getAllTemplates(): Promise<EmailTemplate[]> {
    return this.database.select().from(emailTemplates).orderBy(asc(emailTemplates.name));
  }

  async updateTemplate(
    slug: string,
    data: { subject?: string; htmlBody?: string; isActive?: boolean },
  ): Promise<EmailTemplate | undefined> {
    const [updated] = await this.database
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
      const [updated] = await this.database
        .update(emailTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(emailTemplates.slug, data.slug))
        .returning();
      return updated;
    }
    const [created] = await this.database.insert(emailTemplates).values(data).returning();
    return created;
  }
}
