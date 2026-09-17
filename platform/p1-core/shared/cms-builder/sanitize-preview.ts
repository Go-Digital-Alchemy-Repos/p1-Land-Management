import { sanitizePublicCmsContent, sanitizePublicRichHtml } from "../sanitize-rich-html";
import type { BlockInstance } from "./block-registry.shared";

/** Sanitize a rendering copy, never the editor's source or persistence payload.
 * SectionHeading also renders subtitle as rich HTML; the public content policy
 * predates that field, so include it explicitly at this preview boundary.
 */
export function sanitizeBuilderPreviewBlocks(blocks: BlockInstance[]): BlockInstance[] {
  function headings(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(headings);
    if (value === null || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        key === "subtitle" && typeof nested === "string"
          ? sanitizePublicRichHtml(nested)
          : headings(nested),
      ]),
    );
  }
  return headings(sanitizePublicCmsContent(blocks)) as BlockInstance[];
}
