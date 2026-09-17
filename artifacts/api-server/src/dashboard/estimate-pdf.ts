import { formatEstimateExpiry } from "@workspace/api-zod/estimate-document";
import PDFDocument from "pdfkit";
import { readFileSync } from "node:fs";
import { HttpError } from "./policy";
import { pdfFontCoverage } from "./pdf-font-coverage";
const regular = readFileSync(
  new URL("./pdf-assets/NotoSans-Regular.ttf", import.meta.url),
);
const bold = readFileSync(
  new URL("./pdf-assets/NotoSans-Bold.ttf", import.meta.url),
);
export type PdfBlock = {
  text: string;
  kind?: "title" | "heading" | "body" | "muted";
};
export type EstimatePdfDocument = {
  title: string;
  revision: number;
  client_name: string;
  property_name: string;
  address: string;
  scope: string;
  terms: string;
  agreement_template_snapshot?: string | null;
  amount_cents: number | string;
  expires_at: Date | string;
  line_items: {
    description: string;
    quantity: number | string;
    unit?: string | null;
    unit_price_cents: number | string;
  }[];
};
export function estimatePdfBlocks(doc: EstimatePdfDocument): PdfBlock[] {
  return [
    { kind: "title", text: doc.title },
    { kind: "muted", text: `Estimate revision ${doc.revision}` },
    { text: `${doc.client_name} · ${doc.property_name}` },
    { text: doc.address },
    { kind: "heading", text: "Scope of work" },
    { text: doc.scope },
    { kind: "heading", text: "Cost breakdown" },
    ...doc.line_items.flatMap((item, index): PdfBlock[] => [
      { text: `${index + 1}. ${item.description}` },
      {
        kind: "muted",
        text: `${item.quantity} ${item.unit || ""} × $${(Number(item.unit_price_cents) / 100).toFixed(2)} USD`,
      },
    ]),
    {
      kind: "heading",
      text: `Total: $${(Number(doc.amount_cents) / 100).toFixed(2)} USD`,
    },
    {
      text: `Valid through: ${formatEstimateExpiry(doc.expires_at)}`,
    },
    ...(doc.agreement_template_snapshot
      ? [
          { kind: "heading" as const, text: "Agreement terms" },
          { text: doc.agreement_template_snapshot },
        ]
      : []),
    ...(doc.terms
      ? [
          {
            kind: "heading" as const,
            text: doc.agreement_template_snapshot
              ? "Additional terms"
              : "Terms",
          },
          { text: doc.terms },
        ]
      : []),
  ];
}
export function validatePdfText(blocks: PdfBlock[]) {
  const unsupported = new Set<number>();
  for (const block of blocks)
    for (const char of block.text) {
      const code = char.codePointAt(0)!;
      if (
        ![9, 10, 13].includes(code) &&
        !pdfFontCoverage.some(([start, end]) => code >= start && code <= end)
      )
        unsupported.add(code);
    }
  if (unsupported.size)
    throw new HttpError(
      422,
      `PDF font does not support ${[...unsupported]
        .slice(0, 10)
        .map((code) => `U+${code.toString(16).toUpperCase()}`)
        .join(
          ", ",
        )}. Review these characters before sending; text will not be silently omitted.`,
    );
}
export async function renderPdf(blocks: PdfBlock[]): Promise<Buffer> {
  validatePdfText(blocks);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      autoFirstPage: false,
      bufferPages: true,
      size: "LETTER",
      margins: { top: 64, bottom: 64, left: 48, right: 48 },
      info: { Title: "P1 estimate", Author: "P1 Land & Property Management" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      doc.registerFont("P1", regular);
      doc.registerFont("P1 Bold", bold);
      doc.addPage();
      for (const block of blocks) {
        if (!block.text) continue;
        const heading = block.kind === "heading",
          title = block.kind === "title";
        if (heading && doc.y > doc.page.height - doc.page.margins.bottom - 60)
          doc.addPage();
        doc
          .font(heading || title ? "P1 Bold" : "P1")
          .fontSize(title ? 20 : heading ? 13 : 10.5)
          .fillColor(block.kind === "muted" ? "#526179" : "#142036");
        doc.text(block.text, {
          width: 516,
          lineGap: 3,
          paragraphGap: 6,
          features: ["kern"],
        });
        doc.moveDown(heading ? 0.3 : 0.65);
      }
      const { start, count } = doc.bufferedPageRange();
      for (let page = start; page < start + count; page++) {
        doc.switchToPage(page);
        doc
          .font("P1")
          .fontSize(8)
          .fillColor("#526179")
          .text("P1 LAND & PROPERTY MANAGEMENT", 48, 28, { lineBreak: false });
        doc
          .font("P1")
          .fontSize(8)
          .fillColor("#526179")
          .text(`Page ${page + 1} of ${count}`, 48, 758, { lineBreak: false });
      }
      doc.end();
    } catch (error) {
      doc.destroy();
      reject(error);
    }
  });
}
export const renderEstimatePdf = (doc: EstimatePdfDocument) =>
  renderPdf(estimatePdfBlocks(doc));
