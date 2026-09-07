import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { systemSettings, type SystemSetting } from "@shared/schema";
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

  async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
    return this.database.select().from(systemSettings).where(eq(systemSettings.category, category));
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
  ): Promise<SystemSetting[]> {
    if (!entries.length) return [];
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
      return tx
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
    });
    // Only committed writes invalidate; generation fencing rejects older in-flight fills.
    this.invalidateAll();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return keys.map((key) => byKey.get(key)!);
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
