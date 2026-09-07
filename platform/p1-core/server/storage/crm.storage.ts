import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  CRM_CLIENT_STATUSES,
  CRM_LEAD_STAGES,
  crmClientNotes,
  crmClientTasks,
  crmClients,
  crmLeadNotes,
  crmLeadTasks,
  crmLeads,
  type CrmClient,
  type CrmClientNote,
  type CrmClientStatus,
  type CrmClientTask,
  type CrmLead,
  type CrmLeadNote,
  type CrmLeadStage,
  type CrmLeadTask,
  type InsertCrmClient,
  type InsertCrmClientNote,
  type InsertCrmClientTask,
  type InsertCrmLead,
  type InsertCrmLeadNote,
  type InsertCrmLeadTask,
} from "@shared/schema";

type CrmDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CrmLeadListFilters {
  query?: string;
  stage?: CrmLeadStage | "all";
}

export interface CrmLeadDetail extends CrmLead {
  notes: CrmLeadNote[];
  tasks: CrmLeadTask[];
  client?: CrmClient;
}

export interface CrmClientListFilters {
  query?: string;
  status?: CrmClientStatus | "all";
}

export interface CrmClientDetail extends CrmClient {
  sourceLead?: CrmLead;
  notes: CrmClientNote[];
  tasks: CrmClientTask[];
}

function isCrmLeadStage(value: string | undefined): value is CrmLeadStage {
  return !!value && CRM_LEAD_STAGES.includes(value as CrmLeadStage);
}

function isCrmClientStatus(value: string | undefined): value is CrmClientStatus {
  return !!value && CRM_CLIENT_STATUSES.includes(value as CrmClientStatus);
}

export class CrmStorage {
  async listLeads(filters: CrmLeadListFilters = {}): Promise<CrmLead[]> {
    const conditions = [];
    const query = filters.query?.trim();
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(
        or(
          ilike(crmLeads.name, pattern),
          ilike(crmLeads.email, pattern),
          ilike(crmLeads.phone, pattern),
          ilike(crmLeads.company, pattern),
          ilike(crmLeads.source, pattern),
        ),
      );
    }
    if (isCrmLeadStage(filters.stage)) {
      conditions.push(eq(crmLeads.stage, filters.stage));
    }

    return db
      .select()
      .from(crmLeads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(crmLeads.updatedAt), desc(crmLeads.createdAt));
  }

  async getLeadById(id: string): Promise<CrmLead | undefined> {
    const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, id)).limit(1);
    return lead;
  }

  async getLeadDetail(id: string): Promise<CrmLeadDetail | undefined> {
    const lead = await this.getLeadById(id);
    if (!lead) return undefined;
    const [notes, tasks, client] = await Promise.all([
      this.listNotes(id),
      this.listTasks(id),
      this.getClientBySourceLeadId(id),
    ]);
    return { ...lead, notes, tasks, client };
  }

  async createOrUpdateInboundLead(
    data: InsertCrmLead,
    createdById?: string | null,
    transaction?: CrmDbTransaction,
  ): Promise<{ lead: CrmLead; duplicate: boolean }> {
    // A person may request several projects. Only the same durable submission
    // identifies a replay; contact details never collapse separate inquiries.
    const apply = async (tx: CrmDbTransaction) => {
      if (data.formSubmissionId) {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${"crm-submission:" + data.formSubmissionId}))`,
        );
        const [existing] = await tx
          .select()
          .from(crmLeads)
          .where(eq(crmLeads.formSubmissionId, data.formSubmissionId))
          .limit(1);
        if (existing) return { lead: existing, duplicate: true };
      }
      const [lead] = await tx.insert(crmLeads).values(data).returning();
      return { lead, duplicate: false };
    };
    return transaction ? apply(transaction) : db.transaction(apply);
  }

  async findDuplicateLead(
    data: Pick<InsertCrmLead, "email" | "phone">,
  ): Promise<CrmLead | undefined> {
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const phone = typeof data.phone === "string" ? data.phone.trim() : "";
    if (email) {
      const [lead] = await db
        .select()
        .from(crmLeads)
        .where(sql`lower(${crmLeads.email}) = ${email}`)
        .limit(1);
      if (lead) return lead;
    }
    if (phone) {
      const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.phone, phone)).limit(1);
      if (lead) return lead;
    }
    return undefined;
  }

  async createLead(data: InsertCrmLead): Promise<CrmLead> {
    const [lead] = await db.insert(crmLeads).values(data).returning();
    return lead;
  }

  async updateLead(id: string, data: Partial<InsertCrmLead>): Promise<CrmLead | undefined> {
    const [lead] = await db
      .update(crmLeads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(crmLeads.id, id))
      .returning();
    return lead;
  }

  async updateLeadAndCreateWonClient(
    id: string,
    data: Partial<InsertCrmLead>,
    buildClient: (lead: CrmLead) => InsertCrmClient,
    createdById?: string | null,
  ): Promise<{ lead: CrmLead; client: CrmClient | undefined } | undefined> {
    return db.transaction(async (tx: CrmDbTransaction) => {
      await tx.execute(sql`SELECT id FROM crm_leads WHERE id = ${id} FOR UPDATE`);
      const [lead] = await tx
        .update(crmLeads)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(crmLeads.id, id))
        .returning();
      if (!lead) return undefined;

      const [existingClient] = await tx
        .select()
        .from(crmClients)
        .where(eq(crmClients.sourceLeadId, lead.id))
        .limit(1);
      if (existingClient) return { lead, client: existingClient };

      const [client] = await tx.insert(crmClients).values(buildClient(lead)).returning();
      await tx.insert(crmLeadNotes).values({
        leadId: lead.id,
        createdById: createdById ?? null,
        body: "Lead converted to client after moving to Won.",
      });
      await tx.insert(crmClientNotes).values({
        clientId: client.id,
        createdById: createdById ?? null,
        body: "Client created from won lead.",
      });
      return { lead, client };
    });
  }

  async listNotes(leadId: string): Promise<CrmLeadNote[]> {
    return db
      .select()
      .from(crmLeadNotes)
      .where(eq(crmLeadNotes.leadId, leadId))
      .orderBy(desc(crmLeadNotes.createdAt));
  }

  async createNote(data: InsertCrmLeadNote): Promise<CrmLeadNote> {
    const [note] = await db.insert(crmLeadNotes).values(data).returning();
    return note;
  }

  async listTasks(leadId: string): Promise<CrmLeadTask[]> {
    return db
      .select()
      .from(crmLeadTasks)
      .where(eq(crmLeadTasks.leadId, leadId))
      .orderBy(crmLeadTasks.completed, crmLeadTasks.dueAt, desc(crmLeadTasks.createdAt));
  }

  async createTask(data: InsertCrmLeadTask): Promise<CrmLeadTask> {
    const [task] = await db.insert(crmLeadTasks).values(data).returning();
    return task;
  }

  async updateTask(id: string, data: Partial<InsertCrmLeadTask>): Promise<CrmLeadTask | undefined> {
    const [task] = await db
      .update(crmLeadTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(crmLeadTasks.id, id))
      .returning();
    return task;
  }

  async listClients(filters: CrmClientListFilters = {}): Promise<CrmClient[]> {
    const conditions = [];
    const query = filters.query?.trim();
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(
        or(
          ilike(crmClients.name, pattern),
          ilike(crmClients.email, pattern),
          ilike(crmClients.phone, pattern),
          ilike(crmClients.company, pattern),
          ilike(crmClients.primaryEmail, pattern),
          ilike(crmClients.primaryPhone, pattern),
          ilike(crmClients.companyName, pattern),
          ilike(crmClients.website, pattern),
          ilike(crmClients.city, pattern),
          ilike(crmClients.region, pattern),
          ilike(crmClients.source, pattern),
        ),
      );
    }
    if (isCrmClientStatus(filters.status)) {
      conditions.push(eq(crmClients.status, filters.status));
    }

    return db
      .select()
      .from(crmClients)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(crmClients.updatedAt), desc(crmClients.createdAt));
  }

  async getClientById(id: string): Promise<CrmClient | undefined> {
    const [client] = await db.select().from(crmClients).where(eq(crmClients.id, id)).limit(1);
    return client;
  }

  async getClientBySourceLeadId(sourceLeadId: string): Promise<CrmClient | undefined> {
    const [client] = await db
      .select()
      .from(crmClients)
      .where(eq(crmClients.sourceLeadId, sourceLeadId))
      .limit(1);
    return client;
  }

  async getClientDetail(id: string): Promise<CrmClientDetail | undefined> {
    const client = await this.getClientById(id);
    if (!client) return undefined;
    const [sourceLead, notes, tasks] = await Promise.all([
      client.sourceLeadId ? this.getLeadById(client.sourceLeadId) : Promise.resolve(undefined),
      this.listClientNotes(id),
      this.listClientTasks(id),
    ]);
    return { ...client, sourceLead, notes, tasks };
  }

  async createClient(data: InsertCrmClient): Promise<CrmClient> {
    const [client] = await db.insert(crmClients).values(data).returning();
    return client;
  }

  async updateClient(id: string, data: Partial<InsertCrmClient>): Promise<CrmClient | undefined> {
    const [client] = await db
      .update(crmClients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(crmClients.id, id))
      .returning();
    return client;
  }

  async listClientNotes(clientId: string): Promise<CrmClientNote[]> {
    return db
      .select()
      .from(crmClientNotes)
      .where(eq(crmClientNotes.clientId, clientId))
      .orderBy(desc(crmClientNotes.createdAt));
  }

  async createClientNote(data: InsertCrmClientNote): Promise<CrmClientNote> {
    const [note] = await db.insert(crmClientNotes).values(data).returning();
    return note;
  }

  async listClientTasks(clientId: string): Promise<CrmClientTask[]> {
    return db
      .select()
      .from(crmClientTasks)
      .where(eq(crmClientTasks.clientId, clientId))
      .orderBy(crmClientTasks.completed, crmClientTasks.dueAt, desc(crmClientTasks.createdAt));
  }

  async createClientTask(data: InsertCrmClientTask): Promise<CrmClientTask> {
    const [task] = await db.insert(crmClientTasks).values(data).returning();
    return task;
  }

  async updateClientTask(
    id: string,
    data: Partial<InsertCrmClientTask>,
  ): Promise<CrmClientTask | undefined> {
    const [task] = await db
      .update(crmClientTasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(crmClientTasks.id, id))
      .returning();
    return task;
  }
}
