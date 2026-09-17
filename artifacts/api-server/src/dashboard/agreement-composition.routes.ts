import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { pool } from "./database";
import { HttpError, requireCapability, requireAnyCapability } from "./policy";
import {
  changeCompositionContext,
  createComposition,
  editComposition,
  readComposition,
  replaceCompositionTemplates,
} from "./agreement-composition.service";
import { prepareReusableTemplate } from "./agreement-template-export";
import { reviewCompositionPricing } from "./agreement-pricing.service";
export const agreementCompositionApi = Router();
agreementCompositionApi.get("/agreement-drafts", async (req, res) => {
  requireAnyCapability(await actor(req), [
    "revenue.sales",
    "revenue.agreements",
  ]);
  const filters = z
    .object({
      clientId: z.string().uuid().optional(),
      leadId: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      cursor: z
        .string()
        .regex(/^[A-Za-z0-9_-]+$/)
        .max(512)
        .optional(),
    })
    .strict()
    .parse(req.query);
  let cursor: { at: string; id: string } | undefined;
  if (filters.cursor) {
    try {
      cursor = z
        .object({ at: z.string().datetime(), id: z.string().uuid() })
        .strict()
        .parse(JSON.parse(Buffer.from(filters.cursor, "base64url").toString()));
    } catch {
      throw new HttpError(400, "Invalid draft cursor");
    }
  }
  const rows = (
    await pool.query(
      `SELECT id,title,client_id,property_id,lead_id,status,version,created_at,updated_at,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at FROM agreement_composition_draft WHERE ($1::uuid IS NULL OR client_id=$1) AND ($2::uuid IS NULL OR lead_id=$2) AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::uuid)) ORDER BY created_at DESC,id DESC LIMIT $5`,
      [
        filters.clientId || null,
        filters.leadId || null,
        cursor?.at || null,
        cursor?.id || null,
        filters.limit + 1,
      ],
    )
  ).rows;
  const page = rows.slice(0, filters.limit),
    last = page.at(-1);
  res.json({
    items: page.map(({ cursor_at, ...row }) => row),
    nextCursor:
      rows.length > filters.limit && last
        ? Buffer.from(
            JSON.stringify({ at: last.cursor_at, id: last.id }),
          ).toString("base64url")
        : null,
  });
});
agreementCompositionApi.get("/agreement-drafts/:id", async (req, res) => {
  requireAnyCapability(await actor(req), [
    "revenue.sales",
    "revenue.agreements",
  ]);
  res.json(await readComposition(z.string().uuid().parse(req.params.id)));
});
agreementCompositionApi.post("/agreement-drafts", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "revenue.sales");
  res.status(201).json(await createComposition(a.id, req.body));
});
agreementCompositionApi.put("/agreement-drafts/:id", async (req, res) => {
  const a = await actor(req);
  requireCapability(a, "revenue.sales");
  res.json(
    await editComposition(
      a.id,
      z.string().uuid().parse(req.params.id),
      req.body,
    ),
  );
});

agreementCompositionApi.post(
  "/agreement-drafts/:id/context",
  async (req, res) => {
    const a = await actor(req);
    requireCapability(a, "revenue.sales");
    const b = z
      .object({
        expectedVersion: z.number().int().positive(),
        context: z.unknown(),
      })
      .strict()
      .parse(req.body);
    res.json(
      await changeCompositionContext(
        a.id,
        z.string().uuid().parse(req.params.id),
        b.expectedVersion,
        b.context,
      ),
    );
  },
);

for (const action of ["review", "apply"] as const) {
  agreementCompositionApi.post(
    `/agreement-drafts/:id/templates/${action}`,
    async (req, res) => {
      const a = await actor(req);
      requireCapability(a, "revenue.sales");
      res.json(
        await replaceCompositionTemplates(
          a.id,
          z.string().uuid().parse(req.params.id),
          req.body,
          action === "apply",
        ),
      );
    },
  );
}

agreementCompositionApi.post(
  "/agreement-drafts/:id/template-export",
  async (req, res) => {
    const a = await actor(req);
    requireCapability(a, "revenue.agreement-templates.manage");
    requireAnyCapability(a, ["revenue.sales", "revenue.agreements"]);
    res.json(
      await prepareReusableTemplate(
        z.string().uuid().parse(req.params.id),
        req.body,
      ),
    );
  },
);

agreementCompositionApi.post(
  "/agreement-drafts/:id/pricing/review",
  async (req, res) => {
    requireCapability(await actor(req), "revenue.sales");
    res.json(
      await reviewCompositionPricing(
        z.string().uuid().parse(req.params.id),
        req.body,
      ),
    );
  },
);
