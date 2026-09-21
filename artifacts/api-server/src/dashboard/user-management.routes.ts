import { listManagedInvitationPage } from "./user-management.invitations";
import { listManagedAccountHistory } from "./user-management.history";
import {
  ownerNotificationsInput,
  accountUpdateInput,
  invitationInput,
} from "./user-management.contract";
import {
  loadManagedNotificationForms,
  validateAddedFormSubscriptions,
} from "./form-notification-selection";
import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { HttpError, requireRole } from "./policy";
import { pool } from "./database";
import {
  updateOwnerNotifications,
  requestManagedPasswordRecovery,
  changeInvitation,
  inviteManagedAccount,
  listManagedAccounts,
  revokeManagedSessions,
  updateManagedAccount,
  retireManagedAccount,
  recoverRetiredManagedAccount,
  reactivateRecoveredOwnerAccount,
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
  const input = accountUpdateInput.parse(req.body);
  const current = (
    await pool.query(
      "SELECT a.form_notification_ids FROM staff_profile p LEFT JOIN business_account_access a ON a.user_id=p.user_id WHERE p.user_id=$1",
      [z.string().min(1).parse(req.params.id)],
    )
  ).rows[0];
  if (!current) throw new HttpError(404, "Account not found");
  await validateAddedFormSubscriptions(
    current.form_notification_ids || [],
    input.formNotificationIds,
    input.capabilities,
    () => loadManagedNotificationForms(req),
  );
  res.json(
    await updateManagedAccount(
      (await actor(req)).id,
      z.string().min(1).parse(req.params.id),
      req.body,
    ),
  );
});
userManagementApi.post(
  "/user-management/users/:id/retire",
  async (req, res) => res.json(await retireManagedAccount((await actor(req)).id, z.string().min(1).parse(req.params.id))),
);
userManagementApi.post(
  "/user-management/users/:id/retire/recover",
  async (req, res) => res.json(await recoverRetiredManagedAccount((await actor(req)).id, z.string().min(1).parse(req.params.id))),
);
userManagementApi.post(
  "/user-management/users/:id/retire/recover/reactivate-owner",
  async (req, res) => res.json(await reactivateRecoveredOwnerAccount((await actor(req)).id, z.string().min(1).parse(req.params.id))),
);
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
userManagementApi.get("/user-management/invitations", async (req, res) => {
  res.json(await listManagedInvitationPage(req.query));
});
userManagementApi.post("/user-management/invitations", async (req, res) => {
  const input = invitationInput.parse(req.body);
  await validateAddedFormSubscriptions(
    [],
    input.formNotificationIds,
    input.capabilities,
    () => loadManagedNotificationForms(req),
  );
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
    res.json(
      await listManagedAccountHistory(
        z.string().min(1).parse(req.params.id),
        req.query,
      ),
    );
  },
);

userManagementApi.post(
  "/user-management/users/:id/password-recovery",
  async (req, res) => {
    res.json(
      await requestManagedPasswordRecovery(
        (await actor(req)).id,
        z.string().min(1).parse(req.params.id),
      ),
    );
  },
);

userManagementApi.patch(
  "/user-management/users/:id/owner-notifications",
  async (req, res) => {
    const input = ownerNotificationsInput.parse(req.body);
    const id = z.string().min(1).parse(req.params.id);
    const current = (
      await pool.query(
        "SELECT p.role,a.form_notification_ids FROM staff_profile p LEFT JOIN business_account_access a ON a.user_id=p.user_id WHERE p.user_id=$1",
        [id],
      )
    ).rows[0];
    if (!current) throw new HttpError(404, "Account not found");
    if (current.role !== "owner")
      throw new HttpError(409, "Use the team account editor for this account");
    await validateAddedFormSubscriptions(
      current.form_notification_ids || [],
      input.formNotificationIds,
      ["marketing.content.forms"],
      () => loadManagedNotificationForms(req),
    );
    res.json(await updateOwnerNotifications((await actor(req)).id, id, input));
  },
);
