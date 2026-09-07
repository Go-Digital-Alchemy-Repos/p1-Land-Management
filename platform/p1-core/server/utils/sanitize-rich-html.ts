import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h2",
  "h3",
  "h4",
  "a",
  "img",
];

// These are the only content properties that public renderers intentionally
// insert as HTML. Keep this list close to the public sanitization policy so a
// new HTML insertion point has to opt in explicitly.
const publicRichHtmlFieldNames = new Set([
  "answer",
  "body",
  "content",
  "html",
  "htmlContent",
  "leftBody",
  "rightBody",
  "subheading",
]);

// Public block renderers also use these properties as URL targets. Keep this
// separate from the HTML list: URLs need scheme validation, not HTML parsing.
const publicUrlFieldNames = new Set([
  "ctaLink",
  "ctaSecondaryLink",
  "href",
  "link",
  "primaryLink",
  "secondaryLink",
  "url",
]);

function sanitizePublicUrl(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "";
  if (normalized.startsWith("/") && !normalized.startsWith("//")) return normalized;
  if (normalized.startsWith("#") || normalized.startsWith("?")) return normalized;
  try {
    const url = new URL(normalized);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? normalized : "#";
  } catch {
    return "#";
  }
}

export function sanitizePublicRichHtml(value: string | null | undefined): string | null {
  if (value == null) return null;
  return sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "data-align", "class"],
    },
    allowedClasses: {
      img: [
        "cms-richtext-media",
        "cms-richtext-media-left",
        "cms-richtext-media-center",
        "cms-richtext-media-right",
      ],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
        },
      }),
    },
  });
}

/**
 * Sanitizes only the explicitly supported HTML-bearing values in public CMS
 * payloads. Known public links receive scheme validation; other data remains
 * untouched so editor settings and module configuration retain their contracts.
 */
export function sanitizePublicCmsContent<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePublicCmsContent(item)) as T;
  }

  if (value === null || typeof value !== "object") return value;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      publicRichHtmlFieldNames.has(key) && typeof nestedValue === "string"
        ? sanitizePublicRichHtml(nestedValue)
        : publicUrlFieldNames.has(key) && typeof nestedValue === "string"
          ? sanitizePublicUrl(nestedValue)
          : sanitizePublicCmsContent(nestedValue),
    ]),
  ) as T;
}
