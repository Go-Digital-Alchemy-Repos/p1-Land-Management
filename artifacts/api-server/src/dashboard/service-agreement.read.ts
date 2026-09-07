import { z } from "zod";
import type { Actor } from "./access";
import { pool, transaction } from "./database";
import { requireRole } from "./policy";
import {
  lockedAgreement,
  activePeriods,
  agreementDto,
} from "./service-agreement.persistence";
const readers = ["owner", "manager", "finance", "dispatch"] as const;
export async function readServiceAgreement(a: Actor, id: string) {
  requireRole(a.role, [...readers]);
  return transaction(async (c) => {
    const { agreement } = await lockedAgreement(c, id);
    return agreementDto(
      agreement,
      a.role === "dispatch" ? [] : await activePeriods(c, id),
      a.role !== "dispatch",
    );
  });
}
const query = z
  .object({
    propertyId: z.string().uuid().optional(),
    after: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();
export async function listServiceAgreements(a: Actor, input: unknown) {
  requireRole(a.role, [...readers]);
  const b = query.parse(input);
  const rows = (
    await pool.query(
      `SELECT a.*,a.starts_on::text,a.ends_on::text,a.activated_on::text,a.cancellation_effective_on::text FROM service_agreement a JOIN property p ON p.id=a.property_id WHERE p.lifecycle='operational' AND p.client_id IS NOT NULL AND ($1::uuid IS NULL OR a.property_id=$1) AND ($2::uuid IS NULL OR a.id>$2) ORDER BY a.id LIMIT $3`,
      [b.propertyId || null, b.after || null, b.limit + 1],
    )
  ).rows;
  const page = rows.slice(0, b.limit),
    financial = a.role !== "dispatch";
  const periods =
    financial && page.length
      ? (
          await pool.query(
            "SELECT id,agreement_id,starts_on::text,ends_on::text,amount_cents FROM fixed_charge_period WHERE agreement_id=ANY($1::uuid[]) AND active=true ORDER BY starts_on",
            [page.map((r) => r.id)],
          )
        ).rows
      : [];
  return {
    items: page.map((r) =>
      agreementDto(
        r,
        periods.filter((p) => p.agreement_id === r.id),
        financial,
      ),
    ),
    nextCursor: rows.length > b.limit ? (page.at(-1)!.id as string) : null,
  };
}
