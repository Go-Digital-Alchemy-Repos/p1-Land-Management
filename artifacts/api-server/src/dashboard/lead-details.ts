import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { requireCapability } from "./policy";
import {
  getLeadDetails,
  updateLeadDetails,
  getLeadDetailHistory,
} from "./lead-details.service";
export const leadDetailsApi = Router();
leadDetailsApi.use("/leads/:id/details", async (req, res, next) => {
  const user = await actor(req);
  requireCapability(user, "revenue.sales");
  res.locals.detailActor = user.id;
  res.setHeader("Cache-Control", "private, no-store");
  next();
});
leadDetailsApi.get("/leads/:id/details", async (req, res) =>
  res.json(await getLeadDetails(z.string().uuid().parse(req.params.id))),
);
leadDetailsApi.patch("/leads/:id/details", async (req, res) =>
  res.json(
    await updateLeadDetails(
      z.string().uuid().parse(req.params.id),
      res.locals.detailActor,
      req.body,
    ),
  ),
);
leadDetailsApi.get("/leads/:id/details/history", async (req, res) =>
  res.json(
    await getLeadDetailHistory(
      z.string().uuid().parse(req.params.id),
      req.query,
    ),
  ),
);
