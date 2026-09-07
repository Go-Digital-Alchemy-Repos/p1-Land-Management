import type { Pool } from "pg";
// Load the existing database only when a federation operation needs it.
const pool = {
  query: async (...args: unknown[]) => {
    const db = await import("../db");
    return Reflect.apply(db.pool.query, db.pool, args);
  },
  connect: async () => (await import("../db")).pool.connect(),
} as unknown as Pool;
import { createFederationConsumer } from "./federation-consumer";
import { createFederationClient, federationConfig } from "./federation-client";
export const FEDERATION_COOKIE = "p1_federation_session";
export function federationConsumer() {
  return createFederationConsumer(pool, createFederationClient(federationConfig()));
}
export async function hasFederationHistory(userId: string) {
  return Boolean(
    (await pool.query("SELECT 1 FROM p1_identity_link WHERE core_user_id=$1", [userId])).rowCount,
  );
}
/** Same user lock as linking prevents a concurrent reset restoring a password after linking. */
export async function updateUnlinkedPassword(userId: string, passwordHash: string) {
  const { federationEnabled, FederationError } = await import("./federation-client");
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
    if (
      federationEnabled() ||
      (await c.query("SELECT 1 FROM p1_identity_link WHERE core_user_id=$1", [userId])).rowCount
    )
      throw new FederationError(403, "Use P1 Dashboard password settings");
    await c.query("UPDATE users SET password=$2,updated_at=now() WHERE id=$1", [
      userId,
      passwordHash,
    ]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}
