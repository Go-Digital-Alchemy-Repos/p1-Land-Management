const variables = {
  brand_primary_color: ["primary"],
  brand_secondary_color: ["secondary"],
  brand_tertiary_color: ["accent", "ring"],
  brand_quaternary_color: ["quaternary", "clay"],
  text_h1_color: ["public-text-h1"],
  text_h2_color: ["public-text-h2"],
  text_h3_h6_color: ["public-text-h3"],
  text_body_color: [
    "foreground",
    "card-foreground",
    "popover-foreground",
    "public-text-body",
  ],
  text_heading_subtext_color: ["public-text-heading-subtext"],
  text_supporting_copy_color: ["public-text-supporting-copy"],
  text_helper_text_color: ["muted-foreground", "public-text-helper"],
  text_meta_color: ["public-text-meta"],
  text_link_color: ["public-text-link"],
  text_link_hover_color: ["public-text-link-hover"],
  text_inverse_color: ["public-text-inverse"],
  text_primary_foreground_color: ["primary-foreground"],
  text_secondary_foreground_color: ["secondary-foreground"],
  text_tertiary_foreground_color: ["accent-foreground"],
};
const selectors = {
  text_h1_color: "h1",
  text_h2_color: "h2",
  text_h3_h6_color: "h3,h4,h5,h6",
  text_heading_subtext_color: ".public-heading-subtext",
  text_supporting_copy_color: ".public-supporting-copy",
  text_helper_text_color: ".public-helper-text",
  text_meta_color: ".public-meta",
  text_link_color: ".public-link",
  text_link_hover_color: ".public-link:hover",
  text_inverse_color: ".public-inverse",
};
function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map(
    (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min,
    l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let h =
    delta === 0
      ? 0
      : max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
export function colorStyles(data) {
  if (
    !data ||
    Object.keys(data).sort().join(",") !== "colors,schemaVersion,stackId" ||
    data.schemaVersion !== 1 ||
    data.stackId !== "p1-land-management" ||
    !data.colors ||
    Array.isArray(data.colors) ||
    typeof data.colors !== "object"
  )
    throw Error("Invalid palette");
  const declarations = [],
    rules = [];
  for (const [key, value] of Object.entries(data.colors)) {
    if (
      !Object.hasOwn(variables, key) ||
      typeof value !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(value)
    )
      throw Error("Invalid color");
    for (const variable of variables[key])
      declarations.push(`--${variable}:${hsl(value)}`);
    if (selectors[key]) rules.push(`${selectors[key]}{color:${value}}`);
  }
  return declarations.length
    ? `<style id="p1-website-colors">:root:root{${declarations.join(";")}}${rules.join("")}</style>`
    : "";
}
async function readColors(response) {
  if (
    response.status !== 200 ||
    !/^application\/json(?:\s*;|$)/i.test(
      response.headers.get("content-type") || "",
    )
  )
    throw Error("Invalid response");
  const length = response.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > 16384))
    throw Error("Oversized palette");
  if (!response.body) throw Error("Missing palette");
  const reader = response.body.getReader(),
    chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) throw Error("Oversized palette");
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
  return colorStyles(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
  );
}
/** Bounded credential-free refresh, no stale disk fallback; missing/cleared palette restores built-in styling. */
export function createWebsiteColorStore({
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
            style = await readColors(
              await fetcher(
                `${origin.replace(/\/$/, "")}/api/p1/website-colors`,
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
