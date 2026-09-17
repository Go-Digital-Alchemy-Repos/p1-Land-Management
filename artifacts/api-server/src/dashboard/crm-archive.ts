import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { requireCapability } from "./policy";
import { getCrmArchive, listCrmArchive } from "./crm-archive.service";
export const crmArchiveApi = Router();
for (const kind of ["lead", "client"] as const) {
  for (const detail of [false, true]) {
    crmArchiveApi.get(
      `/${kind}s/:id/crm-archive${detail ? "/record" : ""}`,
      async (req, res) => {
        const user = await actor(req);
        requireCapability(
          user,
          kind === "lead" ? "revenue.sales" : "customers.clients",
        );
        res.setHeader("Cache-Control", "private, no-store");
        const id = z.string().uuid().parse(req.params.id);
        res.json(
          await (detail ? getCrmArchive : listCrmArchive)(kind, id, req.query),
        );
      },
    );
  }
}
