import { requireAdminPermission as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { teamMemberInputSchema } from "@shared/team";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";

const router = Router();
router.get(
  "/team", p1Authorize("content"),
  asyncHandler(async (_req, res) => {
    res.json(await storage.team.list());
  }),
);
router.post(
  "/team", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const member = await storage.team.create(teamMemberInputSchema.parse(req.body), req.user!.id);
    await storage.activity.log(req.user!.id, "team_member_created", member.id);
    res.status(201).json(member);
  }),
);
router.put(
  "/team/:id", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const member = await storage.team.update(
      paramString(req.params.id),
      teamMemberInputSchema.parse(req.body),
      req.user!.id,
    );
    if (!member) return res.status(404).json({ message: "Team member not found" });
    await storage.activity.log(req.user!.id, "team_member_updated", member.id);
    res.json(member);
  }),
);
export default router;
