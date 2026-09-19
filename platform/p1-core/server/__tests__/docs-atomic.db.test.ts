import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
vi.mock("../db", () => ({ db: {} }));
import { DocsStorage } from "../storage/docs.storage";
const url = process.env.DOCS_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
let pool: pg.Pool, store: DocsStorage;
const author = "11111111-1111-4111-8111-111111111111";
const audit = { userId: author, action: "document_updated", details: "Synthetic document" };
const data = (slug = "one", content = "Original") => ({ title: slug, slug, category: "Reference", content, sortOrder: 0, isPublished: false });
suite("document mutation atomicity on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || parsed.pathname !== "/core_docs_test" || parsed.search || parsed.hash)
      throw Error("Requires dedicated local core_docs_test database");
    pool = new pg.Pool({ connectionString: url, max: 8 });
    await pool.query(`CREATE TABLE users (id varchar PRIMARY KEY);
      INSERT INTO users VALUES ('${author}');
      CREATE TABLE docs (id varchar PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,slug text UNIQUE NOT NULL,category text NOT NULL,content text NOT NULL,sort_order integer DEFAULT 0,is_published boolean DEFAULT true,created_by varchar REFERENCES users(id),created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());
      CREATE TABLE activity_logs (id varchar PRIMARY KEY DEFAULT gen_random_uuid(),user_id varchar NOT NULL REFERENCES users(id),action text NOT NULL,details text,created_at timestamp DEFAULT now());`);
    store = new DocsStorage(drizzle(pool, { schema }));
  });
  beforeEach(async () => { await pool.query("TRUNCATE docs, activity_logs"); });
  afterAll(async () => { await pool?.end(); });
  it("allows one winner for concurrent saves and rejects stale deletion", async () => {
    const doc = await store.createVersionedDoc(data(), audit);
    const result = await Promise.allSettled(["First", "Second"].map(content => store.saveVersionedDoc(doc.id, data("one", content), doc.version, audit)));
    expect(result.filter(item => item.status === "fulfilled")).toHaveLength(1);
    expect(result.filter(item => item.status === "rejected")).toHaveLength(1);
    await expect(store.deleteVersionedDoc(doc.id, doc.version, audit)).rejects.toMatchObject({statusCode:409});
    expect((await store.getDoc(doc.id))?.createdBy).toBe(author);
    expect((await pool.query("SELECT count(*)::int AS n FROM activity_logs")).rows[0].n).toBe(2);
  });
  it("detects edits from legacy writers before applying a versioned save", async () => {
    const doc = await store.createVersionedDoc(data(), audit);
    await store.updateDoc(doc.id, {content:"Legacy edit"});
    await expect(store.saveVersionedDoc(doc.id, data(), doc.version, audit)).rejects.toMatchObject({statusCode:409});
    expect((await store.getDoc(doc.id))?.content).toBe("Legacy edit");
  });
  it("rejects stale sync and preserves custom documents, authors and visibility", async () => {
    const original = await store.createVersionedDoc(data(), audit);
    const snapshot = await store.getVersionedDocs();
    const custom = await store.createVersionedDoc(data("custom"), audit);
    const definitions = [data("one", "Repository update"), data("new", "New guide")];
    await expect(store.synchronizeVersionedDocs(definitions, snapshot.version, audit)).rejects.toMatchObject({statusCode:409});
    const current = await store.getVersionedDocs();
    const result = await store.synchronizeVersionedDocs(definitions, current.version, audit);
    expect(result).toMatchObject({created:1,updated:1,total:3});
    expect(await store.getDoc(original.id)).toMatchObject({isPublished:false,createdBy:author,content:"Repository update"});
    expect(await store.getDoc(custom.id)).toMatchObject({content:"Original"});
    expect(result.version).not.toBe(current.version);
  });
  it("rolls back all sync updates and inserts if the audit fails", async () => {
    await store.createVersionedDoc(data(), audit);
    const before = await store.getVersionedDocs();
    await expect(store.synchronizeVersionedDocs([data("one", "Changed"),data("new")], before.version, {...audit,userId:"missing-actor"})).rejects.toThrow();
    expect(await store.getVersionedDocs()).toEqual(before);
  });
  it("rolls back save and deletion when audit persistence fails", async () => {
    const doc = await store.createVersionedDoc(data(), audit);
    const invalid = {...audit,userId:"missing-actor"};
    await expect(store.saveVersionedDoc(doc.id, data("one", "Changed"), doc.version, invalid)).rejects.toThrow();
    await expect(store.deleteVersionedDoc(doc.id, doc.version, invalid)).rejects.toThrow();
    expect((await store.getVersionedDocs()).docs[0].version).toBe(doc.version);
    await store.deleteVersionedDoc(doc.id, doc.version, audit);
    expect(await store.getDoc(doc.id)).toBeUndefined();
  });
  it("does not accept duplicate sync slugs or leave a partial refresh on a constraint failure", async () => {
    const doc = await store.createVersionedDoc(data(), audit);
    const before = await store.getVersionedDocs();
    await expect(store.synchronizeVersionedDocs([data(),data()], before.version, audit)).rejects.toThrow("Duplicate");
    await pool.query("ALTER TABLE docs ADD CONSTRAINT reject_fixture_content CHECK(content <> 'rejected')");
    try {
      await expect(store.synchronizeVersionedDocs([data("one","Changed"),data("two","rejected")], before.version, audit)).rejects.toThrow();
      expect(await store.getVersionedDocs()).toEqual(before);
      expect((await store.getDoc(doc.id))?.content).toBe("Original");
    } finally { await pool.query("ALTER TABLE docs DROP CONSTRAINT reject_fixture_content"); }
  });
});
