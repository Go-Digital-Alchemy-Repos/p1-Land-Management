import { z } from "zod";
import { scopePayload, costPayload } from "./agreement-template.contract";
const id = z.string().uuid();
export const compositionContext = z
  .object({
    clientId: id.nullable().default(null),
    propertyId: id.nullable().default(null),
    leadId: id.nullable().default(null),
    sourceEstimateId: id.nullable().default(null),
  })
  .strict()
  .refine(
    (value) => !!value.clientId || !!value.leadId,
    "Choose a client or inquiry",
  );
export const compositionSelection = z
  .object({
    packageId: id.nullable().default(null),
    msaId: id.nullable().default(null),
    scopeId: id.nullable().default(null),
    costId: id.nullable().default(null),
  })
  .strict()
  .refine(
    (value) =>
      !value.packageId || (!value.msaId && !value.scopeId && !value.costId),
    "Choose a package or individual components",
  );
export const compositionDates = z
  .object({
    preparedOn: z.string().date().nullable().default(null),
    startsOn: z.string().date().nullable().default(null),
    endsOn: z.string().date().nullable().default(null),
  })
  .strict()
  .refine(
    (value) =>
      !value.startsOn || !value.endsOn || value.endsOn >= value.startsOn,
    "Agreement end must follow its start",
  );
export const compositionContent = z
  .object({
    terms: z.string().max(50000),
    scope: scopePayload,
    costs: costPayload,
    notes: z
      .object({
        scope: z.string().max(50000),
        cost: z.string().max(50000),
        package: z.string().max(50000),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const [key, rows] of [
      ["scope", value.scope.items],
      ["costs", value.costs.items],
    ] as const)
      if (new Set(rows.map((row) => row.id)).size !== rows.length)
        ctx.addIssue({
          code: "custom",
          message: "Row IDs must be unique",
          path: [key, "items"],
        });
  });
export const compositionCreate = z
  .object({
    operationId: id,
    title: z.string().trim().min(1).max(200),
    context: compositionContext,
    selection: compositionSelection.default({}),
    dates: compositionDates.default({}),
  })
  .strict();
export const compositionEdit = z
  .object({
    expectedVersion: z.number().int().positive(),
    title: z.string().trim().min(1).max(200),
    content: compositionContent,
    dates: compositionDates,
  })
  .strict();
export type CompositionContent = z.infer<typeof compositionContent>;
export function previewComposition(
  content: CompositionContent,
  context: Record<string, string | null>,
  dates: z.infer<typeof compositionDates>,
) {
  const values: Record<string, string | null> = {
    ...context,
    "agreement.prepared_on": dates.preparedOn,
    "agreement.starts_on": dates.startsOn,
    "agreement.ends_on": dates.endsOn,
  };
  const unresolved = new Set<string>();
  const render = (value: string) =>
    value.replace(/\{\{([^{}]*)\}\}/g, (match, key: string) => {
      const name = key.trim();
      const replacement = Object.prototype.hasOwnProperty.call(values, name)
        ? values[name]
        : null;
      if (
        replacement === null ||
        replacement === undefined ||
        replacement === ""
      ) {
        unresolved.add(name || "(empty)");
        return match;
      }
      return replacement;
    });
  const totals: Record<"one_time" | "fixed_monthly" | "per_visit", bigint> = {
    one_time: 0n,
    fixed_monthly: 0n,
    per_visit: 0n,
  };
  const lines = content.costs.items.map((row) => {
    const [whole, fraction = ""] = String(row.quantity).split(".");
    const hundredths = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
    const total = (hundredths * BigInt(row.unitPriceCents) + 50n) / 100n;
    totals[row.basis] += total;
    if (
      total > BigInt(Number.MAX_SAFE_INTEGER) ||
      totals[row.basis] > BigInt(Number.MAX_SAFE_INTEGER)
    )
      throw new Error("Cost total exceeds supported precision");
    return {
      ...row,
      description: render(row.description),
      unit: render(row.unit),
      totalCents: Number(total),
    };
  });
  const rendered = {
    terms: render(content.terms),
    scope: {
      items: content.scope.items.map((row) => ({
        ...row,
        title: render(row.title),
        description: render(row.description),
      })),
      exclusions: render(content.scope.exclusions),
    },
    costs: { items: lines },
    notes: {
      scope: render(content.notes.scope),
      cost: render(content.notes.cost),
      package: render(content.notes.package),
    },
  };
  return {
    content: rendered,
    unresolvedPlaceholders: [...unresolved].sort(),
    totalsByBasis: {
      one_time: Number(totals.one_time),
      fixed_monthly: Number(totals.fixed_monthly),
      per_visit: Number(totals.per_visit),
    },
  };
}
