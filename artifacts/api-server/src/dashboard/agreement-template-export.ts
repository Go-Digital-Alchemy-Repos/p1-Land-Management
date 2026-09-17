import { randomUUID } from "node:crypto";
import { z } from "zod";
import { transaction } from "./database";
import { HttpError } from "./policy";
import {
  compositionContent,
  type CompositionContent,
} from "./agreement-composition.contract";
import { validateTemplateContent } from "./agreement-template.contract";
export const templateExportRequest = z
  .object({
    expectedVersion: z.number().int().positive(),
    kind: z.enum(["msa", "scope", "cost"]),
  })
  .strict();
type Detail = { value: string; placeholder?: string; phone?: boolean };
const normalize = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Known context matching is deliberately not a claim of general PII detection.
 * Exported text is a draft for human review, never automatically published.
 */
export function reusableContent(source: CompositionContent, details: Detail[]) {
  const replacements = new Map<string, string>();
  for (const detail of details) {
    const key = normalize(detail.value);
    if (!key || key.startsWith("{{")) continue;
    const replacement = detail.placeholder
      ? `{{${detail.placeholder}}}`
      : "[REVIEW: private detail removed]";
    const existing = replacements.get(key);
    replacements.set(
      key,
      existing && existing !== replacement
        ? "[REVIEW: ambiguous context removed]"
        : replacement,
    );
  }
  const aliases = [...replacements.keys()]
    .sort((a, b) => b.length - a.length)
    .map((value) => escape(value).replace(/ /g, "\\s+"));
  const phones = details
    .filter((detail) => detail.phone)
    .map((detail) => detail.value.replace(/\D/g, ""))
    .filter((value) => value.length >= 7)
    .map((value) => value.split("").join("[\\s().+-]*"));
  const known = [...aliases, ...phones];
  const pattern = new RegExp(
    [
      "\\{\\{[^{}]*\\}\\}",
      ...(known.length
        ? [`(?<![\\p{L}\\p{N}_])(?:${known.join("|")})(?![\\p{L}\\p{N}_])`]
        : []),
      "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
      "[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\\.[a-z0-9-]+)+",
    ].join("|"),
    "giu",
  );
  let removedDetails = 0;
  function scrub(value: string) {
    return value.replace(pattern, (match) => {
      if (match.startsWith("{{")) {
        const token = match.slice(2, -2).trim();
        if (
          [
            "client.name",
            "client.billing_address",
            "property.name",
            "property.address",
            "agreement.prepared_on",
            "agreement.starts_on",
            "agreement.ends_on",
          ].includes(token)
        )
          return match;
        removedDetails++;
        return "[REVIEW: unsupported placeholder removed]";
      }
      removedDetails++;
      return (
        replacements.get(normalize(match)) || "[REVIEW: private detail removed]"
      );
    });
  }
  const content: CompositionContent = {
    terms: scrub(source.terms),
    scope: {
      items: source.scope.items.map((item) => ({
        id: randomUUID(),
        title: scrub(item.title),
        description: scrub(item.description),
      })),
      exclusions: scrub(source.scope.exclusions),
    },
    costs: {
      items: source.costs.items.map((item) => ({
        id: randomUUID(),
        description: scrub(item.description),
        unit: scrub(item.unit),
        quantity: 1,
        unitPriceCents: 0,
        basis: item.basis,
      })),
    },
    notes: {
      scope: scrub(source.notes.scope),
      cost: scrub(source.notes.cost),
      package: scrub(source.notes.package),
    },
  };
  return {
    content: compositionContent.parse(content),
    removedDetails,
    resetCostRows: source.costs.items.length,
  };
}
export async function prepareReusableTemplate(key: string, raw: unknown) {
  const b = templateExportRequest.parse(raw);
  return transaction(async (c) => {
    const row = (
      await c.query(
        "SELECT * FROM agreement_composition_draft WHERE id=$1 FOR SHARE",
        [key],
      )
    ).rows[0];
    if (!row) throw new HttpError(404, "Agreement draft not found");
    if (row.version !== b.expectedVersion)
      throw new HttpError(
        409,
        "Agreement changed. Reload before preparing a reusable template.",
      );
    const details: Detail[] = [];
    const add = (value: unknown, placeholder?: string, phone = false) => {
      if (typeof value === "string" && value.trim())
        details.push({ value, placeholder, phone });
    };
    for (const [placeholder, value] of Object.entries(row.context_snapshot))
      add(value, placeholder);
    for (const [field, placeholder] of [
      ["preparedOn", "agreement.prepared_on"],
      ["startsOn", "agreement.starts_on"],
      ["endsOn", "agreement.ends_on"],
    ]) {
      const date = row.dates[field!];
      if (!date) continue;
      add(date, placeholder);
      const [year, month, day] = date.split("-");
      add(`${Number(month)}/${Number(day)}/${year}`, placeholder);
      add(`${month}/${day}/${year}`, placeholder);
    }
    const client = row.client_id
      ? (
          await c.query("SELECT name,billing_address FROM client WHERE id=$1", [
            row.client_id,
          ])
        ).rows[0]
      : null;
    add(client?.name, "client.name");
    add(client?.billing_address, "client.billing_address");
    const property = row.property_id
      ? (
          await c.query("SELECT name,address FROM property WHERE id=$1", [
            row.property_id,
          ])
        ).rows[0]
      : null;
    add(property?.name, "property.name");
    add(property?.address, "property.address");
    const lead = row.lead_id
      ? (
          await c.query(
            "SELECT name,email,phone,location,reported_company_name,reported_property_name,contact_id,organization_id FROM lead WHERE id=$1",
            [row.lead_id],
          )
        ).rows[0]
      : null;
    for (const key of [
      "name",
      "email",
      "location",
      "reported_company_name",
      "reported_property_name",
    ])
      add(lead?.[key]);
    add(lead?.phone, undefined, true);
    const organizations = (
      await c.query(
        "SELECT id,display_name,legal_name FROM business_organization WHERE client_id=$1 OR id=$2",
        [row.client_id, lead?.organization_id || null],
      )
    ).rows;
    for (const organization of organizations) {
      add(organization.display_name);
      add(organization.legal_name);
    }
    const contacts = (
      await c.query(
        "SELECT name,email,phone FROM contact WHERE client_id=$1 OR id=$2 OR EXISTS (SELECT 1 FROM organization_contact oc WHERE oc.contact_id=contact.id AND oc.organization_id=ANY($3::uuid[]))",
        [
          row.client_id,
          lead?.contact_id || null,
          organizations.map((organization) => organization.id),
        ],
      )
    ).rows;
    for (const contact of contacts) {
      add(contact.name);
      add(contact.email);
      add(contact.phone, undefined, true);
    }
    const result = reusableContent(
      compositionContent.parse(row.content),
      details,
    );
    const candidate = {
      name: `Reusable ${b.kind === "msa" ? "agreement terms" : b.kind === "scope" ? "scope" : "cost breakdown"}`,
      description: "",
      body:
        b.kind === "msa"
          ? result.content.terms
          : b.kind === "scope"
            ? result.content.notes.scope
            : result.content.notes.cost,
      payload:
        b.kind === "msa"
          ? {}
          : b.kind === "scope"
            ? result.content.scope
            : result.content.costs,
    };
    return {
      kind: b.kind,
      ...validateTemplateContent(b.kind, candidate),
      sourceVersion: row.version,
      removedDetails: result.removedDetails,
      resetCostRows: b.kind === "cost" ? result.resetCostRows : 0,
    };
  });
}
