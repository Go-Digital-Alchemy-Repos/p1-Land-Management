import { describe, expect, it } from "vitest";
import { selectTeamMembers, teamBioExcerpt, teamMemberInputSchema } from "./team";

const member = (id: string, status = "published") => ({
  id,
  ...teamMemberInputSchema.parse({ name: id, status }),
});
describe("Team content", () => {
  it("renders only selected published members in selection order, without duplicates", () => {
    expect(
      selectTeamMembers(
        [member("a"), member("b"), member("draft", "draft"), member("archived", "archived")],
        ["b", "draft", "missing", "a", "b", "archived"],
      ).map((entry) => entry.id),
    ).toEqual(["b", "a"]);
    expect(selectTeamMembers([member("a")], [])).toEqual([]);
    expect(selectTeamMembers([member("a")], null)).toEqual([]);
  });
  it("prefers the editorial excerpt and falls back to a word-trimmed biography", () => {
    expect(teamBioExcerpt({ excerpt: "A short intro", biography: "Long biography" })).toBe(
      "A short intro",
    );
    expect(teamBioExcerpt({ excerpt: "", biography: "A biography\nwith line breaks" })).toBe(
      "A biography with line breaks",
    );
    expect(
      teamBioExcerpt(
        {
          excerpt: "",
          biography: "A biography that is intentionally longer than forty characters for the card.",
        },
        40,
      ),
    ).toBe("A biography that is intentionally longer…");
  });
  it("generates readable excerpts from formatted biographies", () => {
    expect(
      teamBioExcerpt({
        excerpt: "",
        biography: "<p>Alex &amp; Blair</p><p><strong>Our team</strong> &#8212; welcome.</p>",
      }),
    ).toBe("Alex & Blair Our team — welcome.");
    expect(
      teamBioExcerpt({ excerpt: "", biography: "<script>alert(1)</script><p>Safe text</p>" }),
    ).toBe("Safe text");
  });
  it("validates names, publishing status, lengths, and image URL schemes", () => {
    for (const photoUrl of [
      "javascript:alert(1)",
      "data:text/html,x",
      "//untrusted.test/photo",
      "/\\evil.test/x",
    ]) {
      expect(teamMemberInputSchema.safeParse({ name: "Member", photoUrl }).success).toBe(false);
    }
    for (const photoUrl of ["/uploads/member.jpg", "https://example.com/photo.jpg", ""]) {
      expect(teamMemberInputSchema.safeParse({ name: "Member", photoUrl }).success).toBe(true);
    }
    expect(teamMemberInputSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(teamMemberInputSchema.safeParse({ name: "Member", status: "public" }).success).toBe(
      false,
    );
    expect(
      teamMemberInputSchema.safeParse({ name: "Member", excerpt: "x".repeat(1001) }).success,
    ).toBe(false);
    expect(
      teamMemberInputSchema.parse({ name: " Member ", createdBy: "forged" }),
    ).not.toHaveProperty("createdBy");
  });
});
