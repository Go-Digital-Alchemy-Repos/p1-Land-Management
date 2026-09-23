import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { actor } from "./access";
import { pool, transaction } from "./database";
import { requireCapability } from "./policy";
import { standardAgreementTemplates } from "./agreement-standard-templates";

const manager = "revenue.agreement-templates.manage" as const;
const columns =
  "id,name,version,body,active,created_at,updated_at,kind,status,description,payload,edit_version,family_id,source_template_id";

export const agreementStandardTemplateApi = Router();

agreementStandardTemplateApi.get("/agreement-template-sources", async (req, res) => {
  requireCapability(await actor(req), manager);
  const installed = new Set(
    (
      await pool.query(
        "SELECT source_slug FROM agreement_template WHERE source_slug IS NOT NULL",
      )
    ).rows.map((row) => row.source_slug as string),
  );
  res.json(
    standardAgreementTemplates.map(({ slug, name }) => ({ slug, name, installed: installed.has(slug) })),
  );
});

agreementStandardTemplateApi.post(
  "/agreement-template-sources/:slug/install",
  async (req, res) => {
    const a = await actor(req);
    requireCapability(a, manager);
    const source = standardAgreementTemplates.find(
      (candidate) => candidate.slug === z.string().parse(req.params.slug),
    );
    if (!source) {
      res.status(404).json({ error: "Standard template source not found" });
      return;
    }
    const row = await transaction(async (c) => {
      const existing = (
        await c.query(`SELECT ${columns} FROM agreement_template WHERE source_slug=$1 FOR UPDATE`, [source.slug])
      ).rows[0];
      if (existing) return existing;
      const id = randomUUID();
      const created = (
        await c.query(
          `INSERT INTO agreement_template(id,name,version,body,active,created_by,kind,status,description,payload,family_id,source_template_id,source_slug)
           VALUES($1,$2,1,$3,true,$4,'msa','published',$5,'{}'::jsonb,$1,NULL,$6)
           RETURNING ${columns}`,
          [id, source.name, source.body, a.id, "Owner-supplied standard agreement form", source.slug],
        )
      ).rows[0];
      await c.query(
        "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5)",
        [randomUUID(), a.id, "agreement-template.standard-installed", id, JSON.stringify({ sourceSlug: source.slug })],
      );
      return created;
    });
    res.status(201).json(row);
  },
);
