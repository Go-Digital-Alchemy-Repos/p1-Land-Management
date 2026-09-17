import type {
  AgreementTemplate,
  AgreementTemplateKind,
  AgreementScopePayload,
  AgreementCostPayload,
  AgreementPackagePayload,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { agreementCents } from "../agreement-ui";
export const message = (error: unknown) =>
  (error as { data?: { error?: string; message?: string } }).data?.message ||
  (error as { data?: { error?: string } }).data?.error ||
  (error as Error).message ||
  "Template request failed";
export const labels = {
  msa: "MSA",
  scope: "Scope",
  cost: "Cost breakdown",
  package: "Agreement package",
};
export type Draft = {
  name: string;
  description: string;
  body: string;
  scope: AgreementScopePayload;
  costs: (Omit<
    AgreementCostPayload["items"][number],
    "quantity" | "unitPriceCents"
  > & { quantity: string; amount: string })[];
  package: AgreementPackagePayload;
};
export function draft(row: AgreementTemplate | null): Draft {
  const cost =
    row?.kind === "cost"
      ? (row.payload as AgreementCostPayload)
      : { items: [] };
  return {
    name: row?.name || "",
    description: row?.description || "",
    body: row?.body || "",
    scope:
      row?.kind === "scope"
        ? structuredClone(row.payload as AgreementScopePayload)
        : { items: [], exclusions: "" },
    costs: cost.items.map((item) => ({
      ...item,
      quantity: String(item.quantity),
      amount: (item.unitPriceCents / 100).toFixed(2),
    })),
    package:
      row?.kind === "package"
        ? structuredClone(row.payload as AgreementPackagePayload)
        : { msaId: null, scopeId: null, costId: null },
  };
}
export function payload(kind: AgreementTemplateKind, value: Draft) {
  if (kind === "msa") return {};
  if (kind === "scope") return value.scope;
  if (kind === "package") return value.package;
  return {
    items: value.costs.map(({ quantity, amount, ...row }) => {
      if (!/^\d+(\.\d{1,2})?$/.test(quantity) || Number(quantity) <= 0)
        throw new Error(
          "Quantity must be positive with at most two decimal places.",
        );
      const unitPriceCents = /^0(?:\.0{1,2})?$/.test(amount)
        ? 0
        : agreementCents(amount);
      return { ...row, quantity: Number(quantity), unitPriceCents };
    }),
  };
}
