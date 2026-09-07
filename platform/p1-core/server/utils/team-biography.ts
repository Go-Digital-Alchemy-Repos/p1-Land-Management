import { sanitizePublicRichHtml } from "./sanitize-rich-html";

/** Plain-text legacy values stay literal; rich biographies use the public CMS HTML policy. */
export function sanitizeTeamBiography(value: string): string {
  return /<[a-z][\s\S]*>/i.test(value) ? (sanitizePublicRichHtml(value) ?? "") : value;
}
