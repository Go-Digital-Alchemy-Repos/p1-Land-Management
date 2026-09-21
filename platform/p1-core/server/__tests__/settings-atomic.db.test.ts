import { parseSiteFeatures } from "@shared/site-features";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
vi.mock("../db", () => ({ db: {} }));
import { SettingsStorage } from "../storage/settings.storage";

const url = process.env.SETTINGS_TEST_DATABASE_URL;
const enabled = Boolean(url);
const suite = enabled ? describe : describe.skip;
let pool: pg.Pool;
let settings: SettingsStorage;
const entry = (key: string, value: string, category = "ecommerce_stripe", isSecret = false) => ({
  key,
  value,
  category,
  isSecret,
});
suite("atomic settings real database", () => {
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (
      !["postgres:", "postgresql:"].includes(parsed.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) ||
      parsed.pathname !== "/core_settings_test" ||
      parsed.search ||
      parsed.hash
    )
      throw new Error("Settings test requires dedicated loopback core_settings_test database");
    pool = new pg.Pool({ connectionString: url, max: 8 });
    await pool.query(
      `CREATE TABLE IF NOT EXISTS system_settings (id varchar PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE, value text NOT NULL, category text NOT NULL, is_secret boolean NOT NULL DEFAULT false, updated_at timestamp DEFAULT now());`,
    );
    await pool.query(
      "CREATE TABLE IF NOT EXISTS activity_logs (id varchar PRIMARY KEY DEFAULT gen_random_uuid(), user_id varchar NOT NULL, action text NOT NULL, details text, created_at timestamp DEFAULT now())",
    );
    settings = new SettingsStorage(60_000, drizzle(pool, { schema }));
  });
  beforeEach(async () => {
    await pool.query("TRUNCATE system_settings, activity_logs");
    settings.invalidateAll();
  });
  afterAll(async () => {
    if (pool) await pool.end();
  });
  it("rejects historical integration keys in the wrong category or secrecy class before reads and writes", async () => {
    const rules = { mailgun_domain: false, mailgun_api_key: true };
    await settings.upsertSetting("mailgun_api_key", "private", "wrong_category", true);
    const before = await settings.getCategorySnapshot("mailgun");
    await expect(settings.getCategorySnapshot("mailgun", false, rules)).rejects.toMatchObject({ code: "settings_boundary_mismatch" });
    await expect(settings.upsertSettings([entry("mailgun_domain", "mg.example.test", "mailgun")],
      { category: "mailgun", version: before.version, keyRules: rules })).rejects.toMatchObject({ code: "settings_boundary_mismatch" });
    expect((await settings.getCategorySnapshot("mailgun")).values).toEqual({});
    await settings.upsertSetting("mailgun_api_key", "private", "mailgun", false);
    await expect(settings.getCategorySnapshot("mailgun", false, rules)).rejects.toMatchObject({ code: "settings_boundary_mismatch" });
  });
  it("repairs a wrong public-setting boundary with a metadata-only CAS token and audit", async () => {
    await settings.upsertSetting("legacy_staff_crm_writes_fenced", "unreadable", "wrong", true);
    const before = await settings.getSettingBoundarySnapshot("legacy_staff_crm_writes_fenced");
    await settings.repairPublicSettingBoundary(
      {
        key: "legacy_staff_crm_writes_fenced",
        value: "false",
        category: "crm_cutover",
      },
      before.version,
      { userId: "owner", action: "legacy_staff_crm_write_fence_recovered", details: "{}" },
    );
    await expect(
      settings.getCategorySnapshot("crm_cutover", true, {
        legacy_staff_crm_writes_fenced: false,
      }),
    ).resolves.toMatchObject({ values: { legacy_staff_crm_writes_fenced: "false" } });
    expect(
      (
        await pool.query(
          "SELECT action,details FROM activity_logs WHERE action='legacy_staff_crm_write_fence_recovered'",
        )
      ).rows,
    ).toEqual([{ action: "legacy_staff_crm_write_fence_recovered", details: "{}" }]);
    await expect(
      settings.repairPublicSettingBoundary(
        {
          key: "legacy_staff_crm_writes_fenced",
          value: "true",
          category: "crm_cutover",
        },
        before.version,
        { userId: "owner", action: "legacy_staff_crm_write_fence_recovered", details: "{}" },
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
  it("checks every registered integration key under the write lock even when a secret is kept", async () => {
    const rules = { mailgun_domain: false, mailgun_api_key: true };
    await settings.upsertSetting("mailgun_api_key", "private", "mailgun", true);
    const before = await settings.getCategorySnapshot("mailgun", false, rules);
    await settings.upsertSettings([entry("mailgun_domain", "mg.example.test", "mailgun")],
      { category: "mailgun", version: before.version, keyRules: rules });
    const saved = await settings.getCategorySnapshot("mailgun", false, rules);
    expect(saved.values.mailgun_api_key).toBe("private");
    await expect(settings.upsertSettings([entry("unregistered", "x", "mailgun")],
      { category: "mailgun", version: saved.version, keyRules: rules })).rejects.toMatchObject({ code: "settings_boundary_mismatch" });
    expect((await settings.getCategorySnapshot("mailgun", false, rules)).version).toBe(saved.version);
  });
  it("rolls back every setting when one write fails and retains warm committed cache", async () => {
    await settings.upsertSettings([
      entry("active_mode", "test"),
      entry("secret_key", "old", "ecommerce_stripe", true),
    ]);
    expect((await settings.getDecryptedCategory("ecommerce_stripe")).active_mode).toBe("test");
    await pool.query(
      "ALTER TABLE system_settings ADD CONSTRAINT fixture_reject_bad CHECK (value <> 'reject-this-value')",
    );
    try {
      await expect(
        settings.upsertSettings([
          entry("active_mode", "live"),
          entry("last_field", "reject-this-value"),
        ]),
      ).rejects.toThrow();
      expect((await settings.getDecryptedCategory("ecommerce_stripe")).active_mode).toBe("test");
      expect(
        (await pool.query("SELECT value FROM system_settings WHERE key='active_mode'")).rows[0]
          .value,
      ).toBe("test");
      expect(
        (
          await pool.query(
            "SELECT count(*)::int AS count FROM system_settings WHERE key='last_field'",
          )
        ).rows[0].count,
      ).toBe(0);
    } finally {
      await pool.query("ALTER TABLE system_settings DROP CONSTRAINT fixture_reject_bad");
    }
  });
  it("concurrent first saves upsert without duplicate errors or torn durable credential sets", async () => {
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        settings.upsertSettings([
          entry("active_mode", String(index)),
          entry("publishable_key", String(index)),
          entry("secret_key", String(index), "ecommerce_stripe", true),
        ]),
      ),
    );
    settings.invalidateAll();
    const state = await settings.getDecryptedCategory("ecommerce_stripe");
    expect(new Set(Object.values(state)).size).toBe(1);
    expect(Object.keys(state)).toHaveLength(3);
    const stored = (await pool.query("SELECT value FROM system_settings WHERE key='secret_key'"))
      .rows[0].value;
    expect(stored).not.toBe(state.secret_key);
    expect(stored).toMatch(/^[0-9a-f]{32}:/);
  });
  it("readers observe complete sets while concurrent writes run", async () => {
    await settings.upsertSettings([entry("a", "0"), entry("b", "0")]);
    const reader = await pool.connect();
    try {
      const observations = (async () => {
        for (let i = 0; i < 50; i++) {
          const { rows } = await reader.query(
            "SELECT value FROM system_settings WHERE key IN ('a','b')",
          );
          expect(new Set(rows.map((row) => row.value)).size).toBe(1);
        }
      })();
      const writers = Array.from({ length: 20 }, (_, i) =>
        settings.upsertSettings([entry("a", String(i)), entry("b", String(i))]),
      );
      await Promise.all([...writers, observations]);
    } finally {
      reader.release();
    }
  });
  it("single writes preserve return shape and invalidate old and new category caches", async () => {
    await settings.upsertSetting("moving", "before", "old", false);
    expect(await settings.getDecryptedCategory("old")).toEqual({ moving: "before" });
    expect(await settings.getDecryptedCategory("new")).toEqual({});
    const result = await settings.upsertSetting("moving", "after", "new", false);
    expect(result).toMatchObject({ key: "moving", value: "after", category: "new" });
    expect(await settings.getDecryptedCategory("old")).toEqual({});
    expect(await settings.getDecryptedCategory("new")).toEqual({ moving: "after" });
  });
  it("rejects duplicate keys before writes", async () => {
    await expect(settings.upsertSettings([entry("same", "a"), entry("same", "b")])).rejects.toThrow(
      "Duplicate",
    );
    expect(
      (await pool.query("SELECT count(*)::int AS count FROM system_settings")).rows[0].count,
    ).toBe(0);
  });
  it("versioned first saves have one winner and snapshots bypass cached categories", async () => {
    const original = await settings.getCategorySnapshot("career_center");
    expect(original.values).toEqual({});
    const results = await Promise.allSettled(
      ["a", "b"].map((value) =>
        settings.upsertSettings(
          [
            entry("share_enabled", value, "career_center"),
            entry("indeed_apply_secret", value, "career_center", true),
          ],
          { category: "career_center", version: original.version },
        ),
      ),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason.statusCode).toBe(409);
    const current = await settings.getCategorySnapshot("career_center");
    expect(new Set(Object.values(current.values)).size).toBe(1);
    expect(current.version).not.toBe(original.version);
    await settings.getDecryptedCategory("career_center");
    await pool.query("UPDATE system_settings SET value='direct-change' WHERE key='share_enabled'");
    const fresh = await settings.getCategorySnapshot("career_center");
    expect(fresh.values.share_enabled).toBe("direct-change");
    expect(fresh.version).not.toBe(current.version);
    await expect(
      settings.upsertSettings([entry("share_enabled", "stale", "career_center")], {
        category: "career_center",
        version: current.version,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("credential replacements and deletions invalidate versions; unrelated categories do not", async () => {
    await settings.upsertSetting("indeed_apply_secret", "old", "career_center", true);
    const original = await settings.getCategorySnapshot("career_center");
    await settings.upsertSetting("unrelated", "value", "another_category", false);
    expect((await settings.getCategorySnapshot("career_center")).version).toBe(original.version);
    await settings.upsertSetting("indeed_apply_secret", "replacement", "career_center", true);
    const next = await settings.getCategorySnapshot("career_center");
    expect(next.version).not.toBe(original.version);
    await expect(
      settings.upsertSettings([entry("share_enabled", "true", "career_center")], {
        category: "career_center",
        version: original.version,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await settings.deleteSetting("indeed_apply_secret");
    await expect(
      settings.upsertSettings([entry("share_enabled", "true", "career_center")], {
        category: "career_center",
        version: next.version,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("a legacy transaction completing during a versioned save forces a conflict", async () => {
    await settings.upsertSetting("share_enabled", "before", "career_center", false);
    const original = await settings.getCategorySnapshot("career_center");
    const legacy = await pool.connect();
    try {
      await legacy.query("BEGIN");
      await legacy.query("UPDATE system_settings SET value='legacy' WHERE key='share_enabled'");
      const attempt = settings
        .upsertSettings([entry("share_enabled", "native", "career_center")], {
          category: "career_center",
          version: original.version,
        })
        .then(
          () => "saved",
          (error) => error.statusCode,
        );
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const result = await pool.query(
          "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'LOCK TABLE system_settings%'",
        );
        if (result.rowCount) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
      await legacy.query("COMMIT");
      expect(await attempt).toBe(409);
      expect((await settings.getCategorySnapshot("career_center")).values.share_enabled).toBe(
        "legacy",
      );
    } finally {
      await legacy.query("ROLLBACK");
      legacy.release();
    }
  });
  it("credential removal keeps ciphertext storage, disables the integration atomically and cannot clear a newer value", async () => {
    await settings.upsertSettings([
      entry("indeed_apply_enabled", "true", "career_center"),
      entry("indeed_apply_secret", "old", "career_center", true),
    ]);
    const snapshot = await settings.getCategorySnapshot("career_center");
    const changes = [
      entry("indeed_apply_enabled", "false", "career_center"),
      entry("indeed_apply_secret", "", "career_center", true),
    ];
    await settings.upsertSettings(changes, {
      category: "career_center",
      version: snapshot.version,
    });
    const current = await settings.getCategorySnapshot("career_center");
    expect(current.values).toEqual({ indeed_apply_enabled: "false", indeed_apply_secret: "" });
    const stored = (
      await pool.query(
        "SELECT value,is_secret FROM system_settings WHERE key='indeed_apply_secret'",
      )
    ).rows[0];
    expect(stored.is_secret).toBe(true);
    expect(stored.value).toMatch(/^[0-9a-f]{32}:/);
    await settings.upsertSetting("indeed_apply_secret", "newer", "career_center", true);
    await expect(
      settings.upsertSettings(changes, { category: "career_center", version: current.version }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect((await settings.getCategorySnapshot("career_center")).values.indeed_apply_secret).toBe(
      "newer",
    );
  });
  it("public settings reject category/secret collisions and roll back when their audit cannot commit",async()=>{
    await pool.query("CREATE TABLE IF NOT EXISTS activity_logs (id varchar PRIMARY KEY DEFAULT gen_random_uuid(),user_id varchar NOT NULL,action text NOT NULL,details text,created_at timestamp DEFAULT now())");
    const category="head_tag_additions",key="public_head_html";
    await settings.upsertSetting(key,"private","other",true);
    const empty=await settings.getCategorySnapshot(category,true);
    await expect(settings.upsertSettings([entry(key,"replacement",category)],{category,version:empty.version,publicOnly:true})).rejects.toThrow(/boundary/);
    expect(await settings.getSetting(key)).toBe("private");
    await pool.query("TRUNCATE system_settings");settings.invalidateAll();
    await settings.upsertSetting(key,"private",category,true);
    await expect(settings.getCategorySnapshot(category,true)).rejects.toThrow(/private data/);
    await pool.query("TRUNCATE system_settings");settings.invalidateAll();
    const first=await settings.getCategorySnapshot(category,true);
    const audit={userId:"owner",action:"website_head_tags_updated",details:key};
    await pool.query("ALTER TABLE activity_logs ADD CONSTRAINT fixture_audit_failure CHECK(action<>'website_head_tags_updated')");
    try {await expect(settings.upsertSettings([entry(key,"raw",category)],{category,version:first.version,publicOnly:true},audit)).rejects.toThrow();expect(await settings.getSetting(key)).toBe(null);}finally{await pool.query("ALTER TABLE activity_logs DROP CONSTRAINT fixture_audit_failure");}
    await settings.upsertSettings([entry(key,"<script>literal()</script>",category)],{category,version:first.version,publicOnly:true},audit);
    expect(await settings.getSetting(key)).toBe("<script>literal()</script>");
    expect((await pool.query("SELECT action,details FROM activity_logs WHERE action=$1",[audit.action])).rows).toEqual([{action:audit.action,details:key}]);
    await expect(settings.upsertSettings([entry(key,"stale",category)],{category,version:first.version,publicOnly:true},audit)).rejects.toMatchObject({statusCode:409});
  });

  it("website feature flags commit as one set, preserve unknown settings, and invalidate runtime caches",async()=>{
    await pool.query("CREATE TABLE IF NOT EXISTS activity_logs (id varchar PRIMARY KEY DEFAULT gen_random_uuid(),user_id varchar NOT NULL,action text NOT NULL,details text,created_at timestamp DEFAULT now())");
    const category="system_configuration", keys=["enable_cms","enable_blog","enable_events","enable_crm","enable_careers"];
    await settings.upsertSettings([...keys.map(key=>entry(key,"true",category)),entry("future_setting","preserve",category)]);
    expect(Object.values(parseSiteFeatures(await settings.getDecryptedCategory(category)))).toEqual(Array(5).fill(true));
    const snapshot=await settings.getCategorySnapshot(category,true),changes=keys.map(key=>entry(key,"false",category)),audit={userId:"owner",action:"website_features_updated",details:"fixture"};
    await pool.query("ALTER TABLE system_settings ADD CONSTRAINT fixture_reject_flag CHECK(key<>'enable_crm' OR value<>'false')");
    try{await expect(settings.upsertSettings(changes,{category,version:snapshot.version,publicOnly:true},audit)).rejects.toThrow();expect(Object.values(parseSiteFeatures(await settings.getDecryptedCategory(category)))).toEqual(Array(5).fill(true));}finally{await pool.query("ALTER TABLE system_settings DROP CONSTRAINT fixture_reject_flag");}
    await settings.upsertSettings(changes,{category,version:snapshot.version,publicOnly:true},audit);
    expect(Object.values(parseSiteFeatures(await settings.getDecryptedCategory(category)))).toEqual(Array(5).fill(false));
    expect(await settings.getSetting("future_setting")).toBe("preserve");
    await expect(settings.upsertSettings(keys.map(key=>entry(key,"true",category)),{category,version:snapshot.version,publicOnly:true},audit)).rejects.toMatchObject({statusCode:409});
    expect((await pool.query("SELECT count(*)::int n FROM activity_logs WHERE action='website_features_updated'")).rows[0].n).toBe(1);
  });

  it("partial website color changes preserve legacy branding and cannot overwrite a newer category",async()=>{
    await pool.query("CREATE TABLE IF NOT EXISTS activity_logs (id varchar PRIMARY KEY DEFAULT gen_random_uuid(),user_id varchar NOT NULL,action text NOT NULL,details text,created_at timestamp DEFAULT now())");
    await settings.upsertSettings([entry("brand_primary_color","legacy custom","branding"),entry("company_name","Synthetic company","branding"),entry("text_muted_color","#111111","branding")]);
    const snapshot=await settings.getCategorySnapshot("branding",true);
    const changes=[entry("text_body_color","#123456","branding"),entry("text_link_color","","branding")];
    const audit={userId:"editor",action:"website_colors_updated",details:JSON.stringify(["text_body_color","text_link_color"])};
    await pool.query("ALTER TABLE activity_logs ADD CONSTRAINT fixture_color_audit_failure CHECK(action<>'website_colors_updated')");
    try{await expect(settings.upsertSettings(changes,{category:"branding",version:snapshot.version,publicOnly:true},audit)).rejects.toThrow();expect(await settings.getSetting("text_body_color")).toBe(null);}finally{await pool.query("ALTER TABLE activity_logs DROP CONSTRAINT fixture_color_audit_failure");}
    await settings.upsertSettings(changes,{category:"branding",version:snapshot.version,publicOnly:true},audit);
    expect(await settings.getDecryptedCategory("branding")).toEqual({brand_primary_color:"legacy custom",company_name:"Synthetic company",text_muted_color:"#111111",text_body_color:"#123456",text_link_color:""});
    const current=await settings.getCategorySnapshot("branding",true);
    await settings.upsertSetting("company_name","Newer name","branding",false);
    await expect(settings.upsertSettings([entry("text_body_color","#abcdef","branding")],{category:"branding",version:current.version,publicOnly:true},audit)).rejects.toMatchObject({statusCode:409});
    expect(await settings.getSetting("text_body_color")).toBe("#123456");
    expect((await pool.query("SELECT count(*)::int n FROM activity_logs WHERE action='website_colors_updated'")).rows[0].n).toBe(1);
  });

});
