import test from "node:test";
import assert from "node:assert/strict";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import {
  serviceAgreement,
  fixedChargePeriod,
  agreementCharge,
  agreementChargeReviewEvent,
} from "@workspace/db/dashboard-schema";
import { pool } from "./database";
const enabled = Boolean(process.env.AGREEMENT_TEST_DATABASE_URL);
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
test(
  "agreement Drizzle metadata matches migrated columns, checks, references and charge uniqueness",
  { skip: !enabled },
  async () => {
    const client = await pool.connect();
    const dialect = new PgDialect();
    try {
      await client.query("BEGIN");
      for (const table of [
        serviceAgreement,
        fixedChargePeriod,
        agreementCharge,
        agreementChargeReviewEvent,
      ]) {
        const config = getTableConfig(table);
        const columns = (
          await client.query(
            `SELECT column_name, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
            [config.name],
          )
        ).rows;
        assert.equal(
          columns.length,
          config.columns.length,
          config.name + " column count",
        );
        for (const c of config.columns) {
          const actual = columns.find((r) => r.column_name === c.name);
          assert.ok(actual, c.name);
          assert.equal(
            actual.is_nullable === "NO",
            c.notNull,
            c.name + " nullability",
          );
          const types: Record<string, string> = {
            uuid: "uuid",
            jsonb: "jsonb",
            text: "text",
            integer: "int4",
            bigint: "int8",
            boolean: "bool",
            date: "date",
            "timestamp with time zone": "timestamptz",
          };
          assert.equal(
            actual.udt_name,
            types[c.getSQLType()],
            c.name + " type",
          );
          assert.equal(
            actual.column_default !== null,
            c.hasDefault,
            c.name + " default presence",
          );
        }
        // Let PostgreSQL normalize ORM check SQL and defaults using its own parser.
        const temp = "mirror_" + config.name;
        await client.query(
          `CREATE TEMP TABLE ${quote(temp)} (LIKE ${quote(config.name)}) ON COMMIT DROP`,
        );
        for (const c of config.columns)
          if (c.hasDefault) {
            const value =
              typeof c.default === "object"
                ? dialect.sqlToQuery(
                    c.default as Parameters<PgDialect["sqlToQuery"]>[0],
                  ).sql
                : typeof c.default === "string"
                  ? "'" + c.default.replaceAll("'", "''") + "'"
                  : String(c.default);
            await client.query(
              `ALTER TABLE ${quote(temp)} ALTER COLUMN ${quote(c.name)} SET DEFAULT ${value}`,
            );
          }
        for (const c of config.checks)
          await client.query(
            `ALTER TABLE ${quote(temp)} ADD CONSTRAINT ${quote(c.name)} CHECK (${dialect.sqlToQuery(c.value).sql})`,
          );
        const checks = async (name: string) =>
          (
            await client.query(
              "SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid=$1::regclass AND contype='c' ORDER BY definition",
              [name],
            )
          ).rows;
        assert.deepEqual(
          await checks(temp),
          await checks(config.name),
          config.name + " checks",
        );
        const defaults = async (name: string) =>
          (
            await client.query(
              "SELECT a.attname,pg_get_expr(d.adbin,d.adrelid) AS expression FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum WHERE d.adrelid=$1::regclass ORDER BY a.attname",
              [name],
            )
          ).rows;
        assert.deepEqual(
          await defaults(temp),
          await defaults(config.name),
          config.name + " defaults",
        );
        const foreign = config.foreignKeys.map((f) => {
          const ref = f.reference();
          return {
            columns: ref.columns.map((c) => c.name),
            target: getTableConfig(ref.foreignTable).name,
            foreign: ref.foreignColumns.map((c) => c.name),
            update: f.onUpdate || "no action",
            delete: f.onDelete || "no action",
          };
        });
        const actualForeign = (
          await client.query(
            `SELECT ARRAY(SELECT attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,pos) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY pos) AS columns, (SELECT relname::text FROM pg_class WHERE oid=c.confrelid) AS target, ARRAY(SELECT attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num,pos) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num ORDER BY pos) AS foreign, CASE c.confupdtype WHEN 'a' THEN 'no action' WHEN 'r' THEN 'restrict' WHEN 'c' THEN 'cascade' WHEN 'n' THEN 'set null' WHEN 'd' THEN 'set default' END AS update, CASE c.confdeltype WHEN 'a' THEN 'no action' WHEN 'r' THEN 'restrict' WHEN 'c' THEN 'cascade' WHEN 'n' THEN 'set null' WHEN 'd' THEN 'set default' END AS delete FROM pg_constraint c WHERE c.conrelid=$1::regclass AND c.contype='f'`,
            [config.name],
          )
        ).rows;
        const sorted = (rows: unknown[]) =>
          rows.map((r) => JSON.stringify(r)).sort();
        assert.deepEqual(
          sorted(foreign),
          sorted(actualForeign),
          config.name + " foreign keys",
        );
        const primary = [
          ...config.primaryKeys.map((p) => p.columns.map((c) => c.name)),
          ...config.columns.filter((c) => c.primary).map((c) => [c.name]),
        ];
        const actualPrimary = (
          await client.query(
            `SELECT ARRAY(SELECT attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,pos) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY pos) AS columns FROM pg_constraint c WHERE c.conrelid=$1::regclass AND c.contype='p'`,
            [config.name],
          )
        ).rows.map((r) => r.columns);
        assert.deepEqual(
          sorted(primary),
          sorted(actualPrimary),
          config.name + " primary keys",
        );
        const indexCount = (
          await client.query(
            "SELECT count(*)::int AS count FROM pg_index i WHERE i.indrelid=$1::regclass AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid=i.indexrelid)",
            [config.name],
          )
        ).rows[0].count;
        assert.equal(
          indexCount,
          config.indexes.length,
          config.name + " standalone index count",
        );
        const unique = [
          ...config.uniqueConstraints.map((u) => u.columns.map((c) => c.name)),
          ...config.columns.filter((c) => c.isUnique).map((c) => [c.name]),
        ];
        const actualUnique = (
          await client.query(
            `SELECT ARRAY(SELECT attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,pos) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY pos) AS columns FROM pg_constraint c WHERE c.conrelid=$1::regclass AND c.contype='u'`,
            [config.name],
          )
        ).rows.map((r) => r.columns);
        assert.deepEqual(
          sorted(unique),
          sorted(actualUnique),
          config.name + " uniqueness",
        );
        for (const index of config.indexes) {
          const def = index.config;
          const row = (
            await client.query(
              "SELECT i.indisunique, pg_get_expr(i.indpred,i.indrelid) AS predicate, ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(num,pos) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.num ORDER BY pos) AS columns FROM pg_index i WHERE i.indexrelid=$1::regclass",
              [def.name],
            )
          ).rows[0];
          assert.equal(row.indisunique, def.unique, def.name);
          assert.deepEqual(
            row.columns,
            def.columns.map((c) => ("name" in c ? c.name : null)),
            def.name,
          );
          assert.equal(
            row.predicate?.replace(/[()]/g, "") || null,
            def.where ? dialect.sqlToQuery(def.where).sql : null,
            def.name,
          );
        }
      }
    } finally {
      await client.query("ROLLBACK");
      client.release();
      await pool.end();
    }
  },
);
