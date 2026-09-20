import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { listFieldConflicts, resolveFieldConflict, fieldResolutionReceipts } from "./field-conflicts.service";
export const fieldConflictsApi = Router();
fieldConflictsApi.get("/field/conflicts", async (req,res) => {
  res.set("Cache-Control", "private, no-store").json(await listFieldConflicts(await actor(req)));
});
fieldConflictsApi.post("/field/conflicts/:id/resolve", async (req,res) => {
  res.set("Cache-Control", "private, no-store").json(await resolveFieldConflict(await actor(req),z.string().uuid().parse(req.params.id),req.body));
});

fieldConflictsApi.post("/field/resolutions", async (req,res) => {
  res.set("Cache-Control", "private, no-store").json(await fieldResolutionReceipts(await actor(req),req.body));
});
