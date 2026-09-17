import { describe, expect, it } from "vitest";
import { sanitizeTeamBiography } from "../utils/team-biography";
import { teamBiographyEditorHtml } from "@shared/team";

describe("Team biography HTML", () => {
  it("preserves formatting but removes executable HTML and unsafe links", () => {
    const result = sanitizeTeamBiography(
      '<p>Hello <strong>team</strong></p><script>alert(1)</script><a href="javascript:alert(1)">link</a><img src="/photo.jpg" onerror="alert(1)">',
    );
    expect(result).toContain("<strong>team</strong>");
    expect(result).not.toMatch(/script|onerror|alert/);
  });
  it("retains editor text alignment while rejecting other style properties",()=>{
    const result=sanitizeTeamBiography('<h2 style="text-align:center;position:fixed;top:0">Heading</h2><p style="background:url(https://untrusted.test);text-align:right">Text</p>');
    expect(result).toContain('style="text-align:center"');expect(result).toContain('style="text-align:right"');expect(result).not.toMatch(/position|background|url|top:/);
  });
  it("retains literal plain-text biographies and converts them safely for editing", () => {
    const legacy = "Alex & Blair\nExperience < 10 years";
    expect(sanitizeTeamBiography(legacy)).toBe(legacy);
    expect(teamBiographyEditorHtml(legacy)).toBe(
      "<p>Alex &amp; Blair<br>Experience &lt; 10 years</p>",
    );
    expect(teamBiographyEditorHtml("<p><em>Bio</em></p>")).toBe("<p><em>Bio</em></p>");
  });
});
