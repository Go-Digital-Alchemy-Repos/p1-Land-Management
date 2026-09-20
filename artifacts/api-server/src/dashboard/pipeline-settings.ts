import { Router } from "express";
import { actor } from "./access";
import { requireCapability, requireRole } from "./policy";
import {
  getPipelineSettings,
  savePipelineSettings,
} from "./pipeline-settings.service";
export const pipelineSettingsApi = Router();
pipelineSettingsApi.get("/sales/pipeline-settings", async (req, res) => {
  const user = await actor(req);
  requireCapability(user, "revenue.sales");
  res.setHeader("Cache-Control", "private, no-store");
  res.json(await getPipelineSettings());
});
pipelineSettingsApi.put("/sales/pipeline-settings", async (req, res) => {
  const user = await actor(req);
  requireRole(user.role, ["owner"]);
  res.setHeader("Cache-Control", "private, no-store");
  res.json(await savePipelineSettings(user.id, req.body));
});
