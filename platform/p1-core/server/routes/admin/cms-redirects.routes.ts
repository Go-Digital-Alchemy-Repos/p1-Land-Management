import { requireAdminPermission as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { storage } from "../../storage/index";
import { insertRedirectSchema } from "../../../shared/schema/redirects";

const router = Router();

function hasPostgresCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

router.get("/redirects", p1Authorize("content"), async (_req, res) => {
  try {
    const all = await storage.redirects.getAll();
    res.json(all);
  } catch {
    res.status(500).json({ error: "Failed to fetch redirects" });
  }
});

router.post("/redirects", p1Authorize("content"), async (req, res) => {
  const parsed = insertRedirectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  }
  try {
    const created = await storage.redirects.create(parsed.data);
    res.status(201).json(created);
  } catch (err) {
    if (hasPostgresCode(err, "23505")) {
      return res.status(409).json({ error: "A redirect for this path already exists" });
    }
    res.status(500).json({ error: "Failed to create redirect" });
  }
});

router.put("/redirects/:id", p1Authorize("content"), async (req, res) => {
  const parsed = insertRedirectSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
  }
  try {
    const updated = await storage.redirects.update(String(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ error: "Redirect not found" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update redirect" });
  }
});

router.delete("/redirects/:id", p1Authorize("content"), async (req, res) => {
  try {
    const deleted = await storage.redirects.delete(String(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Redirect not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete redirect" });
  }
});

export default router;
