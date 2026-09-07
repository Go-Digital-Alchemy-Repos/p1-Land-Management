import { Router, type Response } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { ClientSiteContentConflictError } from "../../storage/client-site-content.storage";
import { logger } from "../../utils/logger";
import {
  contentIdentity,
  loadConfiguredClientSiteManifest,
  parseComponentContent,
  serializeAdminContent,
} from "../../services/client-site-content.service";

const router = Router();
const revisionBody = z.object({ expectedRevision: z.number().int().nonnegative() }).strict();
const draftBody = revisionBody.extend({ content: z.unknown() });

function params(req: { params: Record<string, string | string[]> }) {
  const routeId = String(req.params.routeId);
  const componentKey = String(req.params.componentKey);
  return { routeId, componentKey };
}

function handleError(res: Response, error: unknown): Response {
  if (error instanceof ClientSiteContentConflictError) {
    return res.status(409).json({ error: error.message });
  }
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.issues[0]?.message || "Validation failed" });
  }
  if (error instanceof Error && error.message.startsWith("Client site")) {
    return res.status(404).json({ error: error.message });
  }
  logger.cms.error("Client site content request failed", error);
  return res.status(500).json({ error: "Client site content request failed" });
}

router.get("/", async (_req, res) => {
  try {
    const manifest = await loadConfiguredClientSiteManifest();
    res.json(
      manifest.routes.flatMap((route) =>
        manifest.puck.editableComponents
          .filter(
            (component) =>
              (component.key !== "site-chrome" || route.id === "home") &&
              route.editableRegions.some((region) => component.allowedRegions.includes(region)),
          )
          .map((component) => ({
            routeId: route.id,
            path: route.path,
            componentKey: component.key,
            label:
              component.key === "site-chrome"
                ? "Shared navigation and business details"
                : route.path,
          })),
      ),
    );
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/:routeId/:componentKey", async (req, res) => {
  try {
    const { routeId, componentKey } = params(req);
    const manifest = await loadConfiguredClientSiteManifest();
    const record = await storage.clientSiteContent.get(
      contentIdentity(manifest, routeId, componentKey),
    );
    res.json(serializeAdminContent(manifest, routeId, componentKey, record));
  } catch (error) {
    handleError(res, error);
  }
});

router.put("/:routeId/:componentKey/draft", async (req, res) => {
  try {
    const body = draftBody.parse(req.body);
    const { routeId, componentKey } = params(req);
    const manifest = await loadConfiguredClientSiteManifest();
    const content = parseComponentContent(manifest, routeId, componentKey, body.content);
    const record = await storage.clientSiteContent.saveDraft(
      contentIdentity(manifest, routeId, componentKey),
      content,
      body.expectedRevision,
      req.user!.id,
    );
    res.json(serializeAdminContent(manifest, routeId, componentKey, record));
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/:routeId/:componentKey/publish", async (req, res) => {
  try {
    const body = revisionBody.parse(req.body);
    const { routeId, componentKey } = params(req);
    const manifest = await loadConfiguredClientSiteManifest();
    const identity = contentIdentity(manifest, routeId, componentKey);
    const existing = await storage.clientSiteContent.get(identity);
    if (!existing) return res.status(409).json({ error: "Save the draft before publishing" });
    parseComponentContent(manifest, routeId, componentKey, existing.draftContent);
    const record = await storage.clientSiteContent.publish(
      identity,
      body.expectedRevision,
      req.user!.id,
    );
    res.json(serializeAdminContent(manifest, routeId, componentKey, record));
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/:routeId/:componentKey/revisions", async (req, res) => {
  try {
    const { routeId, componentKey } = params(req);
    const manifest = await loadConfiguredClientSiteManifest();
    const record = await storage.clientSiteContent.get(
      contentIdentity(manifest, routeId, componentKey),
    );
    res.json(record ? await storage.clientSiteContent.listRevisions(record.id) : []);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/:routeId/:componentKey/revisions/:revision/restore", async (req, res) => {
  try {
    const body = revisionBody.parse(req.body);
    const revision = z.coerce.number().int().positive().parse(req.params.revision);
    const { routeId, componentKey } = params(req);
    const manifest = await loadConfiguredClientSiteManifest();
    const identity = contentIdentity(manifest, routeId, componentKey);
    const existing = await storage.clientSiteContent.get(identity);
    if (!existing) return res.status(404).json({ error: "Client site content not found" });
    const historical = await storage.clientSiteContent.getRevision(existing.id, revision);
    if (!historical) return res.status(404).json({ error: "Revision not found" });
    const content = parseComponentContent(manifest, routeId, componentKey, historical.content);
    const record = await storage.clientSiteContent.saveDraft(
      identity,
      content,
      body.expectedRevision,
      req.user!.id,
      "restore",
    );
    res.json(serializeAdminContent(manifest, routeId, componentKey, record));
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
