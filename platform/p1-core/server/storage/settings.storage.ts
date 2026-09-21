import { eq, sql, or, inArray } from "drizzle-orm";
import { db } from "../db";
import { systemSettings, activityLogs, type SystemSetting } from "@shared/schema";
import crypto from "crypto";
import { logger } from "../utils/logger";

const ALGORITHM = "aes-256-cbc";
const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

function getKey(): Buffer {
  return crypto.createHash("sha256").update(SECRET).digest();
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string, settingKey?: string): string {
  const [ivHex, encrypted] = text.split(":");
  if (!ivHex || !encrypted) return text;
  try {
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    logger.db.warn("Decryption failed, returning raw value", {
      settingKey: settingKey ?? "unknown",
    });
    return text;
  }
}

export class SettingsConflictError extends Error {
  readonly statusCode = 409;
  constructor() {
    super("These settings changed. Reload saved settings before applying your edits.");
  }
}

export class SettingsBoundaryError extends Error {
  readonly statusCode = 409;
  readonly code = "settings_boundary_mismatch";
  constructor() { super("Stored integration settings require category or secrecy reconciliation before editing."); }
}

function assertKeyRules(rows: SystemSetting[], category: string, rules: Readonly<Record<string, boolean>>) {
  if (rows.some(row => Object.prototype.hasOwnProperty.call(rules, row.key) &&
    (row.category !== category || row.isSecret !== rules[row.key]))) throw new SettingsBoundaryError();
}

function categoryVersion(rows: SystemSetting[]): string {
  const canonical = [...rows]
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((row) => [
      row.id,
      row.key,
      row.category,
      row.value,
      row.isSecret,
      row.updatedAt?.toISOString(),
    ]);
  // Bind the token to stored ciphertext without disclosing credential material.
  return crypto.createHmac("sha256", getKey()).update(JSON.stringify(canonical)).digest("hex");
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 60_000;

export class SettingsStorage {
  private categoryCache = new Map<string, CacheEntry<Record<string, string>>>();
  private settingCache = new Map<string, CacheEntry<string | null>>();
  private categoryKeyIndex = new Map<string, Set<string>>();
  private ttlMs: number;
  private cacheGeneration = 0;

  constructor(
    ttlMs: number = DEFAULT_TTL_MS,
    private database: typeof db = db,
  ) {
    this.ttlMs = ttlMs;
  }

  private isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
    return !!entry && Date.now() < entry.expiresAt;
  }

  private trackKeyCategory(key: string, category: string): void {
    let keys = this.categoryKeyIndex.get(category);
    if (!keys) {
      keys = new Set();
      this.categoryKeyIndex.set(category, keys);
    }
    keys.add(key);
  }

  invalidateCategory(category: string): void {
    this.cacheGeneration += 1;
    this.categoryCache.delete(category);
    const keysToRemove = this.categoryKeyIndex.get(category);
    if (keysToRemove) {
      for (const key of Array.from(keysToRemove)) {
        this.settingCache.delete(key);
      }
      this.categoryKeyIndex.delete(category);
    }
  }

  invalidateAll(): void {
    this.cacheGeneration += 1;
    this.categoryCache.clear();
    this.settingCache.clear();
    this.categoryKeyIndex.clear();
  }

  async getSetting(key: string): Promise<string | null> {
    const cached = this.settingCache.get(key);
    if (this.isFresh(cached)) return cached.data;

    const generation = this.cacheGeneration;
    const [setting] = await this.database
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    if (!setting) {
      if (generation === this.cacheGeneration)
        this.settingCache.set(key, { data: null, expiresAt: Date.now() + this.ttlMs });
      return null;
    }
    const value = setting.isSecret ? decrypt(setting.value, key) : setting.value;
    if (generation === this.cacheGeneration) {
      this.settingCache.set(key, { data: value, expiresAt: Date.now() + this.ttlMs });
      this.trackKeyCategory(key, setting.category);
    }
    return value;
  }

  /**
   * Returns a non-sensitive CAS token for one setting without decrypting or
   * exposing its value. Dedicated recovery controls use this only when a
   * setting's category/secrecy boundary is itself invalid.
   */
  async getSettingBoundarySnapshot(key: string): Promise<{ version: string }> {
    const [setting] = await this.database
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    const canonical = setting
      ? [
          setting.id,
          setting.key,
          setting.category,
          setting.value,
          setting.isSecret,
          setting.updatedAt?.toISOString(),
        ]
      : null;
    return {
      version: crypto.createHmac("sha256", getKey()).update(JSON.stringify(canonical)).digest("hex"),
    };
  }

  async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    return this.database.select().from(systemSettings).where(eq(systemSettings.category, category));
  }

  /** Fresh values and their revision come from the same database read, bypassing caches. */
  async getCategorySnapshot(
    category: string,
    publicOnly = false,
    keyRules?: Readonly<Record<string, boolean>>,
  ): Promise<{ values: Record<string, string>; version: string }> {
    const related = keyRules && Object.keys(keyRules).length
      ? await this.database.select().from(systemSettings).where(or(eq(systemSettings.category, category), inArray(systemSettings.key, Object.keys(keyRules))))
      : await this.getSettingsByCategory(category);
    if (keyRules) assertKeyRules(related, category, keyRules);
    const rows = related.filter(row => row.category === category);
    if (publicOnly && rows.some(row => row.isSecret)) throw new Error("Public setting category contains private data");
    return {
      values: Object.fromEntries(
        rows.map((row) => [row.key, row.isSecret ? decrypt(row.value, row.key) : row.value]),
      ),
      version: categoryVersion(rows),
    };
  }

  async getAllSettings(): Promise<SystemSetting[]> {
    return this.database.select().from(systemSettings);
  }

  async upsertSetting(
    key: string,
    value: string,
    category: string,
    isSecret: boolean,
  ): Promise<SystemSetting> {
    const [result] = await this.upsertSettings([{ key, value, category, isSecret }]);
    return result;
  }

  /** One committed setting set; preparation failures cannot leave partial credentials. */
  async upsertSettings(
    entries: { key: string; value: string; category: string; isSecret: boolean }[],
    expected?: { category: string; version: string; publicOnly?: boolean; keyRules?: Readonly<Record<string, boolean>> },
    audit?: { userId: string; action: string; details: string },
  ): Promise<SystemSetting[]> {
    if (!entries.length) return [];
    if (expected && entries.some((entry) => entry.category !== expected.category))
      throw new Error("Versioned setting batch must belong to one category");
    const keys = entries.map((entry) => entry.key);
    if (new Set(keys).size !== keys.length) throw new Error("Duplicate setting key in batch");
    // Encryption may fail: finish it before starting any database work.
    const values = entries
      .map((entry) => ({
        ...entry,
        value: entry.isSecret ? encrypt(entry.value) : entry.value,
        updatedAt: new Date(),
      }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    const rows = await this.database.transaction(async (tx) => {
      if (expected) {
        // Short metadata-only lock also coordinates unversioned legacy and direct SQL writes,
        // including first inserts/deletes; ordinary readers remain unblocked.
        await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
        await tx.execute(sql`LOCK TABLE system_settings IN SHARE ROW EXCLUSIVE MODE`);
        const current = await tx
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.category, expected.category));
        if (expected.keyRules) {
          const rules = expected.keyRules;
          const related = await tx.select().from(systemSettings).where(inArray(systemSettings.key, Object.keys(rules)));
          assertKeyRules(related, expected.category, rules);
          if (entries.some(entry => !Object.prototype.hasOwnProperty.call(rules, entry.key) || entry.isSecret !== rules[entry.key]))
            throw new SettingsBoundaryError();
        }
        if (expected.publicOnly) {
          if (current.some(row => row.isSecret) || entries.some(entry => entry.isSecret))
            throw new Error("Public setting boundary violation");
          for (const entry of entries) {
            const [prior] = await tx.select().from(systemSettings).where(eq(systemSettings.key,entry.key));
            if (prior && (prior.isSecret || prior.category !== expected.category))
              throw new Error("Public setting boundary violation");
          }
        }
        if (categoryVersion(current) !== expected.version) throw new SettingsConflictError();
      }
      const saved = await tx
        .insert(systemSettings)
        .values(values)
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: sql`excluded.value`,
            category: sql`excluded.category`,
            isSecret: sql`excluded.is_secret`,
            updatedAt: sql`excluded.updated_at`,
          },
        })
        .returning();
      if (audit) await tx.insert(activityLogs).values(audit);
      return saved;
    });
    // Only committed writes invalidate; generation fencing rejects older in-flight fills.
    this.invalidateAll();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return keys.map((key) => byKey.get(key)!);
  }

  /**
   * Repairs one explicitly named public setting after a category/secrecy
   * boundary mismatch. The caller supplies a fresh metadata-only CAS token;
   * the setting value is never returned by the recovery read.
   */
  async repairPublicSettingBoundary(
    entry: { key: string; value: string; category: string },
    expectedVersion: string,
    audit: { userId: string; action: string; details: string },
  ): Promise<SystemSetting> {
    const saved = await this.database.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      await tx.execute(sql`LOCK TABLE system_settings IN SHARE ROW EXCLUSIVE MODE`);
      const [current] = await tx.select().from(systemSettings).where(eq(systemSettings.key, entry.key));
      const canonical = current
        ? [
            current.id,
            current.key,
            current.category,
            current.value,
            current.isSecret,
            current.updatedAt?.toISOString(),
          ]
        : null;
      const currentVersion = crypto
        .createHmac("sha256", getKey())
        .update(JSON.stringify(canonical))
        .digest("hex");
      if (currentVersion !== expectedVersion) throw new SettingsConflictError();
      const [repaired] = await tx
        .insert(systemSettings)
        .values({ ...entry, isSecret: false, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: sql`excluded.value`,
            category: sql`excluded.category`,
            isSecret: false,
            updatedAt: sql`excluded.updated_at`,
          },
        })
        .returning();
      await tx.insert(activityLogs).values(audit);
      return repaired;
    });
    this.invalidateAll();
    return saved;
  }

  async readPrivateJson(key: string, category: string): Promise<unknown> {
    const [row] = await this.database
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    if (!row) return null;
    if (!row.isSecret || row.category !== category)
      throw new Error("Private setting boundary violation");
    return JSON.parse(decrypt(row.value, key));
  }

  /** Encrypted private JSON: lock covers absent rows too; readers never use stale cache. */
  async updatePrivateJson<T>(
    key: string,
    category: string,
    update: (current: unknown) => T,
  ): Promise<T> {
    const result = await this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${key}))`);
      const [row] = await tx.select().from(systemSettings).where(eq(systemSettings.key, key));
      if (row && (!row.isSecret || row.category !== category))
        throw new Error("Private setting boundary violation");
      const result = update(row ? JSON.parse(decrypt(row.value, key)) : null);
      const value = encrypt(JSON.stringify(result));
      await tx
        .insert(systemSettings)
        .values({ key, category, value, isSecret: true })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: { value, category, isSecret: true, updatedAt: new Date() },
        });
      return result;
    });
    this.invalidateAll();
    return result;
  }

  async deleteSetting(key: string): Promise<void> {
    await this.database.delete(systemSettings).where(eq(systemSettings.key, key));
    this.invalidateAll();
  }

  async getDecryptedValue(key: string): Promise<string | null> {
    return this.getSetting(key);
  }

  async getDecryptedCategory(category: string): Promise<Record<string, string>> {
    const cached = this.categoryCache.get(category);
    if (this.isFresh(cached)) return cached.data;

    const generation = this.cacheGeneration;
    const settings = await this.getSettingsByCategory(category);
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.isSecret ? decrypt(s.value, s.key) : s.value;
    }
    if (generation === this.cacheGeneration)
      this.categoryCache.set(category, { data: result, expiresAt: Date.now() + this.ttlMs });
    return result;
  }
}
