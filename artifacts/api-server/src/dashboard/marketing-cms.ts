import { randomUUID } from "node:crypto";
import { Router } from "express";
import { actor, identity } from "./access";
import { pool } from "./database";
import { HttpError, requireCapability } from "./policy";
import { marketingConnection } from "./marketing-reporting.transport";
import {
  cmsOperations,
  cmsDestination,
  callCms,
} from "./marketing-cms.transport";

export const marketingCmsApi = Router();
for (const operation of cmsOperations) {
  const method = operation.method.toLowerCase() as
    | "get"
    | "post"
    | "put"
    | "delete";
  marketingCmsApi[method](
    `/marketing/cms${operation.path}`,
    async (req, res) => {
      const a = await actor(req);
      if (operation.ownerOnly && a.role !== "owner")
        throw new HttpError(403, "Owner access required");
      for (const capability of operation.capabilities)
        requireCapability(a, capability);
      cmsDestination(operation, req.params, req.query);
      const connection = marketingConnection();
      const session = await identity(req);
      if (session.user.id !== a.id) throw new HttpError(401, "Sign in again");
      res.set("Cache-Control", "private, no-store");
      const grantId = randomUUID();
      try {
        await pool.query(
          "INSERT INTO core_federation_grant(id,canonical_user_id,canonical_session_id,owner_attested,expires_at) VALUES($1,$2,$3,$4,now()+interval '60 seconds')",
          [grantId, a.id, session.session.id, a.role === "owner"],
        );
        const result = await callCms(
          connection,
          operation,
          req.params,
          req.query,
          req.body,
          grantId,
        );
        res.status(result.status).json(result.body);
      } finally {
        await pool.query("DELETE FROM core_federation_grant WHERE id=$1", [
          grantId,
        ]);
      }
    },
  );
}
