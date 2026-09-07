import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { requireRole } from "./policy";
import {
  readAvailability,
  saveAvailability,
  generateAvailability,
  addBlackout,
  removeBlackout,
} from "./assessments";
export const assessmentApi = Router();
assessmentApi.use("/assessment-availability", async (req, _res, next) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch"]);
  next();
});
assessmentApi.get("/assessment-availability", async (_req, res) =>
  res.json(await readAvailability()),
);
assessmentApi.post("/assessment-availability", async (req, res) => {
  const a = await actor(req);
  res.json(await saveAvailability(a.id, req.body));
});
assessmentApi.post("/assessment-availability/generate", async (req, res) => {
  const a = await actor(req);
  const b = z
    .object({ from: z.string().date(), through: z.string().date() })
    .parse(req.body);
  res.json(await generateAvailability(a.id, b.from, b.through));
});
assessmentApi.post("/assessment-availability/blackouts", async (req, res) => {
  const a = await actor(req);
  const b = z
    .object({
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
      reason: z.string().trim().min(1).max(500),
    })
    .parse(req.body);
  res.status(201).json(await addBlackout(a.id, b.startsAt, b.endsAt, b.reason));
});
assessmentApi.post(
  "/assessment-availability/blackouts/:id/archive",
  async (req, res) => {
    const a = await actor(req);
    await removeBlackout(a.id, z.string().uuid().parse(req.params.id));
    res.json({ ok: true });
  },
);
