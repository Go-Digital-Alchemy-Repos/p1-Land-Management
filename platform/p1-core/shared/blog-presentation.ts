/** Optional editorial layout metadata; no database, DOM or runtime dependencies.
 * HTML safety for relatedContent is a separate responsibility of the public pipeline. */
export type BlogPresentation = {
  schemaVersion: 1;
  layout: "editorial";
  eyebrow: string;
  titleParts: Array<{ text: string; emphasis: boolean }>;
  imageAlt: string;
  relatedContent: string;
  structuredData: {
    type: "Article" | "BlogPosting";
    headline: string;
    description: string;
    authorType: "Organization" | "Person";
    publishedDate: string | null;
    modifiedDate: string | null;
  };
};
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).sort().join(",") === keys.sort().join(",");
const bounded = (value: unknown, limit: number): value is string =>
  typeof value === "string" &&
  value.length <= limit &&
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const normalized = (value: string) => value.replace(/\s+/g, " ").trim();
function dateOnly(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}
export function validateBlogPresentation(value: unknown, title: string): value is BlogPresentation {
  if (
    !record(value) ||
    !exactKeys(value, [
      "schemaVersion",
      "layout",
      "eyebrow",
      "titleParts",
      "imageAlt",
      "relatedContent",
      "structuredData",
    ]) ||
    value.schemaVersion !== 1 ||
    value.layout !== "editorial"
  )
    return false;
  if (
    !bounded(value.eyebrow, 200) ||
    !bounded(value.imageAlt, 2000) ||
    !bounded(value.relatedContent, 32768) ||
    new TextEncoder().encode(value.relatedContent).length > 32768
  )
    return false;
  if (
    !Array.isArray(value.titleParts) ||
    value.titleParts.length < 1 ||
    value.titleParts.length > 20 ||
    !value.titleParts.every(
      (part) =>
        record(part) &&
        exactKeys(part, ["text", "emphasis"]) &&
        bounded(part.text, 2000) &&
        part.text.length > 0 &&
        typeof part.emphasis === "boolean",
    )
  )
    return false;
  if (
    !bounded(title, 2000) ||
    !normalized(title) ||
    normalized(value.titleParts.map((part) => part.text).join("")) !== normalized(title)
  )
    return false;
  const data = value.structuredData;
  return (
    record(data) &&
    exactKeys(data, [
      "type",
      "headline",
      "description",
      "authorType",
      "publishedDate",
      "modifiedDate",
    ]) &&
    ["Article", "BlogPosting"].includes(data.type as string) &&
    ["Organization", "Person"].includes(data.authorType as string) &&
    bounded(data.headline, 2000) &&
    !!data.headline.trim() &&
    bounded(data.description, 12000) &&
    dateOnly(data.publishedDate) &&
    dateOnly(data.modifiedDate) &&
    !(data.publishedDate && data.modifiedDate && data.modifiedDate < data.publishedDate)
  );
}
