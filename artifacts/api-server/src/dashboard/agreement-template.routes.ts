import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { hasCapability } from "@workspace/api-zod/business-access";
import { actor } from "./access";
import { pool, transaction } from "./database";
import { HttpError, requireAnyCapability, requireCapability } from "./policy";
import {
  templateKind,
  templateCreate,
  templateEdit,
  templateVersion,
  validateTemplateContent,
} from "./agreement-template.contract";
import type { PoolClient } from "pg";
type TemplateValue = z.infer<typeof templateCreate>;
type TemplateRecord = TemplateValue & {
  id: string;
  version: number;
  edit_version: number;
  family_id: string;
  status: "draft" | "published" | "archived";
  active: boolean;
};
const id = z.string().uuid();
const manager = "revenue.agreement-templates.manage" as const;
const read = ["revenue.sales", "revenue.agreements", manager] as const;
const columns =
  "id,name,version,body,active,created_at,updated_at,kind,status,description,payload,edit_version,family_id,source_template_id";
async function audit(
  c: PoolClient,
  userId: string,
  action: string,
  entityId: string,
  details: unknown = {},
) {
  await c.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
    [
      randomUUID(),
      userId,
      `agreement-template.${action}`,
      entityId,
      JSON.stringify(details),
    ],
  );
}
async function locked(c: PoolClient, key: string, expected?: number) {
  const found = (
    await c.query("SELECT family_id FROM agreement_template WHERE id=$1", [key])
  ).rows[0];
  if (!found) throw new HttpError(404, "Agreement template not found");
  // Serialize revisions/publication within the family; a row lock alone cannot protect sibling versions.
  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 12931))", [
    found.family_id,
  ]);
  const row = (
    await c.query<TemplateRecord>(
      "SELECT * FROM agreement_template WHERE id=$1 FOR UPDATE",
      [key],
    )
  ).rows[0];
  if (expected !== undefined && row.edit_version !== expected)
    throw new HttpError(
      409,
      "Template changed. Reload before applying your changes.",
    );
  return row;
}
function content(
  kind: z.infer<typeof templateKind>,
  raw: unknown,
  publish = false,
) {
  try {
    return validateTemplateContent(kind, raw, publish);
  } catch (error) {
    if (error instanceof z.ZodError) throw error;
    throw new HttpError(400, (error as Error).message);
  }
}
async function checkPackage(c: PoolClient, payload: Record<string, unknown>) {
  for (const [field, kind] of [
    ["msaId", "msa"],
    ["scopeId", "scope"],
    ["costId", "cost"],
  ]) {
    const row = (
      await c.query(
        "SELECT kind,status FROM agreement_template WHERE id=$1 FOR SHARE",
        [payload[field!]],
      )
    ).rows[0];
    if (!row || row.kind !== kind || row.status !== "published")
      throw new HttpError(409, `Choose a published ${kind} version`);
  }
}
async function insert(
  c: PoolClient,
  userId: string,
  value: TemplateValue,
  options: {
    familyId?: string;
    version?: number;
    sourceId?: string;
    status?: string;
  } = {},
) {
  const key = randomUUID(),
    status = options.status || "draft";
  const row = (
    await c.query(
      `INSERT INTO agreement_template(id,name,version,body,active,created_by,kind,status,description,payload,family_id,source_template_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${columns}`,
      [
        key,
        value.name,
        options.version || 1,
        value.body,
        status === "published",
        userId,
        value.kind,
        status,
        value.description,
        JSON.stringify(value.payload),
        options.familyId || key,
        options.sourceId || null,
      ],
    )
  ).rows[0];
  await audit(c, userId, "created", key, {
    kind: value.kind,
    status,
    sourceId: options.sourceId || null,
  });
  return row;
}
export const agreementTemplateApi = Router();
agreementTemplateApi.get("/agreement-templates", async (req, res) => {
  const a = await actor(req);
  requireAnyCapability(a, read);
  const query = z
    .object({
      kind: z.union([templateKind, z.literal("all")]).default("msa"),
      state: z
        .enum(["published", "draft", "archived", "all"])
        .default("published"),
    })
    .strict()
    .parse(req.query);
  if (query.state !== "published") requireCapability(a, manager);
  res.json(
    (
      await pool.query(
        `SELECT ${columns} FROM agreement_template WHERE ($1='all' OR kind=$1) AND ($2='all' OR status=$2) ORDER BY name,version DESC`,
        [query.kind, query.state],
      )
    ).rows,
  );
});
agreementTemplateApi.get("/agreement-templates/:id", async (req, res) => {
  const a = await actor(req);
  requireAnyCapability(a, read);
  const key = id.parse(req.params.id);
  const row = (
    await pool.query(`SELECT ${columns} FROM agreement_template WHERE id=$1`, [
      key,
    ])
  ).rows[0];
  if (!row || (row.status === "draft" && !hasCapability(a, manager)))
    throw new HttpError(404, "Agreement template not found");
  res.json(row);
});
agreementTemplateApi.post("/agreement-templates", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, manager);
  // Preserve the existing body-only creation contract as an immediately published MSA.
  const legacy = req.body?.kind === undefined;
  const raw = legacy
    ? {
        ...z
          .object({ name: z.string(), body: z.string().trim().min(1) })
          .strict()
          .parse(req.body),
        kind: "msa" as const,
        description: "",
        payload: {},
      }
    : templateCreate.parse(req.body);
  const value = content(
    raw.kind,
    {
      name: raw.name,
      body: raw.body,
      description: raw.description,
      payload: raw.payload,
    },
    legacy,
  );
  res
    .status(201)
    .json(
      await transaction((c) =>
        insert(
          c,
          a.id,
          { ...value, kind: raw.kind },
          { status: legacy ? "published" : "draft" },
        ),
      ),
    );
});
agreementTemplateApi.put("/agreement-templates/:id", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, manager);
  const key = id.parse(req.params.id),
    { expectedEditVersion, ...raw } = templateEdit.parse(req.body);
  res.json(
    await transaction(async (c) => {
      const old = await locked(c, key, expectedEditVersion);
      if (old.status !== "draft")
        throw new HttpError(
          409,
          "Published and archived versions are immutable; create a revision",
        );
      const value = content(old.kind, raw);
      const row = (
        await c.query(
          `UPDATE agreement_template SET name=$2,body=$3,description=$4,payload=$5,edit_version=edit_version+1,updated_at=now() WHERE id=$1 RETURNING ${columns}`,
          [
            key,
            value.name,
            value.body,
            value.description,
            JSON.stringify(value.payload),
          ],
        )
      ).rows[0];
      await audit(c, a.id, "updated", key, { editVersion: row.edit_version });
      return row;
    }),
  );
});
agreementTemplateApi.post(
  "/agreement-templates/:id/publish",
  async (req, res) => {
    const a = await actor(req);
    requireCapability(a, manager);
    const key = id.parse(req.params.id),
      b = templateVersion.parse(req.body);
    res.json(
      await transaction(async (c) => {
        const old = await locked(c, key, b.expectedEditVersion);
        if (old.status !== "draft")
          throw new HttpError(409, "Only draft versions can be published");
        const value = content(
          old.kind,
          {
            name: old.name,
            body: old.body,
            description: old.description,
            payload: old.payload,
          },
          true,
        );
        if (old.kind === "package") await checkPackage(c, value.payload);
        if (
          (
            await c.query(
              "SELECT 1 FROM agreement_template WHERE family_id=$1 AND version>$2 AND status<>'draft'",
              [old.family_id, old.version],
            )
          ).rowCount
        )
          throw new HttpError(409, "A newer version already exists");
        await c.query(
          "UPDATE agreement_template SET status='archived',active=false,edit_version=edit_version+1,updated_at=now() WHERE family_id=$1 AND status='published'",
          [old.family_id],
        );
        const row = (
          await c.query(
            `UPDATE agreement_template SET status='published',active=true,edit_version=edit_version+1,updated_at=now() WHERE id=$1 RETURNING ${columns}`,
            [key],
          )
        ).rows[0];
        await audit(c, a.id, "published", key, { version: row.version });
        return row;
      }),
    );
  },
);
agreementTemplateApi.post(
  "/agreement-templates/:id/archive",
  async (req, res) => {
    const a = await actor(req);
    requireCapability(a, manager);
    const key = id.parse(req.params.id),
      b = templateVersion.parse(req.body);
    res.json(
      await transaction(async (c) => {
        await locked(c, key, b.expectedEditVersion);
        const row = (
          await c.query(
            `UPDATE agreement_template SET status='archived',active=false,edit_version=edit_version+1,updated_at=now() WHERE id=$1 RETURNING ${columns}`,
            [key],
          )
        ).rows[0];
        await audit(c, a.id, "archived", key);
        return row;
      }),
    );
  },
);
agreementTemplateApi.post(
  "/agreement-templates/:id/duplicate",
  async (req, res) => {
    const a = await actor(req);
    requireCapability(a, manager);
    const key = id.parse(req.params.id),
      b = z
        .object({
          name: z.string().trim().min(1).max(200),
          expectedEditVersion: z.number().int().positive(),
        })
        .strict()
        .parse(req.body);
    res.status(201).json(
      await transaction(async (c) => {
        const old = await locked(c, key, b.expectedEditVersion);
        return insert(c, a.id, { ...old, name: b.name }, { sourceId: key });
      }),
    );
  },
);
agreementTemplateApi.post(
  "/agreement-templates/:id/revise",
  async (req, res) => {
    const a = await actor(req);
    requireCapability(a, manager);
    const key = id.parse(req.params.id);
    const legacy = req.body?.expectedEditVersion === undefined;
    const b = legacy
      ? z
          .object({ body: z.string().trim().min(1).max(50000) })
          .strict()
          .parse(req.body)
      : templateVersion.parse(req.body);
    res.status(201).json(
      await transaction(async (c) => {
        const old = await locked(
          c,
          key,
          "expectedEditVersion" in b ? b.expectedEditVersion : undefined,
        );
        if (old.status !== "published")
          throw new HttpError(409, "Revise the currently published version");
        if (legacy && old.kind !== "msa")
          throw new HttpError(
            400,
            "Typed templates require a version-checked revision",
          );
        if (
          (
            await c.query(
              "SELECT 1 FROM agreement_template WHERE family_id=$1 AND status='draft'",
              [old.family_id],
            )
          ).rowCount
        )
          throw new HttpError(
            409,
            "This template already has a draft revision",
          );
        const version =
          Number(
            (
              await c.query(
                "SELECT max(version) AS version FROM agreement_template WHERE family_id=$1",
                [old.family_id],
              )
            ).rows[0].version,
          ) + 1;
        if (legacy)
          await c.query(
            "UPDATE agreement_template SET status='archived',active=false,edit_version=edit_version+1,updated_at=now() WHERE id=$1",
            [key],
          );
        const row = await insert(
          c,
          a.id,
          { ...old, body: "body" in b ? b.body : old.body },
          {
            familyId: old.family_id,
            version,
            sourceId: key,
            status: legacy ? "published" : "draft",
          },
        );
        await audit(c, a.id, "revised", key, { newVersionId: row.id });
        return row;
      }),
    );
  },
);
