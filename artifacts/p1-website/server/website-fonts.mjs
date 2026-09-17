function font(value) {
  if (value === null) return null;
  if (
    !value ||
    Object.keys(value).sort().join(",") !== "fallback,name" ||
    typeof value.name !== "string" ||
    !/^[A-Za-z][A-Za-z0-9 ]{0,59}$/.test(value.name) ||
    !["serif", "sans-serif"].includes(value.fallback)
  )
    throw Error("Invalid font");
  return value;
}
export function fontStyles(data) {
  if (
    !data ||
    Object.keys(data).sort().join(",") !==
      "body,heading,schemaVersion,stackId" ||
    data.schemaVersion !== 1 ||
    data.stackId !== "p1-land-management"
  )
    throw Error("Invalid typography");
  const body = font(data.body),
    heading = font(data.heading),
    rules = [];
  if (body) rules.push(`--app-font-sans:'${body.name}',${body.fallback}`);
  if (heading)
    rules.push(
      `--app-font-serif:'${heading.name}',${heading.fallback}`,
      `--app-font-display:'${heading.name}',${heading.fallback}`,
    );
  if (!rules.length) return "";
  const names = [
    ...new Set([body?.name, heading?.name].filter(Boolean)),
  ].sort();
  const query = names
    .map((name) => `family=${encodeURIComponent(name)}:wght@400;700`)
    .join("&amp;");
  return `<link id="p1-website-font-source" rel="stylesheet" href="https://fonts.googleapis.com/css2?${query}&amp;display=swap"><style id="p1-website-fonts">:root:root{${rules.join(";")}}</style>`;
}
async function readFonts(response) {
  if (
    response.status !== 200 ||
    !/^application\/json(?:\s*;|$)/i.test(
      response.headers.get("content-type") || "",
    )
  )
    throw Error("Invalid response");
  const length = response.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > 16384))
    throw Error("Oversized font payload");
  if (!response.body) throw Error("Missing font payload");
  const reader = response.body.getReader(),
    chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) throw Error("Oversized font payload");
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
  return fontStyles(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
  );
}
/** Bounded credential-free refresh, no stale disk fallback; missing/cleared font payload restores built-in styling. */
export function createWebsiteFontStore({
  origin,
  fetcher = fetch,
  now = Date.now,
  ttl = 30000,
  timeout = 1800,
}) {
  let cached = { style: "", expires: 0 },
    pending;
  return {
    async snapshot() {
      if (!origin) return "";
      if (now() < cached.expires) return cached.style;
      if (!pending)
        pending = (async () => {
          let style = "";
          try {
            style = await readFonts(
              await fetcher(
                `${origin.replace(/\/$/, "")}/api/p1/website-fonts`,
                {
                  signal: AbortSignal.timeout(timeout),
                  redirect: "error",
                  headers: { Accept: "application/json" },
                },
              ),
            );
          } catch {}
          cached = { style, expires: now() + ttl };
          return style;
        })().finally(() => {
          pending = undefined;
        });
      return pending;
    },
  };
}
