import { expect, it } from "vitest";
import { sanitizeBuilderPreviewBlocks } from "./sanitize-preview";

it("sanitizes nested preview HTML and links without changing saved draft fields", () => {
  const blocks = [
    {
      id: "draft",
      type: "legacy",
      props: {
        content:
          '<p style="text-align:center" onclick="alert(1)">Hello <strong>world</strong><script>alert(1)</script></p>',
        subtitle: '<img src="/uploads/photo.jpg" onerror="alert(1)">',
        items: [
          {
            answer: '<a href="javascript:alert(1)">Answer</a>',
            subtitle: '<svg onload="alert(1)"></svg>Nested',
          },
        ],
        primaryLink: "javascript:alert(1)",
        unknown: { preserved: true, count: 3 },
      },
    },
  ];
  const original = structuredClone(blocks);
  const result = sanitizeBuilderPreviewBlocks(blocks);
  expect(result[0].props.content).toBe(
    '<p style="text-align:center">Hello <strong>world</strong></p>',
  );
  expect(result[0].props.subtitle).toBe('<img src="/uploads/photo.jpg" />');
  expect(result[0].props.items).toEqual([{ answer: "<a>Answer</a>", subtitle: "Nested" }]);
  expect(result[0].props.primaryLink).toBe("#");
  expect(result[0].props.unknown).toEqual(original[0].props.unknown);
  expect(blocks).toEqual(original);
  expect(result).not.toBe(blocks);
});
