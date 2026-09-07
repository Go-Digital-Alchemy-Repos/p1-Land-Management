import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { requireRole } from "./policy";
import { readSchedule, rescheduleWork, readScheduledWork } from "./schedule";
export const scheduleApi = Router();
scheduleApi.get("/schedule", async (req, res) => {
  res.json(await readSchedule(await actor(req), req.query));
});
scheduleApi.post("/work-orders/:id/reschedule", async (req, res) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  res.json(
    await rescheduleWork(
      a.id,
      z.string().uuid().parse(req.params.id),
      req.body,
    ),
  );
});

scheduleApi.get("/work-orders/:id", async (req, res) =>
  res.json(
    await readScheduledWork(
      await actor(req),
      z.string().uuid().parse(req.params.id),
    ),
  ),
);
