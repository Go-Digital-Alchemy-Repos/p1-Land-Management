import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

// Explicit disposable local database only. DATABASE_URL and .env are never used.
const testUrl = process.env.FORM_EFFECT_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/core_form_effect_test"
  ) {
    throw new Error(
      "FORM_EFFECT_TEST_DATABASE_URL must target local disposable core_form_effect_test",
    );
  }
}
vi.mock("../db", async () => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const schema = await import("@shared/schema");
  const pool = new Pool({
    connectionString: process.env.FORM_EFFECT_TEST_DATABASE_URL,
    max: 8,
    options: "-c timezone=America/New_York",
  });
  return { pool, db: drizzle(pool, { schema }) };
});
vi.mock("../utils/logger", () => ({
  logger: { app: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
}));
import { db, pool } from "../db";
import { runMigrations } from "../migrate";
import { p1CommercialAssessmentSchema } from "../services/p1-commercial-assessment";
import { FormsStorage } from "./forms.storage";
import { ContactStorage } from "./contact.storage";
import { CrmStorage } from "./crm.storage";
import { type CmsFormEffectPayload } from "@shared/schema";

const forms = new FormsStorage();
const contacts = new ContactStorage();
const crm = new CrmStorage();
const payload = { name: "Lin", email: "lin@example.test", subject: "Hi", message: "Hello" };
let formId: string;
const effect: CmsFormEffectPayload = { kind: "contact_message" };
const accepted = (key = "attempt-1", effects: CmsFormEffectPayload[] = [effect]) =>
  forms.createSubmissionWithEffects({ formId, data: payload, idempotencyKey: key }, effects);
async function count(
  table:
    | "cms_form_submissions"
    | "cms_form_effect_jobs"
    | "contact_messages"
    | "crm_leads"
    | "crm_lead_notes",
) {
  return Number((await pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count);
}

// Eligibility tests intentionally move past the DB's creation clock. Docker and
// host clocks can differ by milliseconds even when their timezones are correct.
async function readyTime() {
  return new Date(
    (await pool.query("SELECT clock_timestamp() + interval '1 second' AS now")).rows[0].now,
  );
}

describe.skipIf(!testUrl)("managed form outbox disposable PostgreSQL", () => {
  beforeAll(async () => {
    await runMigrations();
  }, 60_000);
  beforeEach(async () => {
    await pool.query("TRUNCATE cms_forms, contact_messages, crm_leads CASCADE");
    const form = await forms.create({
      name: "Lead",
      slug: "lead",
      fields: [],
      settings: {},
      kind: "custom",
      isActive: true,
    });
    formId = form.id;
  });
  afterAll(async () => {
    await pool.end();
  });

  it("reconciles the additive migration repeatedly without touching accepted submissions", async () => {
    await accepted();
    await runMigrations();
    await runMigrations();
    expect(await count("cms_form_submissions")).toBe(1);
    expect(await count("cms_form_effect_jobs")).toBe(1);
  });
  it("preserves separate projects for the same person and deduplicates only a submission replay", async () => {
    const first = await accepted("project-a");
    const second = await accepted("project-b");
    const base = { name: "Same person", email: "person@example.test", source: "website_form" };
    const one = await crm.createOrUpdateInboundLead({
      ...base,
      formSubmissionId: first.submission.id,
      message: "Project A",
    });
    const two = await crm.createOrUpdateInboundLead({
      ...base,
      formSubmissionId: second.submission.id,
      message: "Project B",
    });
    const replay = await crm.createOrUpdateInboundLead({
      ...base,
      formSubmissionId: first.submission.id,
      message: "Retry",
    });
    expect(one.lead.id).not.toBe(two.lead.id);
    expect(replay.lead.id).toBe(one.lead.id);
    expect(replay.duplicate).toBe(true);
    expect(await count("crm_leads")).toBe(2);
    expect(await count("crm_lead_notes")).toBe(0);
  });
  it("keeps phone-only commercial projects distinct while browser and CRM retries share a receipt", async () => {
    const data = p1CommercialAssessmentSchema.parse({
      inquiryType: "commercial_site_assessment",
      name: "Pat",
      company: "Example",
      phone: "7045550100",
      address: "York County",
      services: ["general_site_assessment"],
      projectStage: "unknown",
      serviceTiming: "both",
    });
    const accept = (key: string, propertyName: string) =>
      forms.createSubmissionWithEffects(
        { formId, data: { ...data, propertyName }, idempotencyKey: key },
        [{ kind: "crm_intake", formName: "Commercial" }],
      );
    const [first, retry] = await Promise.all([
      accept("commercial-a", "Site A"),
      accept("commercial-a", "Site A"),
    ]);
    const second = await accept("commercial-b", "Site B");
    expect(first.submission.id).toBe(retry.submission.id);
    expect(first.submission.id).not.toBe(second.submission.id);
    const create = (submission: typeof first.submission) =>
      crm.createOrUpdateInboundLead({
        name: data.name,
        phone: data.phone,
        email: null,
        source: "website_form",
        formSubmissionId: submission.id,
        formData: submission.data,
      });
    const lead = await create(first.submission);
    const replay = await create(first.submission);
    await create(second.submission);
    expect(replay.lead.id).toBe(lead.lead.id);
    expect(lead.lead).toMatchObject({ email: null, stage: "new", source: "website_form" });
    expect(lead.lead.formData).toMatchObject({
      inquiryType: "commercial_site_assessment",
      propertyName: "Site A",
      serviceTiming: "both",
    });
    expect(await count("cms_form_submissions")).toBe(2);
    expect(await count("cms_form_effect_jobs")).toBe(2);
    expect(await count("crm_leads")).toBe(2);
  });
  it("atomically accepts concurrent duplicates and preserves the original effects", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => accepted()));
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(new Set(results.map((result) => result.submission.id)).size).toBe(1);
    await accepted("attempt-1", [{ kind: "crm_intake", formName: "Changed" }]);
    expect(await count("cms_form_effect_jobs")).toBe(1);
    expect(
      (await pool.query("SELECT payload FROM cms_form_effect_jobs")).rows[0].payload.kind,
    ).toBe("contact_message");
  });
  it("rolls back submission insertion when enqueue fails", async () => {
    await expect(accepted("attempt-1", [effect, effect])).rejects.toThrow();
    expect(await count("cms_form_submissions")).toBe(0);
    expect(await count("cms_form_effect_jobs")).toBe(0);
    expect((await accepted()).created).toBe(true);
  });
  it("claims each job once across competing workers and fences replaced tokens", async () => {
    await accepted();
    const now = await readyTime();
    const claims = await Promise.all([
      forms.claimNextEffectJob(now),
      forms.claimNextEffectJob(now),
    ]);
    const claimed = claims.find(Boolean)!;
    expect(claims.filter(Boolean)).toHaveLength(1);
    const next = new Date(now.getTime() + 11 * 60_000);
    const replacement = (await forms.claimNextEffectJob(next))!;
    const apply = vi.fn();
    expect(
      await forms.completeEffectJob(
        claimed.id,
        claimed.processingToken!,
        "completed",
        () => next,
        apply,
      ),
    ).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    expect(await forms.retryEffectJob(claimed, next)).toBeUndefined();
    expect(
      await forms.completeEffectJob(
        replacement.id,
        replacement.processingToken!,
        "completed",
        () => next,
      ),
    ).toBe(true);
  });
  it("rolls back internal contact writes with failed completion and applies once on retry", async () => {
    await accepted();
    const now = await readyTime();
    const claimed = (await forms.claimNextEffectJob(now))!;
    await expect(
      forms.completeEffectJob(
        claimed.id,
        claimed.processingToken!,
        "completed",
        () => now,
        async (tx) => {
          await contacts.createMessage(payload, tx);
          throw new Error("simulated completion failure");
        },
      ),
    ).rejects.toThrow("simulated completion failure");
    expect(await count("contact_messages")).toBe(0);
    await forms.completeEffectJob(
      claimed.id,
      claimed.processingToken!,
      "completed",
      () => now,
      async (tx) => {
        await contacts.createMessage(payload, tx);
      },
    );
    expect(
      await forms.completeEffectJob(
        claimed.id,
        claimed.processingToken!,
        "completed",
        () => now,
        async (tx) => {
          await contacts.createMessage(payload, tx);
        },
      ),
    ).toBe(false);
    expect(await count("contact_messages")).toBe(1);
  });
  it("rolls back CRM without identity fields and its duplicate notes with job completion", async () => {
    await accepted("attempt-1", [{ kind: "crm_intake", formName: "Lead" }]);
    const claimed = (await forms.claimNextEffectJob(await readyTime()))!;
    await expect(
      forms.completeEffectJob(
        claimed.id,
        claimed.processingToken!,
        "completed",
        () => new Date(),
        async (tx, submission) => {
          await crm.createOrUpdateInboundLead(
            { name: "No identity", source: "website_form", formSubmissionId: submission.id },
            undefined,
            tx,
          );
          throw new Error("rollback");
        },
      ),
    ).rejects.toThrow("rollback");
    expect(await count("crm_leads")).toBe(0);
    await forms.completeEffectJob(
      claimed.id,
      claimed.processingToken!,
      "completed",
      () => new Date(),
      async (tx, submission) => {
        await crm.createOrUpdateInboundLead(
          {
            name: "Lin",
            email: "lin@example.test",
            source: "website_form",
            formSubmissionId: submission.id,
          },
          undefined,
          tx,
        );
      },
    );
    await accepted("attempt-2", [{ kind: "crm_intake", formName: "Lead" }]);
    const duplicate = (await forms.claimNextEffectJob(await readyTime()))!;
    await expect(
      forms.completeEffectJob(
        duplicate.id,
        duplicate.processingToken!,
        "completed",
        () => new Date(),
        async (tx, submission) => {
          await crm.createOrUpdateInboundLead(
            {
              name: "Lin",
              email: "lin@example.test",
              source: "website_form",
              formSubmissionId: submission.id,
            },
            undefined,
            tx,
          );
          throw new Error("rollback duplicate note");
        },
      ),
    ).rejects.toThrow("rollback duplicate note");
    expect(await count("crm_leads")).toBe(1);
    expect(await count("crm_lead_notes")).toBe(0);
  });
  it("does not reclaim an internal job while its fenced transaction is running", async () => {
    await accepted();
    const start = await readyTime();
    const claimed = (await forms.claimNextEffectJob(start))!;
    let entered!: () => void;
    let finish!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const release = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const completing = forms.completeEffectJob(
      claimed.id,
      claimed.processingToken!,
      "completed",
      () => new Date(),
      async (tx) => {
        await contacts.createMessage(payload, tx);
        entered();
        await release;
      },
    );
    await started;
    try {
      expect(
        await forms.claimNextEffectJob(new Date(start.getTime() + 11 * 60_000)),
      ).toBeUndefined();
    } finally {
      finish();
    }
    expect(await completing).toBe(true);
    expect(await count("contact_messages")).toBe(1);
  });
  it("dead-letters expired final claims and only manually requeues failed jobs", async () => {
    await accepted();
    const now = await readyTime();
    const claimed = (await forms.claimNextEffectJob(now))!;
    await db.execute(
      sql`UPDATE cms_form_effect_jobs SET attempt_count = 5 WHERE id = ${claimed.id}`,
    );
    const later = new Date(now.getTime() + 11 * 60_000);
    expect(await forms.claimNextEffectJob(later)).toBeUndefined();
    expect(await forms.listFailedEffectJobs()).toEqual([
      expect.objectContaining({ id: claimed.id, lastErrorCode: "claim_expired" }),
    ]);
    expect(await forms.requeueFailedEffectJob(claimed.id, later)).toEqual({ id: claimed.id });
    expect(await forms.requeueFailedEffectJob(claimed.id, later)).toBeUndefined();
    expect((await forms.claimNextEffectJob(later))?.attemptCount).toBe(1);
  });
});
