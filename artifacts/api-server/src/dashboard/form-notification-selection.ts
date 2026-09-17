import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { actor, identity } from "./access";
import { pool } from "./database";
import { HttpError } from "./policy";
import { marketingConnection } from "./marketing-reporting.transport";
import { callCms, cmsOperations } from "./marketing-cms.transport";

const catalogSchema = z.object({
  items: z.array(z.object({ id: z.string(), isActive: z.boolean() })),
});
export async function validateAddedFormSubscriptions(
  current: readonly string[],
  requested: readonly string[],
  capabilities: readonly string[],
  load: () => Promise<{ id: string; isActive: boolean }[]>,
) {
  const added = requested.filter((id) => !current.includes(id));
  if (!added.length) return;
  if (!capabilities.includes("marketing.content.forms"))
    throw new HttpError(
      400,
      "Grant Forms access before adding form notifications",
    );
  const forms = await load();
  if (
    added.some((id) => !forms.some((form) => form.id === id && form.isActive))
  )
    throw new HttpError(
      400,
      "Choose active forms from the current website catalog",
    );
}

export async function loadManagedNotificationForms(req: Request) {
  const owner = await actor(req);
  if (owner.role !== "owner") throw new HttpError(403, "Owner access required");
  const session = await identity(req);
  if (owner.id !== session.user.id) throw new HttpError(401, "Sign in again");
  const connection = marketingConnection();
  const grant = randomUUID();
  try {
    await pool.query(
      "INSERT INTO core_federation_grant(id,canonical_user_id,canonical_session_id,owner_attested,expires_at) VALUES($1,$2,$3,true,now()+interval '60 seconds')",
      [grant, owner.id, session.session.id],
    );
    const operation = cmsOperations.find(
      (item) => item.path === "/notification-forms" && item.method === "GET",
    )!;
    const response = await callCms(
      connection,
      operation,
      {},
      {},
      undefined,
      grant,
      fetch,
    );
    const catalog = catalogSchema.safeParse(response.body);
    if (response.status !== 200 || !catalog.success)
      throw new HttpError(
        503,
        "Website form catalog unavailable; new subscriptions were not saved",
      );
    return catalog.data.items;
  } finally {
    await pool.query("DELETE FROM core_federation_grant WHERE id=$1", [grant]);
  }
}
