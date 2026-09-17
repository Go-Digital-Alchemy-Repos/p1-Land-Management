import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { requireCapability } from "./policy";
import {
  followUpProjection,
  getLeadFollowUp,
  updateLeadFollowUp,
} from "./lead-follow-up.service";
export const leadFollowUpApi = Router();
leadFollowUpApi.get("/leads/:id/follow-up", async (req, res) => {
  const user = await actor(req);
  requireCapability(user, "revenue.sales");
  res.setHeader("Cache-Control", "private, no-store");
  res.json(await getLeadFollowUp(z.string().uuid().parse(req.params.id)));
});
leadFollowUpApi.patch("/leads/:id/follow-up", async (req, res) => {
  const user = await actor(req);
  requireCapability(user, "revenue.sales");
  res.setHeader("Cache-Control", "private, no-store");
  res.json(
    followUpProjection(
      await updateLeadFollowUp(
        z.string().uuid().parse(req.params.id),
        user.id,
        req.body,
      ),
    ),
  );
});
