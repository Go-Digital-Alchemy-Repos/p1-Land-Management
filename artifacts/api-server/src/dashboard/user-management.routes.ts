import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { requireRole } from "./policy";
import { pool } from "./database";
import {
  changeInvitation,
  inviteManagedAccount,
  listManagedAccounts,
  revokeManagedSessions,
  updateManagedAccount,
} from "./user-management.service";

export const userManagementApi = Router();
userManagementApi.use("/user-management", async (req, _res, next) => {
  requireRole((await actor(req)).role, ["owner"]);
  next();
});
userManagementApi.get("/user-management/users", async (_req, res) =>
  res.json({ items: await listManagedAccounts() }),
);
userManagementApi.patch("/user-management/users/:id", async (req, res) => {
  res.json(
    await updateManagedAccount(
      (await actor(req)).id,
      z.string().min(1).parse(req.params.id),
      req.body,
    ),
  );
});
userManagementApi.post(
  "/user-management/users/:id/revoke-sessions",
  async (req, res) => {
    res.json(
      await revokeManagedSessions(
        (await actor(req)).id,
        z.string().min(1).parse(req.params.id),
      ),
    );
  },
);
userManagementApi.get("/user-management/invitations", async (_req, res) => {
  res.json({
    items: (
      await pool.query(`SELECT id,email,role,first_name AS "firstName",last_name AS "lastName",capabilities,
    expires_at AS "expiresAt",accepted_at AS "acceptedAt",revoked_at AS "revokedAt",created_at AS "createdAt"
    FROM invitation ORDER BY created_at DESC,id DESC LIMIT 200`)
    ).rows,
  });
});
userManagementApi.post("/user-management/invitations", async (req, res) => {
  res
    .status(201)
    .json(await inviteManagedAccount((await actor(req)).id, req.body));
});
for (const action of ["resend", "revoke"] as const) {
  userManagementApi.post(
    `/user-management/invitations/:id/${action}`,
    async (req, res) => {
      res.json(
        await changeInvitation(
          (await actor(req)).id,
          z.string().uuid().parse(req.params.id),
          action,
        ),
      );
    },
  );
}
userManagementApi.get(
  "/user-management/users/:id/history",
  async (req, res) => {
    res.json({
      items: (
        await pool.query(
          'SELECT id,user_id AS "actorId",action,details,created_at AS "createdAt" FROM audit_event WHERE entity_id=$1 AND action LIKE \'account.%\' ORDER BY created_at DESC,id DESC LIMIT 100',
          [z.string().min(1).parse(req.params.id)],
        )
      ).rows,
    });
  },
);
