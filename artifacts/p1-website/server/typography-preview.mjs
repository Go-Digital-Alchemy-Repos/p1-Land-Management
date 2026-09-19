import { fontStyles } from "./website-fonts.mjs";
/** Stateless specimen. No website setting reads/writes, visitor data, or arbitrary markup. */
export function typographyPreview(search) {
  const allowed = new Set(["body", "bodyType", "heading", "headingType"]);
  for (const key of search.keys())
    if (!allowed.has(key) || search.getAll(key).length !== 1)
      throw Error("Invalid preview");
  function selection(name, type, fallback) {
    const family = search.get(name),
      category = search.get(type);
    if (family === null && category === null) return fallback;
    if (!family || !category) throw Error("Incomplete font");
    return { name: family, fallback: category };
  }
  const body = selection("body", "bodyType", {
    name: "Manrope",
    fallback: "sans-serif",
  });
  const heading = selection("heading", "headingType", {
    name: "Fraunces",
    fallback: "serif",
  });
  // fontStyles validates and escapes the only dynamic values, enforcing a fixed Google Fonts host.
  const fonts = fontStyles({
    schemaVersion: 1,
    stackId: "p1-land-management",
    body,
    heading,
  });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Draft typography preview</title>${fonts}<style>body{margin:0;padding:24px;background:#fff;color:#172334;font-family:var(--app-font-sans);line-height:1.6;overflow-wrap:anywhere}h1,h2,h3{font-family:var(--app-font-display);line-height:1.15;margin:1em 0 .5em}h1{font-size:36px}h2{font-size:28px}h3{font-size:21px}.meta{font:14px system-ui;color:#475569}.sample{border-top:1px solid #cbd5e1;margin-top:20px;padding-top:12px}p{max-width:65ch}small{font-size:14px}</style></head><body><p class="meta">Draft font specimen — no website settings are saved.</p><main><h1>Land &amp; property management</h1><h2>Plan for the seasons ahead</h2><h3>Clear scope. Consistent care.</h3><p>Compare heading and body styles before saving your website typography. This sample includes everyday words, longer descriptions, and punctuation.</p><p><strong>Bold body text</strong> · <em>Italic body text</em> · Regular body text</p><div class="sample"><p>ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 — &amp; ( ) / . , ! ?</p><small>Small text sample for labels and supporting details.</small></div></main></body></html>`;
}
