import { describe, expect, it } from "vitest";
import {
  docSlugFromMarkdownPath,
  extractMarkdownHeadings,
  markdownToHtml,
  slugifyMarkdownHeading,
} from "./markdown";

describe("markdown utilities", () => {
  it("extracts stable heading anchors with duplicate suffixes", () => {
    expect(extractMarkdownHeadings("# Overview\n\n## API Routes\n\n## API Routes")).toEqual([
      { id: "overview", level: 1, text: "Overview" },
      { id: "api-routes", level: 2, text: "API Routes" },
      { id: "api-routes-2", level: 2, text: "API Routes" },
    ]);
  });

  it("normalizes headings and relative markdown paths into doc slugs", () => {
    expect(slugifyMarkdownHeading("Storage & Schema Index")).toBe("storage-schema-index");
    expect(docSlugFromMarkdownPath("../architecture/backend-routes.md")).toBe(
      "architecture-backend-routes",
    );
  });

  it("renders heading anchors, tables, and resolved internal links", () => {
    const html = markdownToHtml(
      [
        "# Route Index",
        "",
        "[Routes](../architecture/backend-routes.md)",
        "",
        "| File | Type |",
        "| --- | --- |",
        "| `server/routes/index.ts` | API |",
      ].join("\n"),
      {
        resolveLink: () => ({
          href: "/admin/docs/architecture-backend-routes",
          docSlug: "architecture-backend-routes",
        }),
      },
    );

    expect(html).toContain('<h1 id="route-index">');
    expect(html).toContain('data-doc-slug="architecture-backend-routes"');
    expect(html).toContain("<table>");
    expect(html).toContain("<td><code>server/routes/index.ts</code></td>");
  });
});

it("does not turn code-example headings into document outline entries", () => {
  const source = "# Guide\n```md\n# Example\n```\n## Real section";
  expect(extractMarkdownHeadings(source).map(item=>item.id)).toEqual(["guide","real-section"]);
  expect(markdownToHtml(source)).toContain('<h2 id="real-section">');
});
it("rejects unsafe links even when supplied by a link resolver", () => {
  expect(markdownToHtml('[Unsafe](relative.md)', {resolveLink:()=>({href:'javascript:alert(1)'})})).not.toContain('<a');
  expect(markdownToHtml('<script>alert(1)</script>')).not.toContain('<script>');
});
