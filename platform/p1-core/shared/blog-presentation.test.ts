import { describe, expect, it } from "vitest";
import { validateBlogPresentation, type BlogPresentation } from "./blog-presentation";
export const fixturePresentation = (): BlogPresentation => ({
  schemaVersion: 1,
  layout: "editorial",
  eyebrow: "Land care",
  titleParts: [
    { text: "Public ", emphasis: false },
    { text: "title", emphasis: true },
  ],
  imageAlt: "Large acreage",
  relatedContent: '<p><a href="/services/land-clearing">Land clearing</a></p>',
  structuredData: {
    type: "Article",
    headline: "Public title",
    description: "Practical land advice",
    authorType: "Organization",
    publishedDate: "2026-06-24",
    modifiedDate: "2026-09-14",
  },
});
describe("optional Blog presentation", () => {
  it("validates exact bounded structure and normalized editorial title", () => {
    expect(validateBlogPresentation(fixturePresentation(), " Public  title ")).toBe(true);
    for (const input of [
      null,
      undefined,
      { ...fixturePresentation(), extra: 1 },
      { ...fixturePresentation(), layout: "other" },
      { ...fixturePresentation(), titleParts: [] },
      { ...fixturePresentation(), titleParts: [{ text: "Wrong", emphasis: false }] },
      { ...fixturePresentation(), eyebrow: "a".repeat(201) },
      { ...fixturePresentation(), relatedContent: "a".repeat(32769) },
      { ...fixturePresentation(), imageAlt: "bad\u0000" },
    ])
      expect(validateBlogPresentation(input, "Public title")).toBe(false);
  });
  it("rejects impossible or unordered dates without inventing precision", () => {
    for (const date of [
      "2026-02-29",
      "2026-04-31",
      "0000-01-01",
      "2026-1-01",
      "2026-01-01T00:00:00Z",
    ]) {
      const p = fixturePresentation();
      p.structuredData.publishedDate = date;
      expect(validateBlogPresentation(p, "Public title")).toBe(false);
    }
    const p = fixturePresentation();
    p.structuredData.publishedDate = "2024-02-29";
    expect(validateBlogPresentation(p, "Public title")).toBe(true);
    p.structuredData.modifiedDate = "2024-02-28";
    expect(validateBlogPresentation(p, "Public title")).toBe(false);
    p.structuredData.publishedDate = null;
    p.structuredData.modifiedDate = null;
    expect(validateBlogPresentation(p, "Public title")).toBe(true);
  });
});
