import { Router } from "express";
import { actor } from "./access";
import {
  readProspectContext,
  saveProspectContext,
  reviewProspectContact,
  searchProspectContext,
} from "./prospect-context.service";
export const prospectContextApi = Router();
prospectContextApi.get("/commercial-context/search", async (req, res) =>
  res.json(await searchProspectContext(await actor(req), req.query)),
);
prospectContextApi.get("/commercial-inquiries/:id/context", async (req, res) =>
  res.json(await readProspectContext(await actor(req), String(req.params.id))),
);
prospectContextApi.post("/commercial-inquiries/:id/context", async (req, res) =>
  res.json(
    await saveProspectContext(
      await actor(req),
      String(req.params.id),
      req.body,
    ),
  ),
);
prospectContextApi.patch(
  "/commercial-inquiries/:id/contact-review",
  async (req, res) =>
    res.json(
      await reviewProspectContact(
        await actor(req),
        String(req.params.id),
        req.body,
      ),
    ),
);
