import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authenticateToken, requireRole } from "../middleware/auth";
import { docVersion } from "../storage/docs.storage";
import { asyncHandler } from "../middleware/error-handler";
import { loadSystemDocDefinitions } from "../services/system-docs.service";
const router = Router();
import { documentVersionSchema as version, documentIdentifierSchema as identifier, documentFieldsSchema as fields } from "@shared/document-contract";
router.use(authenticateToken);
router.use(requireRole("admin"));
router.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
router.use((req, _res, next) => {
  try { z.object({}).strict().parse(req.query); next(); } catch(error) { next(error); }
});
router.get("/", asyncHandler(async (_req, res) => res.json(await storage.docs.getVersionedDocs())));
router.post("/", asyncHandler(async (req, res) => {
  const data = fields.parse(req.body);
  res.status(201).json(await storage.docs.createVersionedDoc(data, {userId:req.user!.id,action:"website_doc_created",details:data.slug}));
}));
router.post("/sync", asyncHandler(async (req, res) => {
  const body = z.object({expectedVersion:version}).strict().parse(req.body);
  const definitions = await loadSystemDocDefinitions();
  res.json(await storage.docs.synchronizeVersionedDocs(definitions, body.expectedVersion,
    {userId:req.user!.id,action:"website_docs_synchronized",details:"Repository documentation refresh"}));
}));
router.put("/:id", asyncHandler(async (req, res) => {
  const id = identifier.parse(req.params.id);
  const body = z.object({document:fields,expectedVersion:version}).strict().parse(req.body);
  res.json(await storage.docs.saveVersionedDoc(id, body.document, body.expectedVersion,
    {userId:req.user!.id,action:"website_doc_updated",details:id}));
}));
router.delete("/:id", asyncHandler(async (req, res) => {
  const id = identifier.parse(req.params.id);
  const body = z.object({expectedVersion:version}).strict().parse(req.body);
  await storage.docs.deleteVersionedDoc(id, body.expectedVersion,
    {userId:req.user!.id,action:"website_doc_deleted",details:id});
  res.json({deleted:true});
}));
router.get("/:slug", asyncHandler(async (req, res) => {
  const slug = z.string().max(160).parse(req.params.slug);
  const doc = await storage.docs.getDocBySlug(slug);
  if (!doc) { res.status(404).json({ message: "Document not found" }); return; }
  res.json({ ...doc, version: docVersion(doc) });
}));
export default router;
