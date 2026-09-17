import type { ComposedProposalDocument } from "@workspace/api-zod/estimate-document";
import { compositionDates } from "./agreement-composition.contract";
import { HttpError } from "./policy";
import { z } from "zod";
const cents = z.number().int().min(0).max(10_000_000_000);
const allocation = z.object({
  title: z.string(),
  basis: z.enum(["one_time", "fixed_monthly", "per_visit"]),
  scopeRowIds: z.array(z.string().uuid()),
  costRowIds: z.array(z.string().uuid()),
  rateCents: cents,
  authorizedAmountCents: cents,
  maximumVisits: z.number().int().positive().nullable(),
  periods: z.array(
    z.object({
      startsOn: z.string().date(),
      endsOn: z.string().date(),
      amountCents: cents,
    }),
  ),
  configuration: z
    .object({
      cadence: z.enum(["weekly", "monthly"]),
      intervalCount: z.number().int().positive(),
      localTime: z.string(),
      firstVisitOn: z.string().date(),
    })
    .nullable(),
});
/** Explicit customer projection. Parsing drops internal fields before rendering. */
export function composedEstimateDocument(raw: unknown): {
  document: ComposedProposalDocument;
  party: {
    clientId: string;
    propertyId: string;
    clientName: string;
    propertyName: string;
    address: string;
    billingAddress: string | null;
  };
} {
  try {
    const source = z
      .object({
        schemaVersion: z.literal(1),
        changeOrder: z
          .object({ title: z.string(), revision: z.number().int().positive() })
          .nullable()
          .optional(),
        content: z.unknown(),
        dates: compositionDates,
        party: z.object({
          clientId: z.string().uuid(),
          propertyId: z.string().uuid(),
          "client.name": z.string(),
          "client.billing_address": z.string().nullable(),
          "property.name": z.string(),
          "property.address": z.string(),
        }),
        allocations: z.array(allocation).min(1).max(3),
      })
      .parse(raw);
    // Rendered placeholders can make strings longer than their source editor
    // limits. Validate the document shape without truncating negotiated text.
    const content = z
      .object({
        terms: z.string(),
        scope: z.object({
          items: z.array(
            z.object({
              id: z.string().uuid(),
              title: z.string(),
              description: z.string(),
            }),
          ),
          exclusions: z.string(),
        }),
        costs: z.object({
          items: z.array(
            z.object({
              id: z.string().uuid(),
              description: z.string(),
              quantity: z.number().positive(),
              unit: z.string(),
              basis: z.enum(["one_time", "fixed_monthly", "per_visit"]),
              unitPriceCents: cents,
              totalCents: cents,
            }),
          ),
        }),
        notes: z.object({
          scope: z.string(),
          cost: z.string(),
          package: z.string(),
        }),
      })
      .parse(source.content);
    const fail = () => {
      throw new Error("Inconsistent composed document");
    };
    if (
      new Set(source.allocations.map((row) => row.basis)).size !==
      source.allocations.length
    )
      fail();
    const coveredCosts = new Set<string>(),
      coveredScope = new Set<string>();
    for (const item of source.allocations) {
      if (
        !item.scopeRowIds.length ||
        !item.costRowIds.length ||
        new Set(item.scopeRowIds).size !== item.scopeRowIds.length ||
        new Set(item.costRowIds).size !== item.costRowIds.length
      )
        fail();
      for (const id of item.scopeRowIds) {
        if (!content.scope.items.some((row) => row.id === id)) fail();
        coveredScope.add(id);
      }
      let rate = 0;
      for (const id of item.costRowIds) {
        const row = content.costs.items.find((row) => row.id === id);
        if (!row || row.basis !== item.basis || coveredCosts.has(id))
          return fail();
        coveredCosts.add(id);
        rate += row.totalCents;
      }
      const limit =
        item.basis === "one_time"
          ? rate
          : item.basis === "fixed_monthly"
            ? item.periods.reduce((sum, period) => sum + period.amountCents, 0)
            : rate * (item.maximumVisits || 0);
      if (
        rate !== item.rateCents ||
        limit !== item.authorizedAmountCents ||
        limit <= 0 ||
        (item.basis === "one_time") !== (item.configuration === null)
      )
        fail();
    }
    if (
      coveredCosts.size !== content.costs.items.length ||
      coveredScope.size !== content.scope.items.length
    )
      fail();
    const components = source.allocations.map((item) => ({
      title: item.title,
      basis: item.basis,
      scope: content.scope.items
        .filter((row) => item.scopeRowIds.includes(row.id))
        .map(({ title, description }) => ({ title, description })),
      costs: content.costs.items
        .filter((row) => item.costRowIds.includes(row.id))
        .map((row) => ({
          description: row.description,
          quantity: row.quantity,
          unit: row.unit,
          unitPriceCents: row.unitPriceCents,
          totalCents: row.totalCents,
        })),
      rateCents: item.rateCents,
      authorizedAmountCents: item.authorizedAmountCents,
      maximumVisits: item.maximumVisits,
      periods: item.periods,
      schedule: item.configuration
        ? {
            cadence: item.configuration.cadence,
            intervalCount: item.configuration.intervalCount,
            localTime: item.configuration.localTime,
            firstVisitOn: item.configuration.firstVisitOn,
            timeZone: "America/New_York" as const,
          }
        : null,
    }));
    return {
      document: {
        schemaVersion: 1,
        changeOrder: source.changeOrder ?? null,
        ...source.dates,
        terms: content.terms,
        scopeNotes: content.notes.scope,
        costNotes: content.notes.cost,
        packageNotes: content.notes.package,
        exclusions: content.scope.exclusions,
        authorizedAmountCents: components.reduce(
          (sum, component) => sum + component.authorizedAmountCents,
          0,
        ),
        components,
      },
      party: {
        clientId: source.party.clientId,
        propertyId: source.party.propertyId,
        clientName: source.party["client.name"],
        propertyName: source.party["property.name"],
        address: source.party["property.address"],
        billingAddress: source.party["client.billing_address"],
      },
    };
  } catch {
    throw new HttpError(409, "Composed proposal snapshot needs review");
  }
}
