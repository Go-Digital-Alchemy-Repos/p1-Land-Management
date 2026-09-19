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
}) {
  let cached = { value: fallback(), expires: 0 },
    pending;
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
    async snapshot() {
      if (!origin) return fallback();
      if (now() < cached.expires) return cached.value;
      if (!pending)
        pending = (async () => {
          let value = fallback();
          try {
            value = await read(
              await fetcher(`${origin.replace(/\/$/, "")}${path}`, {
                signal: AbortSignal.timeout(timeout),
                redirect: "error",
                headers: { Accept: "application/json" },
              }),
            );
          } catch {
            /* Unavailable projections remove expired overrides; never replay stale website settings. */
          }
          cached = { value, expires: now() + ttl };
          return value;
        })().finally(() => {
          pending = undefined;
        });
      return pending;
    },
  };
}
