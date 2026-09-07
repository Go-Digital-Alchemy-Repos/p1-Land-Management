import { z } from "zod";

export const teamMemberInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  role: z.string().trim().max(240).default(""),
  biography: z.string().trim().max(30000).default(""),
  excerpt: z.string().trim().max(1000).default(""),
  photoUrl: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (value) => !value || /^\/(?!\/)[^\\\s]*$/.test(value) || /^https?:\/\/[^\s\\]+$/i.test(value),
      "Use an image from the media library or an HTTP(S) URL",
    )
    .default(""),
  photoAlt: z.string().trim().max(300).default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;
export type PublicTeamMember = TeamMemberInput & { id: string };

export function selectTeamMembers(members: PublicTeamMember[], ids: unknown): PublicTeamMember[] {
  if (!Array.isArray(ids)) return [];
  const byId = new Map(
    members.filter((member) => member.status === "published").map((member) => [member.id, member]),
  );
  return [...new Set(ids.filter((id): id is string => typeof id === "string"))].flatMap((id) => {
    const member = byId.get(id);
    return member ? [member] : [];
  });
}

export function teamBioExcerpt(
  member: Pick<TeamMemberInput, "excerpt" | "biography">,
  length = 180,
) {
  const source = member.excerpt || member.biography;
  const text = source
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
      const names: Record<string, string> = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        nbsp: " ",
      };
      if (code[0] !== "#") return names[code.toLowerCase()] ?? entity;
      const value =
        code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff)
        ? String.fromCodePoint(value)
        : "";
    })
    .replace(/\s+/g, " ")
    .trim();
  const limit = Number.isFinite(length) ? Math.min(500, Math.max(40, length)) : 180;
  if (text.length <= limit) return text;
  const clipped = text.slice(0, limit).trimEnd();
  if (/\s/.test(text[limit] || "") || text[limit - 1] === " ") return `${clipped}…`;
  const boundary = clipped.lastIndexOf(" ");
  return `${boundary > limit / 2 ? clipped.slice(0, boundary) : clipped}…`;
}

/** Preserve line breaks and literal characters when opening legacy plain-text biographies. */
export function teamBiographyEditorHtml(value: string): string {
  if (!value || /<[a-z][\s\S]*>/i.test(value)) return value;
  const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\r?\n/g, "<br>")}</p>`;
}
