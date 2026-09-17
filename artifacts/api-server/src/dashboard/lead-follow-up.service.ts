import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";
const input = z
  .object({
    expectedVersion: z.number().int().positive(),
    ownerId: z.string().min(1).max(200).nullable(),
    nextAction: z.string().trim().min(1).max(2000),
    nextActionDueAt: z.string().datetime().nullable(),
    status: z.enum([
      "new",
      "contacted",
      "qualified",
      "proposal",
      "won",
      "lost",
    ]),
  })
  .strict();
export function followUpProjection(row: Record<string, any>) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    owner_id: row.owner_id,
    next_action: row.next_action,
    next_action_due_at: row.next_action_due_at,
    last_activity_at: row.last_activity_at,
    version: row.version,
    converted_client_id: row.converted_client_id,
    converted_property_id: row.converted_property_id,
  };
}
export async function getLeadFollowUp(id: string) {
  const lead = (
    await pool.query(
      "SELECT id,name,status,owner_id,next_action,next_action_due_at,last_activity_at,version,converted_client_id,converted_property_id FROM lead WHERE id=$1",
      [id],
    )
  ).rows[0];
  if (!lead) throw new HttpError(404, "Inquiry not found");
  const owners = (
    await pool.query(`SELECT u.id,u.name FROM "user" u JOIN staff_profile p ON p.user_id=u.id LEFT JOIN business_account_access a ON a.user_id=u.id
 WHERE p.active=true AND (p.role='owner' OR (p.role NOT IN ('crew','client') AND 'revenue.sales'=ANY(a.capabilities))) ORDER BY u.name,u.id`)
  ).rows;
  return { lead: followUpProjection(lead), owners };
}
/** Shared versioned follow-up write; preserves the legacy commercial-only contract. */
export async function updateLeadFollowUp(
  id: string,
  actorId: string,
  value: unknown,
  commercialOnly = false,
) {
  const body = input.parse(value);
  return transaction(async (c) => {
    if (body.ownerId) {
      const profile = (
        await c.query(
          "SELECT role,active FROM staff_profile WHERE user_id=$1 FOR SHARE",
          [body.ownerId],
        )
      ).rows[0];
      const grants = (
        await c.query(
          "SELECT capabilities FROM business_account_access WHERE user_id=$1 FOR SHARE",
          [body.ownerId],
        )
      ).rows[0];
      if (
        !profile?.active ||
        (profile.role !== "owner" &&
          (["crew", "client"].includes(profile.role) ||
            !grants?.capabilities?.includes("revenue.sales")))
      )
        throw new HttpError(400, "Active sales owner required");
    }
    const row = (
      await c.query(
        `UPDATE lead SET owner_id=$2,next_action=$3,next_action_due_at=$4,status=$5,last_activity_at=now(),version=version+1 WHERE id=$1 AND version=$6 ${commercialOnly ? "AND inquiry_type='commercial_site_assessment'" : ""} RETURNING *`,
        [
          id,
          body.ownerId,
          body.nextAction,
          body.nextActionDueAt,
          body.status,
          body.expectedVersion,
        ],
      )
    ).rows[0];
    if (!row)
      throw new HttpError(409, "Inquiry changed; refresh before saving");
    await c.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        actorId,
        row.inquiry_type === "commercial_site_assessment"
          ? "commercial.followup_updated"
          : "lead.followup_updated",
        id,
        { version: row.version, status: row.status, ownerId: body.ownerId },
      ],
    );
    return row;
  });
}
