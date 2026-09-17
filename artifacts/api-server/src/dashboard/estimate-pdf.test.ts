import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  estimatePdfBlocks,
  renderEstimatePdf,
  validatePdfText,
} from "./estimate-pdf";
export const longEstimateFixture = {
  title: "Synthetic property services agreement",
  revision: 3,
  client_name: "José Álvarez",
  property_name: "Café grounds",
  address: "Synthetic address",
  scope: Array.from(
    { length: 120 },
    (_, i) =>
      `Scope ${i + 1}: Care for José’s property — protect café gardens and maintain access. ${"Detailed scope text. ".repeat(6)}`,
  ).join("\n"),
  terms: "Final additional terms marker: ADDITIONAL-END",
  agreement_template_snapshot:
    "MSA opening marker.\n" +
    "Reviewable agreement terms with preserved line breaks.\n".repeat(90) +
    "MSA-END-MARKER",
  amount_cents: 12501,
  expires_at: "2030-01-31T00:00:00Z",
  line_items: [
    {
      description: "Site care",
      quantity: "1.25",
      unit: "acre",
      unit_price_cents: 10001,
    },
  ],
};
test("estimate PDF keeps MSA and additional terms, embeds fonts and paginates long scope without a one-page limit", async () => {
  const blocks = estimatePdfBlocks(longEstimateFixture);
  assert(
    blocks.some(
      (block) => block.text === longEstimateFixture.agreement_template_snapshot,
    ),
  );
  assert(blocks.some((block) => block.text === longEstimateFixture.terms));
  assert(
    blocks.some(
      (block) => block.text === "Valid through: Jan 31, 2030, 12:00 AM UTC",
    ),
  );
  const buffer = await renderEstimatePdf(longEstimateFixture),
    raw = buffer.toString("latin1");
  assert(raw.startsWith("%PDF-"));
  assert((raw.match(/\/Type \/Page\b/g) || []).length > 5);
  assert(raw.includes("/FontFile2"));
  assert(raw.includes("/ToUnicode"));
  if (process.env.PDF_TEST_OUTPUT)
    writeFileSync(process.env.PDF_TEST_OUTPUT, buffer);
});
test("PDF preflight accepts supported accents and rejects unsupported glyphs rather than losing content", () => {
  assert.doesNotThrow(() =>
    validatePdfText([{ text: "José Álvarez café — ×\nÉté" }]),
  );
  assert.throws(
    () => validatePdfText([{ text: "Unsupported tree 🌳" }]),
    /U\+1F333/,
  );
});
