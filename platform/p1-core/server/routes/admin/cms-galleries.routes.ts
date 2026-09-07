import { requireAdminPermission as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { z } from "zod";
import {
  CMS_GALLERY_LAYOUTS,
  CMS_GALLERY_STATUSES,
  cmsGallerySettingsSchema,
  insertCmsGallerySchema,
} from "@shared/schema";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";

const router = Router();

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-/]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const galleryItemSchema = z.object({
  id: z.string().optional(),
  mediaId: z.string().optional().nullable(),
  imageUrl: z.string().min(1, "Image is required"),
  alt: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  ctaText: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const galleryMutationSchema = insertCmsGallerySchema
  .pick({
    title: true,
    slug: true,
    description: true,
    status: true,
    layout: true,
    settings: true,
  })
  .extend({
    title: z.string().trim().min(1, "Title is required"),
    slug: z.string().trim().min(1, "Slug is required"),
    status: z.enum(CMS_GALLERY_STATUSES).default("draft"),
    layout: z.enum(CMS_GALLERY_LAYOUTS).default("grid"),
    settings: cmsGallerySettingsSchema.partial().default({}),
    items: z.array(galleryItemSchema).default([]),
  });

router.get(
  "/galleries", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const galleries = await storage.cmsGalleries.getAll({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      sort:
        req.query.sort === "created" || req.query.sort === "title" || req.query.sort === "updated"
          ? req.query.sort
          : undefined,
    });
    res.json(galleries);
  }),
);

router.post(
  "/galleries", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const data = galleryMutationSchema.parse(req.body);
    if (data.status === "published" && data.items.length === 0) {
      return res.status(400).json({ message: "Add at least one image before publishing" });
    }
    const slug = normalizeSlug(data.slug);
    const existing = await storage.cmsGalleries.getBySlug(slug);
    if (existing) {
      return res.status(409).json({ message: "A gallery with this slug already exists" });
    }

    const adminId = req.user!.id;
    const gallery = await storage.cmsGalleries.create(
      {
        title: data.title,
        slug,
        description: data.description ?? null,
        status: data.status,
        layout: data.layout,
        settings: cmsGallerySettingsSchema.parse(data.settings),
        createdBy: adminId,
        updatedBy: adminId,
        publishedAt: data.status === "published" ? new Date() : null,
      },
      data.items.map((item, index) => ({
        galleryId: "",
        mediaId: item.mediaId ?? null,
        imageUrl: item.imageUrl,
        alt: item.alt ?? null,
        title: item.title ?? null,
        caption: item.caption ?? null,
        linkUrl: item.linkUrl ?? null,
        ctaText: item.ctaText ?? null,
        tags: item.tags ?? null,
        sortOrder: item.sortOrder ?? index,
      })),
    );
    res.status(201).json(gallery);
  }),
);

router.get(
  "/galleries/:id", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const gallery = await storage.cmsGalleries.getByIdOrSlug(paramString(req.params.id));
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });
    res.json(gallery);
  }),
);

router.put(
  "/galleries/:id", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const existingGallery = await storage.cmsGalleries.getByIdOrSlug(id);
    if (!existingGallery) return res.status(404).json({ message: "Gallery not found" });

    const data = galleryMutationSchema.parse(req.body);
    if (data.status === "published" && data.items.length === 0) {
      return res.status(400).json({ message: "Add at least one image before publishing" });
    }
    const slug = normalizeSlug(data.slug);
    const existingSlug = await storage.cmsGalleries.getBySlug(slug);
    if (existingSlug && existingSlug.id !== existingGallery.id) {
      return res.status(409).json({ message: "A gallery with this slug already exists" });
    }

    const updated = await storage.cmsGalleries.update(
      existingGallery.id,
      {
        title: data.title,
        slug,
        description: data.description ?? null,
        status: data.status,
        layout: data.layout,
        settings: cmsGallerySettingsSchema.parse(data.settings),
        updatedBy: req.user!.id,
        publishedAt:
          data.status === "published"
            ? (existingGallery.publishedAt ?? new Date())
            : existingGallery.publishedAt,
      },
      data.items.map((item, index) => ({
        galleryId: existingGallery.id,
        mediaId: item.mediaId ?? null,
        imageUrl: item.imageUrl,
        alt: item.alt ?? null,
        title: item.title ?? null,
        caption: item.caption ?? null,
        linkUrl: item.linkUrl ?? null,
        ctaText: item.ctaText ?? null,
        tags: item.tags ?? null,
        sortOrder: item.sortOrder ?? index,
      })),
    );

    res.json(updated);
  }),
);

router.delete(
  "/galleries/:id", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const gallery = await storage.cmsGalleries.getByIdOrSlug(paramString(req.params.id));
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });
    await storage.cmsGalleries.delete(gallery.id);
    res.json({ success: true });
  }),
);

router.post(
  "/galleries/:id/duplicate", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const gallery = await storage.cmsGalleries.getByIdOrSlug(paramString(req.params.id));
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });
    const duplicate = await storage.cmsGalleries.duplicate(gallery.id, req.user!.id);
    res.status(201).json(duplicate);
  }),
);

router.post(
  "/galleries/:id/publish", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const gallery = await storage.cmsGalleries.getByIdOrSlug(paramString(req.params.id));
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });
    if (gallery.items.length === 0) {
      return res.status(400).json({ message: "Add at least one image before publishing" });
    }
    res.json(await storage.cmsGalleries.publish(gallery.id, req.user!.id));
  }),
);

router.post(
  "/galleries/:id/unpublish", p1Authorize("content"),
  asyncHandler(async (req, res) => {
    const gallery = await storage.cmsGalleries.getByIdOrSlug(paramString(req.params.id));
    if (!gallery) return res.status(404).json({ message: "Gallery not found" });
    res.json(await storage.cmsGalleries.unpublish(gallery.id, req.user!.id));
  }),
);

export default router;
