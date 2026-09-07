import { Router } from "express";
import { z } from "zod";
import { actor } from "./access";
import { requireRole } from "./policy";
import { listContacts, saveContact } from "./contacts";
export const contactsApi = Router();
const id = z.string().uuid();
const input = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254).nullable().default(null),
  phone: z.string().trim().max(50).nullable().default(null),
  position: z.string().trim().max(200).nullable().default(null),
  kind: z.enum(["primary", "billing", "site", "other"]),
});
contactsApi.use("/clients/:clientId/contacts", async (req, _res, next) => {
  const a = await actor(req);
  requireRole(a.role, ["owner", "manager", "dispatch", "sales", "finance"]);
  next();
});
contactsApi.get("/clients/:clientId/contacts", async (req, res) =>
  res.json(await listContacts(id.parse(req.params.clientId))),
);
contactsApi.post("/clients/:clientId/contacts", async (req, res) => {
  const a = await actor(req);
  res
    .status(201)
    .json(
      await saveContact(
        a.id,
        id.parse(req.params.clientId),
        input.parse(req.body),
      ),
    );
});
contactsApi.post("/clients/:clientId/contacts/:id", async (req, res) => {
  const a = await actor(req);
  const b = input
    .extend({
      version: z.number().int().positive(),
      archived: z.boolean().default(false),
    })
    .parse(req.body);
  res.json(
    await saveContact(a.id, id.parse(req.params.clientId), b, {
      id: id.parse(req.params.id),
      version: b.version,
      archived: b.archived,
    }),
  );
});
