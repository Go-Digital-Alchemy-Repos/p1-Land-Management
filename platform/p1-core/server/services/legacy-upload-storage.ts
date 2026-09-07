import { GetObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";

export interface MigrationObject {
  body: Buffer;
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  etag?: string;
  versionId?: string;
}

export interface LegacyUploadStorage {
  readonly bucketName: string;
  read(key: string): Promise<MigrationObject | null>;
  createOnly(key: string, object: MigrationObject): Promise<"created" | "already-exists">;
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const MAX_ALLOWED_BYTES = 100 * 1024 * 1024;

function statusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("$metadata" in error)) return undefined;
  const metadata = error.$metadata;
  if (typeof metadata !== "object" || metadata === null || !("httpStatusCode" in metadata))
    return undefined;
  return typeof metadata.httpStatusCode === "number" ? metadata.httpStatusCode : undefined;
}

function validateKey(key: string): void {
  if (
    !key ||
    key.includes("\\") ||
    key.split("/").some((part) => !part || part === "." || part === "..") ||
    Array.from(key).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  ) {
    throw new Error("Invalid exact migration object key");
  }
}

/** Explicit injected client only. No credentials, environment discovery, listing or deletion. */
export function createLegacyUploadStorage(
  client: S3Client,
  bucket: string,
  maxBytes = DEFAULT_MAX_BYTES,
  timeoutMs = 30_000,
): LegacyUploadStorage {
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error("Invalid exact bucket");
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > MAX_ALLOWED_BYTES) {
    throw new Error("Migration byte limit must be a positive integer no greater than 100 MiB");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300_000) {
    throw new Error("Migration timeout must be a positive integer no greater than 300000 ms");
  }
  return {
    bucketName: bucket,
    async read(key) {
      validateKey(key);
      const controller = new AbortController();
      let destroyBody: (() => void) | undefined;
      const timer = setTimeout(() => {
        controller.abort();
        destroyBody?.();
      }, timeoutMs);
      try {
        let response;
        try {
          response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), {
            abortSignal: controller.signal,
          });
        } catch (error) {
          if (statusCode(error) === 404) return null;
          throw error;
        }
        const stream = response.Body;
        if (!stream) throw new Error("Migration object response has no body");
        // Node S3 streams support async iteration. Do not use transformToByteArray, which buffers unbounded data.
        if (
          !(Symbol.asyncIterator in stream) ||
          !("destroy" in stream) ||
          typeof stream.destroy !== "function"
        )
          throw new Error("Migration object body is not a cancellable Node stream");
        const destroy = () => {
          if ("destroy" in stream && typeof stream.destroy === "function") stream.destroy();
        };
        destroyBody = destroy;
        if (controller.signal.aborted) {
          destroy();
          throw new Error("Migration object read deadline exceeded");
        }
        try {
          if (
            response.ContentLength !== undefined &&
            (!Number.isSafeInteger(response.ContentLength) ||
              response.ContentLength < 0 ||
              response.ContentLength > maxBytes)
          ) {
            throw new Error("Migration object exceeds byte limit or has invalid length");
          }
          const chunks: Buffer[] = [];
          let size = 0;
          for await (const chunk of stream) {
            if (!(chunk instanceof Uint8Array))
              throw new Error("Migration object stream returned non-byte data");
            size += chunk.byteLength;
            if (size > maxBytes) throw new Error("Migration object exceeds byte limit");
            chunks.push(Buffer.from(chunk));
          }
          if (controller.signal.aborted) throw new Error("Migration object read deadline exceeded");
          if (response.ContentLength !== undefined && size !== response.ContentLength) {
            throw new Error("Migration object length does not match response");
          }
          return {
            body: Buffer.concat(chunks, size),
            ...(response.ContentType === undefined ? {} : { contentType: response.ContentType }),
            ...(response.CacheControl === undefined ? {} : { cacheControl: response.CacheControl }),
            ...(response.ContentDisposition === undefined
              ? {}
              : { contentDisposition: response.ContentDisposition }),
            ...(response.ETag === undefined ? {} : { etag: response.ETag }),
            ...(response.VersionId === undefined ? {} : { versionId: response.VersionId }),
          };
        } finally {
          destroy();
        }
      } finally {
        clearTimeout(timer);
      }
    },
    async createOnly(key, object) {
      validateKey(key);
      if (!Buffer.isBuffer(object.body) || object.body.length > maxBytes) {
        throw new Error("Migration object body is invalid or exceeds byte limit");
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: object.body,
            ContentLength: object.body.length,
            ContentType: object.contentType,
            CacheControl: object.cacheControl,
            ContentDisposition: object.contentDisposition,
            IfNoneMatch: "*",
          }),
          { abortSignal: controller.signal },
        );
        if (controller.signal.aborted) throw new Error("Migration object write deadline exceeded");
        return "created";
      } catch (error) {
        if (statusCode(error) === 412) return "already-exists";
        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
