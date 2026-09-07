import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { logger } from "../utils/logger";
import { getEnvironmentS3Config } from "./r2.service";
import { getClientBackupPrefix } from "../../shared/client-backup-policy";

interface BackupStorageConfig {
  accountId?: string;
  endpoint?: string;
  region?: string;
  forcePathStyle?: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  prefix: string;
  source: "env" | "settings";
}

interface BackupObjectSummary {
  key: string;
  size: number;
  lastModified: string | null;
}

interface ByteArrayTransformable {
  transformToByteArray: () => Promise<Uint8Array>;
}

let cachedClient: S3Client | null = null;
let cachedConfig: BackupStorageConfig | null = null;

function normalizePrefix(prefix: string | undefined): string {
  return getClientBackupPrefix(process.env.CLIENT_STACK_ID, process.env.PUBLIC_SITE_ORIGIN, prefix);
}

async function loadConfigFromSettings(): Promise<BackupStorageConfig | null> {
  try {
    const { storage } = await import("../storage");
    const settings = await storage.settings.getDecryptedCategory("cloudflare_r2");
    const accountId = settings["r2_account_id"];
    const accessKeyId = settings["r2_access_key_id"];
    const secretAccessKey = settings["r2_secret_access_key"];
    const bucketName = settings["r2_bucket_name"];

    if (accountId && accessKeyId && secretAccessKey && bucketName) {
      return {
        accountId,
        accessKeyId,
        secretAccessKey,
        bucketName,
        prefix: normalizePrefix(process.env.BACKUP_R2_PREFIX),
        source: "settings",
      };
    }
  } catch (error) {
    logger.backup.warn("Failed to load backup storage config from app settings", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return null;
}

async function loadConfig(): Promise<BackupStorageConfig | null> {
  const dedicated = getEnvironmentS3Config("BACKUP_S3", "backups");
  const environment = dedicated !== undefined ? dedicated : getEnvironmentS3Config("S3", "backups");
  if (environment !== undefined) return environment ? { ...environment, source: "env" } : null;
  const envAccountId = process.env.BACKUP_R2_ACCOUNT_ID;
  const envAccessKeyId = process.env.BACKUP_R2_ACCESS_KEY_ID;
  const envSecretAccessKey = process.env.BACKUP_R2_SECRET_ACCESS_KEY;
  const envBucketName = process.env.BACKUP_R2_BUCKET_NAME;

  if (envAccountId && envAccessKeyId && envSecretAccessKey && envBucketName) {
    return {
      accountId: envAccountId,
      accessKeyId: envAccessKeyId,
      secretAccessKey: envSecretAccessKey,
      bucketName: envBucketName,
      prefix: normalizePrefix(process.env.BACKUP_R2_PREFIX),
      source: "env",
    };
  }

  return loadConfigFromSettings();
}

async function getClient(): Promise<{ client: S3Client; config: BackupStorageConfig } | null> {
  if (cachedClient && cachedConfig) {
    return { client: cachedClient, config: cachedConfig };
  }

  const config = await loadConfig();
  if (!config) {
    return null;
  }

  cachedConfig = config;
  cachedClient = new S3Client({
    region: config.region ?? "auto",
    endpoint: config.endpoint ?? `https://${config.accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client: cachedClient, config };
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (!stream) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(stream)) {
    return stream;
  }

  if (typeof stream === "string") {
    return Buffer.from(stream);
  }

  if (
    typeof stream === "object" &&
    stream !== null &&
    "transformToByteArray" in stream &&
    typeof stream.transformToByteArray === "function"
  ) {
    const bytes = await (stream as ByteArrayTransformable).transformToByteArray();
    return Buffer.from(bytes);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    (stream as NodeJS.ReadableStream)
      .on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .on("error", reject);
  });
}

function qualifyKey(key: string, prefixOverride?: string): string {
  const normalizedKey = key.replace(/^\/+/, "");
  const prefix = normalizePrefix(prefixOverride ?? cachedConfig?.prefix);
  return `${prefix}/${normalizedKey}`.replace(/\/+/g, "/");
}

function isSafeRelativeKey(key: string): boolean {
  const normalizedKey = key.replace(/^\/+/, "");
  return (
    Boolean(normalizedKey) &&
    normalizedKey
      .split("/")
      .every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

function isQualifiedKeyForPrefix(key: string, prefix: string): boolean {
  const normalizedKey = key.replace(/^\/+/, "");
  const normalizedPrefix = normalizePrefix(prefix);
  return isSafeRelativeKey(normalizedKey) && normalizedKey.startsWith(`${normalizedPrefix}/`);
}

export async function isBackupStorageConfigured(): Promise<boolean> {
  return (await loadConfig()) !== null;
}

export async function getBackupStorageInfo() {
  const result = await getClient();
  if (!result) return null;

  return {
    bucketName: result.config.bucketName,
    prefix: result.config.prefix,
    source: result.config.source,
  };
}

export async function uploadBackupObject(
  key: string,
  body: Buffer,
  contentType: string,
  options?: { contentEncoding?: string; metadata?: Record<string, string> },
): Promise<{ key: string } | null> {
  const result = await getClient();
  if (!result) return null;

  if (!isSafeRelativeKey(key)) {
    logger.backup.warn("Refusing backup upload with an unsafe relative object key", { key });
    return null;
  }

  const qualifiedKey = qualifyKey(key, result.config.prefix);

  await result.client.send(
    new PutObjectCommand({
      Bucket: result.config.bucketName,
      Key: qualifiedKey,
      Body: body,
      ContentType: contentType,
      ContentEncoding: options?.contentEncoding,
      Metadata: options?.metadata,
    }),
  );

  return { key: qualifiedKey };
}

export async function downloadBackupObject(key: string): Promise<Buffer | null> {
  const result = await getClient();
  if (!result) return null;

  if (!isQualifiedKeyForPrefix(key, result.config.prefix)) {
    logger.backup.warn("Refusing backup download outside the configured client prefix", { key });
    return null;
  }

  const response = await result.client.send(
    new GetObjectCommand({
      Bucket: result.config.bucketName,
      Key: key,
    }),
  );

  return streamToBuffer(response.Body);
}

export async function listBackupObjects(
  relativePrefix = "",
  maxKeys = 100,
): Promise<BackupObjectSummary[]> {
  const result = await getClient();
  if (!result) return [];

  if (relativePrefix && !isSafeRelativeKey(relativePrefix)) {
    logger.backup.warn("Refusing backup list with an unsafe relative prefix", { relativePrefix });
    return [];
  }

  const prefix = relativePrefix
    ? qualifyKey(relativePrefix, result.config.prefix)
    : `${normalizePrefix(result.config.prefix)}/`;

  const response = await result.client.send(
    new ListObjectsV2Command({
      Bucket: result.config.bucketName,
      Prefix: prefix,
      MaxKeys: maxKeys,
    }),
  );

  return (response.Contents ?? [])
    .filter((item): item is NonNullable<typeof item> & { Key: string } => Boolean(item?.Key))
    .map((item) => ({
      key: item.Key,
      size: item.Size ?? 0,
      lastModified: item.LastModified ? item.LastModified.toISOString() : null,
    }))
    .sort((a, b) => {
      const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return bTime - aTime;
    });
}

export async function deleteBackupObject(key: string): Promise<void> {
  const result = await getClient();
  if (!result) return;

  if (!isQualifiedKeyForPrefix(key, result.config.prefix)) {
    logger.backup.warn("Refusing backup deletion outside the configured client prefix", { key });
    return;
  }

  await result.client.send(
    new DeleteObjectCommand({
      Bucket: result.config.bucketName,
      Key: key,
    }),
  );
}

export function resetBackupStorageClient() {
  cachedClient = null;
  cachedConfig = null;
}
