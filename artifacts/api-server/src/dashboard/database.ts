import pg from "pg";
import * as schema from "@workspace/db/dashboard-schema";
import { drizzle } from "drizzle-orm/node-postgres";
export const pool = new pg.Pool({
  connectionString: process.env.DASHBOARD_DATABASE_URL,
  max: 10,
});
export const database = drizzle(pool, { schema });
export async function transaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
