import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
vi.mock("../db", () => ({ db: {} }));
import { EmailTemplateStorage, emailTemplateVersion, emailTemplatesVersion } from "./email-template.storage";
const url = process.env.EMAIL_TEMPLATES_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
let pool: pg.Pool, store: EmailTemplateStorage;
const author = "11111111-1111-4111-8111-111111111111";
const audit = { userId: author, action: "email_template_updated", details: "Synthetic template" };
const definition = (slug = "one", htmlBody = "Original") => ({ slug, name: slug, module: "system", subject: "Hello {{firstName}}", htmlBody, description: "Synthetic", variables: ["firstName"], isActive: false });
suite("email template atomicity on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || parsed.pathname !== "/core_email_templates_test" || parsed.search || parsed.hash)
      throw Error("Requires dedicated local core_email_templates_test database");
    pool = new pg.Pool({ connectionString: url, max: 8 });
    await pool.query(`CREATE TABLE users (id varchar PRIMARY KEY);
      INSERT INTO users VALUES ('${author}');
      CREATE TABLE email_templates (id varchar PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE NOT NULL,name text NOT NULL,module text NOT NULL DEFAULT 'system',subject text NOT NULL,html_body text NOT NULL,description text NOT NULL,variables text[] NOT NULL,is_active boolean NOT NULL DEFAULT true,updated_at timestamp DEFAULT now());
      CREATE TABLE activity_logs (id varchar PRIMARY KEY DEFAULT gen_random_uuid(),user_id varchar NOT NULL REFERENCES users(id),action text NOT NULL,details text,created_at timestamp DEFAULT now());`);
    store = new EmailTemplateStorage(drizzle(pool, { schema }));
  });
  beforeEach(async () => { await pool.query("TRUNCATE email_templates, activity_logs"); });
  afterAll(async () => { await pool?.end(); });
  it("allows one winner when concurrent editors save the same version", async () => {
    await store.upsertTemplate(definition());
    const before = (await store.getVersionedTemplate("one"))!;
    const result = await Promise.allSettled(["First", "Second"].map(htmlBody => store.saveVersionedTemplate("one", {htmlBody}, before.version, audit)));
    expect(result.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect(result.filter(row => row.status === "rejected")).toHaveLength(1);
    expect((await pool.query("SELECT count(*)::int AS n FROM activity_logs")).rows[0].n).toBe(1);
    expect(await store.getTemplate("one")).toMatchObject({id:before.id,isActive:false,variables:["firstName"]});
  });
  it("allows only one of an edit and collection restore based on the same snapshot", async () => {
    await store.upsertTemplate(definition());
    const before = await store.getVersionedTemplates();
    const results = await Promise.allSettled([
      store.saveVersionedTemplate("one", {htmlBody:"Editor version"}, before.templates[0].version, audit),
      store.restoreVersionedTemplates([definition("one","Default version"),definition("new")], before.version, audit),
    ]);
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(row => row.status === "rejected")).toHaveLength(1);
    expect((await pool.query("SELECT count(*)::int AS n FROM activity_logs")).rows[0].n).toBe(1);
  });
  it("detects legacy edits and unknown templates without a write or audit", async () => {
    await store.upsertTemplate(definition());
    const before = (await store.getVersionedTemplate("one"))!;
    await store.updateTemplate("one", {isActive:true});
    await expect(store.saveVersionedTemplate("one", {subject:"Stale"}, before.version, audit)).rejects.toMatchObject({statusCode:409});
    await expect(store.saveVersionedTemplate("absent", {}, before.version, audit)).rejects.toMatchObject({statusCode:409});
    expect(await store.getTemplate("one")).toMatchObject({subject:before.subject,isActive:true});
    expect((await pool.query("SELECT count(*)::int AS n FROM activity_logs")).rows[0].n).toBe(0);
  });
  it("restores defaults atomically while preserving custom templates, identity and activation", async () => {
    const original = await store.upsertTemplate(definition());
    const stale = await store.getVersionedTemplates();
    const custom = await store.upsertTemplate(definition("custom"));
    const defaults = [{...definition("one","Restored"),isActive:true}, {...definition("new"),isActive:true}];
    await expect(store.restoreVersionedTemplates(defaults, stale.version, audit)).rejects.toMatchObject({statusCode:409});
    const current = await store.getVersionedTemplates();
    const result = await store.restoreVersionedTemplates(defaults, current.version, audit);
    expect(result).toMatchObject({created:1,updated:1,restored:2});
    expect(result.templates).toHaveLength(3);
    expect(await store.getTemplate("one")).toMatchObject({id:original.id,isActive:false,htmlBody:"Restored"});
    expect(await store.getTemplate("custom")).toEqual(custom);
    expect(await store.getTemplate("new")).toMatchObject({isActive:true});
    expect(result.version).not.toBe(current.version);
  });
  it("rolls back save and every restore mutation when audit persistence fails", async () => {
    await store.upsertTemplate(definition());
    const before = await store.getVersionedTemplates();
    const invalid = {...audit,userId:"missing-actor"};
    await expect(store.saveVersionedTemplate("one", {htmlBody:"Private marker"}, before.templates[0].version, invalid)).rejects.toMatchObject({statusCode:503,message:"Email template operation failed. Reload saved templates before retrying."});
    await expect(store.restoreVersionedTemplates([definition("one","Changed"),definition("new")], before.version, invalid)).rejects.toMatchObject({statusCode:503});
    expect(await store.getVersionedTemplates()).toEqual(before);
  });
  it("rejects duplicate definitions and rolls back partial restoration on constraints", async () => {
    await store.upsertTemplate(definition());
    const before = await store.getVersionedTemplates();
    await expect(store.restoreVersionedTemplates([definition(),definition()], before.version, audit)).rejects.toThrow("Duplicate");
    await pool.query("ALTER TABLE email_templates ADD CONSTRAINT reject_fixture CHECK(html_body <> 'rejected')");
    try {
      await expect(store.restoreVersionedTemplates([definition("one","Changed"),definition("new","rejected")], before.version, audit)).rejects.toMatchObject({statusCode:503});
      expect(await store.getVersionedTemplates()).toEqual(before);
    } finally { await pool.query("ALTER TABLE email_templates DROP CONSTRAINT reject_fixture"); }
  });
  it("versions all persisted fields and makes collection version independent of read order", async () => {
    const one = await store.upsertTemplate(definition());
    const two = await store.upsertTemplate(definition("two"));
    expect(emailTemplatesVersion([one,two])).toBe(emailTemplatesVersion([two,one]));
    for (const changes of [{subject:"Changed"},{htmlBody:"Changed"},{variables:["other"]},{module:"forms"},{isActive:true},{name:"Changed"},{description:"Changed"},{slug:"changed"},{id:"changed"},{updatedAt:new Date(0)}]) {
      expect(emailTemplateVersion({...one,...changes})).not.toBe(emailTemplateVersion(one));
    }
  });
});
