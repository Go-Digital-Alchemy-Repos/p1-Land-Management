import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { recordDbQuery } from "./utils/metrics";
import { databasePoolConfig } from "./config/database";

const { Pool } = pg;

export const pool = new Pool(databasePoolConfig(process.env));

const origPoolQuery = Pool.prototype.query;
Pool.prototype.query = function patchedQuery(this: pg.Pool, ...args: unknown[]) {
  const start = Date.now();
  const result = origPoolQuery.apply(this, args as Parameters<typeof origPoolQuery>);
  if (result != null && typeof result === "object" && "then" in result) {
    (result as Promise<unknown>).then(
      () => recordDbQuery(Date.now() - start),
      () => recordDbQuery(Date.now() - start),
    );
  }
  return result;
} as typeof origPoolQuery;

export const db = drizzle(pool, { schema });
