import { z } from "zod";
export const templateKind = z.enum(["msa", "scope", "cost", "package"]);
const rowId = z.string().uuid();
const prose = z.string().max(50_000);
export const scopePayload = z
  .object({
    items: z
      .array(
        z
          .object({
            id: rowId,
            title: z.string().trim().min(1).max(500),
            description: prose,
          })
          .strict(),
      )
      .max(200),
    exclusions: prose,
  })
  .strict();
export const costPayload = z
  .object({
    items: z
      .array(
        z
          .object({
            id: rowId,
            description: z.string().trim().min(1).max(2000),
            unit: z.string().max(100),
            quantity: z
              .number()
              .positive()
              .max(1_000_000)
              .refine(
                (n) => /^\d+(?:\.\d{1,2})?$/.test(String(n)),
                "Quantity supports at most two decimal places",
              ),
            unitPriceCents: z.number().int().min(0).max(10_000_000_000),
            basis: z.enum(["one_time", "fixed_monthly", "per_visit"]),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
const packagePayload = z
  .object({
    msaId: rowId.nullable(),
    scopeId: rowId.nullable(),
    costId: rowId.nullable(),
  })
  .strict();
export const templateContent = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).default(""),
    body: prose.default(""),
    payload: z.record(z.unknown()).default({}),
  })
  .strict();
export const templateCreate = templateContent.extend({ kind: templateKind });
export const templateEdit = templateContent.extend({
  expectedEditVersion: z.number().int().positive(),
});
export const templateVersion = z
  .object({ expectedEditVersion: z.number().int().positive() })
  .strict();
export function validateTemplateContent(
  kind: z.infer<typeof templateKind>,
  raw: unknown,
  publish = false,
) {
  const value = templateContent.parse(raw);
  const payload =
    kind === "msa"
      ? z.object({}).strict().parse(value.payload)
      : kind === "scope"
        ? scopePayload.parse(value.payload)
        : kind === "cost"
          ? costPayload.parse(value.payload)
          : packagePayload.parse(value.payload);
  if (
    "items" in payload &&
    Array.isArray(payload.items) &&
    new Set(payload.items.map((row) => row.id)).size !== payload.items.length
  )
    throw new Error("Template row IDs must be unique");
  if (publish) {
    if (kind === "msa" && !value.body.trim())
      throw new Error("MSA terms are required before publication");
    if (
      "items" in payload &&
      Array.isArray(payload.items) &&
      !payload.items.length
    )
      throw new Error(
        "At least one template row is required before publication",
      );
    if (
      kind === "package" &&
      Object.values(payload).some((value) => value === null)
    )
      throw new Error(
        "Select an MSA, scope and cost version before publication",
      );
  }
  return { ...value, payload };
}
