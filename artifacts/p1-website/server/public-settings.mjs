import { open, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
/** Bounded read-only Core projections. Callers provide fixed paths and strict projection parsers. */
export function createPublicSettingsStore({
  origin,
  path,
  parse,
  fallback,
  fetcher = fetch,
  now = Date.now,
  ttl = 30000,
  timeout = 1800,
  maxBytes = 16384,
  preserveLastValid = false,
  cacheFile,
}) {
  let cached = { value: fallback(), expires: 0 },
    pending, diskLoaded = false, generation = 0;
  async function read(response) {
    if (
      response.status !== 200 ||
      !/^application\/json(?:\s*;|$)/i.test(
        response.headers.get("content-type") || "",
      )
    )
      throw Error("Invalid response");
    const length = response.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes))
      throw Error("Oversized projection");
    if (!response.body) throw Error("Missing projection");
    const reader = response.body.getReader(),
      chunks = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw Error("Oversized projection");
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return parse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
  }
  return {
    invalidate() { generation++; cached.expires = 0; },
    async snapshot() {
      if (!origin && !preserveLastValid) return fallback();
      if (now() < cached.expires) return cached.value;
      if (!pending)
        pending = (async () => {
          const startedGeneration = generation;
          if (cacheFile && !diskLoaded) {
            diskLoaded = true;
            try {
              const handle = await open(cacheFile, "r");
              try {
                const bytes = Buffer.alloc(maxBytes + 1); let count = 0;
                while (count < bytes.length) {
                  const {bytesRead} = await handle.read(bytes, count, bytes.length-count, count);
                  if (!bytesRead) break;
                  count += bytesRead;
                }
                if (count > maxBytes) throw Error("Oversized disk projection");
                cached.value = parse(JSON.parse(new TextDecoder("utf-8", {fatal:true}).decode(bytes.subarray(0,count))));
              } finally { await handle.close(); }
            } catch { /* Missing or invalid disk cache is never published. */ }
          }
          let value = preserveLastValid ? cached.value : fallback();
          try {
            if (!origin) throw Error("No projection origin");
            value = await read(
              await fetcher(`${origin.replace(/\/$/, "")}${path}`, {
                signal: AbortSignal.timeout(timeout),
                redirect: "error",
                headers: { Accept: "application/json" },
              }),
            );
            if (cacheFile) {
              const temporary = `${cacheFile}.${randomUUID()}.tmp`;
              try {
                await mkdir(dirname(cacheFile), { recursive: true });
                await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
                await rename(temporary, cacheFile);
              } catch { await unlink(temporary).catch(() => {}); }
            }
          } catch {
            /* Identity retains last valid data; other projections retain their existing fallback policy. */
          }
          cached = { value, expires: startedGeneration === generation ? now() + ttl : 0 };
          return value;
        })().finally(() => {
          pending = undefined;
        });
      return pending;
    },
  };
}
