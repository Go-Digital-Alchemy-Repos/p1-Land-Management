import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { updateWorkReadiness } from "./work-readiness.service";
export const workReadinessApi = Router();
workReadinessApi.post("/work-orders/:id/readiness", async (req, res) => {
  res.json(
    await updateWorkReadiness(
      await actor(req),
      z.string().uuid().parse(req.params.id),
      req.body,
    ),
  );
});
