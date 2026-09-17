import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { requireCapability } from "./policy";
import { listLeadNotes, createLeadNote } from "./lead-notes.service";
export const leadNotesApi = Router();
leadNotesApi.get("/leads/:id/notes", async (req, res) => {
  const user = await actor(req);
  requireCapability(user, "revenue.sales");
  res.setHeader("Cache-Control", "private, no-store");
  res.json(
    await listLeadNotes(z.string().uuid().parse(req.params.id), req.query),
  );
});
leadNotesApi.post("/leads/:id/notes", async (req, res) => {
  const user = await actor(req);
  requireCapability(user, "revenue.sales");
  res.setHeader("Cache-Control", "private, no-store");
  const result = await createLeadNote(
    z.string().uuid().parse(req.params.id),
    user.id,
    req.body,
  );
  res.status(result.replayed ? 200 : 201).json(result);
});
