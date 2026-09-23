import { Router } from "express";

/** Preserve the provider router without exposing it while integration is dormant. */
export const dormantQuickBooksApi = Router();
for (const [method, path] of [
  ["post", "/quickbooks/connect"],
  ["get", "/quickbooks/callback"],
  ["post", "/quickbooks/import-preview"],
  ["post", "/quickbooks/import"],
  ["get", "/quickbooks/invoices"],
  ["post", "/billing/:id/post"],
] as const) {
  dormantQuickBooksApi[method](path, (_req, res) => {
    res.status(404).json({ error: "feature_disabled" });
  });
}

export const dormantQuickBooksWebhook = Router();
dormantQuickBooksWebhook.post("/quickbooks", (_req, res) => {
  res.sendStatus(204);
});
