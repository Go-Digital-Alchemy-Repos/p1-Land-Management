import { assertUploadMutationsAllowed } from "./upload-mutation-policy";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { logger } from "../utils/logger";
import { retryOnce } from "../utils/retry";
import { getClientStoragePrefix } from "../../shared/client-backup-policy";

interface R2Config {
  accountId?: string;
  endpoint?: string;
  region?: string;
  forcePathStyle?: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
  prefix: string;
}

/** Dedicated P1 bucket configuration. Partial environment config fails closed. */
export function getEnvironmentS3Config(
  variablePrefix = "S3",
  purpose: "uploads" | "backups" = "uploads",
): R2Config | null | undefined {
  const names = ["ENDPOINT", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET", "REGION", "FORCE_PATH_STYLE"];
  if (!names.some((name) => process.env[`${variablePrefix}_${name}`] !== undefined)) return undefined;
  const endpoint = process.env[`${variablePrefix}_ENDPOINT`]?.trim();
  const accessKeyId = process.env[`${variablePrefix}_ACCESS_KEY_ID`]?.trim();
  const secretAccessKey = process.env[`${variablePrefix}_SECRET_ACCESS_KEY`];
  const bucketName = process.env[`${variablePrefix}_BUCKET`]?.trim();
  const pathStyle = process.env[`${variablePrefix}_FORCE_PATH_STYLE`] ?? "true";
  try {
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) throw new Error("Incomplete configuration");
    const parsed = new URL(endpoint);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("Invalid endpoint");
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucketName)) throw new Error("Invalid bucket");
    if (!["true", "false"].includes(pathStyle)) throw new Error("Invalid path style");
    return {
      endpoint, accessKeyId, secretAccessKey, bucketName,
      region: process.env[`${variablePrefix}_REGION`]?.trim() || "auto",
      forcePathStyle: pathStyle === "true",
      publicUrl: "",
      prefix: `clients/p1landmanagement.com/${purpose}`,
    };
  } catch {
    logger.r2.warn("Dedicated S3 configuration is invalid or incomplete; storage unavailable");
    return null;
  }
}

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function buildAppServedObjectUrl(key: string): string {
  const normalizedKey = key
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/r2/${normalizedKey}`;
}

function getConfiguredPublicBaseUrl(configuredPublicUrl: string): string | null {
  const trimmed = configuredPublicUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.endsWith(".r2.cloudflarestorage.com")) {
      logger.r2.warn(
        "Configured public URL uses the private R2 API host; serving R2 files through the app instead",
        {
          configuredPublicUrl: trimmed,
        },
      );
      return null;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    logger.r2.warn("Configured public URL is invalid; serving R2 files through the app instead", {
      configuredPublicUrl: trimmed,
    });
    return null;
  }
}

function buildPublicObjectUrl(baseUrl: string, key: string): string {
  const normalizedKey = key.replace(/^\/+/, "");
  return `${baseUrl.replace(/\/$/, "")}/${normalizedKey}`;
}

function qualifyKey(key: string, prefix: string): string {
  const normalized = key.replace(/^\/+/, "");
  // eslint-disable-next-line no-control-regex -- reject C0/DEL characters at the storage trust boundary
  if (!normalized || normalized.includes("\\") || /[\x00-\x1f\x7f]/.test(normalized) || normalized.split("/").some((part) => part === "." || part === "..")) {
    throw new Error("Invalid storage key");
  }
  return `${prefix}/${normalized}`.replace(/\/{2,}/g, "/");
}

function logicalKey(key: string, prefix: string): string {
  const normalizedKey = key.replace(/^\/+/, "");
  const namespace = `${prefix}/`;
  return normalizedKey.startsWith(namespace)
    ? normalizedKey.slice(namespace.length)
    : normalizedKey;
}

function getPublicObjectUrl(key: string, configuredPublicUrl: string, prefix: string): string {
  const configuredBaseUrl = getConfiguredPublicBaseUrl(configuredPublicUrl);
  if (configuredBaseUrl) {
    return buildPublicObjectUrl(configuredBaseUrl, qualifyKey(key, prefix));
  }

  return buildAppServedObjectUrl(key);
}

function getObjectKeyFromUrl(url: URL, bucketName: string): string {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] === bucketName) {
    segments.shift();
  }

  return segments.map((segment) => decodeURIComponent(segment)).join("/");
}

async function getR2Config(): Promise<R2Config | null> {
  const environment = getEnvironmentS3Config();
  if (environment !== undefined) return environment;
  try {
    const { storage } = await import("../storage/index");
    const settings = await storage.settings.getDecryptedCategory("cloudflare_r2");
    const accountId = settings["r2_account_id"];
    const accessKeyId = settings["r2_access_key_id"];
    const secretAccessKey = settings["r2_secret_access_key"];
    const bucketName = settings["r2_bucket_name"];
    const publicUrl = settings["r2_public_url"] || "";

    if (accountId && accessKeyId && secretAccessKey && bucketName) {
      return {
        accountId,
        accessKeyId,
        secretAccessKey,
        bucketName,
        publicUrl,
        prefix: `${getClientStoragePrefix(process.env.CLIENT_STACK_ID, process.env.PUBLIC_SITE_ORIGIN)}/uploads`,
      };
    }
  } catch (err) {
    logger.r2.warn("Failed to load R2 configuration", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return null;
}

async function getClient(): Promise<{
  client: S3Client;
  bucketName: string;
  publicUrl: string;
  prefix: string;
} | null> {
  if (cachedClient && cachedConfig) {
    return {
      client: cachedClient,
      bucketName: cachedConfig.bucketName,
      publicUrl: cachedConfig.publicUrl,
      prefix: cachedConfig.prefix,
    };
  }

  const config = await getR2Config();
  if (!config) return null;

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

  return {
    client: cachedClient,
    bucketName: config.bucketName,
    publicUrl: config.publicUrl,
    prefix: config.prefix,
  };
}

export async function isConfigured(): Promise<boolean> {
  if (cachedClient && cachedConfig) return true;
  const config = await getR2Config();
  return config !== null;
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  assertUploadMutationsAllowed();
  const r2 = await getClient();
  if (!r2) {
    logger.r2.warn("Not configured — cannot upload file", { key });
    return null;
  }

  try {
    await retryOnce(
      () =>
        r2.client.send(
          new PutObjectCommand({
            Bucket: r2.bucketName,
            Key: qualifyKey(key, r2.prefix),
            Body: buffer,
            ContentType: contentType,
          }),
        ),
      "R2 upload",
    );

    const publicUrl = getPublicObjectUrl(key, r2.publicUrl, r2.prefix);

    logger.r2.info("File uploaded", { key });
    return publicUrl;
  } catch (err) {
    logger.r2.error("Upload failed", err, { key });
    return null;
  }
}

export async function deleteFile(key: string): Promise<boolean> {
  assertUploadMutationsAllowed();
  const r2 = await getClient();
  if (!r2) return false;

  try {
    await retryOnce(
      () =>
        r2.client.send(
          new DeleteObjectCommand({
            Bucket: r2.bucketName,
            Key: qualifyKey(key, r2.prefix),
          }),
        ),
      "R2 delete",
    );
    logger.r2.info("File deleted", { key });
    return true;
  } catch (err) {
    logger.r2.error("Delete failed", err, { key });
    return false;
  }
}

export async function downloadFile(
  key: string,
): Promise<{ buffer: Buffer; contentType: string | null } | null> {
  const r2 = await getClient();
  if (!r2) return null;

  try {
    const response = await retryOnce(
      () =>
        r2.client.send(
          new GetObjectCommand({
            Bucket: r2.bucketName,
            Key: qualifyKey(key, r2.prefix),
          }),
        ),
      "R2 download",
    );

    const bytes = await response.Body?.transformToByteArray?.();
    if (!bytes) {
      return null;
    }

    return {
      buffer: Buffer.from(bytes),
      contentType: response.ContentType ?? null,
    };
  } catch (err) {
    logger.r2.error("Download failed", err, { key });
    return null;
  }
}

export async function testConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  const r2 = await getClient();
  if (!r2) {
    return { success: false, message: "Object storage not configured" };
  }

  try {
    await r2.client.send(new HeadBucketCommand({ Bucket: r2.bucketName }));
    return { success: true, message: "Object storage connection successful" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

export function resetClient(): void {
  cachedClient = null;
  cachedConfig = null;
}

export async function normalizePublicUrl(
  url: string | null | undefined,
): Promise<string | null | undefined> {
  if (!url) return url;

  if (url.startsWith("/r2/")) {
    return url;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (
    !parsed.hostname.endsWith(".r2.cloudflarestorage.com") &&
    !parsed.hostname.endsWith(".r2.dev")
  ) {
    return url;
  }

  const r2 = await getClient();
  if (!r2) return url;

  const objectKey = logicalKey(getObjectKeyFromUrl(parsed, r2.bucketName), r2.prefix);
  return getPublicObjectUrl(objectKey, r2.publicUrl, r2.prefix);
}
