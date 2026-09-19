import { projectPublicWebsiteIdentity } from "../services/public-website-identity.service";
import multer from "multer";
import { BRANDING_OPTIONS, isImageMime } from "../services/image-optimizer";
import { createCmsMediaAssetFromUpload } from "../services/cms-media-upload.service";
import { resetEmailBrandingCache } from "../services/email.service";
import { Router } from "express";
import { z } from "zod";
import { WEBSITE_IDENTITY_FIELDS, validWebsiteIdentityValue } from "@shared/website-identity";
import { requireBusinessCapability } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
const router = Router();
const input = z
  .object({
    expectedVersion: z.string().regex(/^[a-f0-9]{64}$/),
    settings: z
      .object(
        Object.fromEntries(
          WEBSITE_IDENTITY_FIELDS.map(({ key }) => [
            key,
            z
              .string()
              .trim()
              .refine(
                (value) => validWebsiteIdentityValue(key, value),
                "Invalid company detail or URL",
              )
              .optional(),
          ]),
        ),
      )
      .strict()
      .refine(
        (values) => Object.keys(values).length > 0,
        "Select at least one branding setting to change",
      ),
  })
  .strict();
router.use(requireBusinessCapability("marketing.design.branding"));
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});
router.get(
  "/",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const snapshot = await storage.settings.getCategorySnapshot("branding", true);
    // Preserve raw stored values, even values outside the current write contract.
    res.json({
      settings: Object.fromEntries(
        WEBSITE_IDENTITY_FIELDS.map(({ key }) => [key, snapshot.values[key] ?? ""]),
      ),
      version: snapshot.version,
    });
  }),
);
router.put(
  "/",
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const body = input.parse(req.body);
    const current = await storage.settings.getCategorySnapshot("branding", true);
    try {
      await projectPublicWebsiteIdentity({
        version: current.version,
        values: { ...current.values, ...body.settings } as Record<string, string>,
      });
    } catch {
      return res
        .status(400)
        .json({
          message:
            "Company details could not be published. Use valid phone numbers, a Google Business URL and an uploaded public logo or favicon.",
        });
    }
    const entries = Object.entries(body.settings).map(([key, value]) => ({
      key,
      value: value!,
      category: "branding",
      isSecret: false,
    }));
    await storage.settings.upsertSettings(
      entries,
      { category: "branding", version: body.expectedVersion, publicOnly: true },
      {
        userId: req.user!.id,
        action: "website_identity_updated",
        details: JSON.stringify(entries.map((entry) => entry.key).sort()),
      },
    );
    resetEmailBrandingCache();
    res.json({ saved: true });
  }),
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1, fieldSize: 100 },
  fileFilter: (_req, file, cb) => {
    if (isImageMime(file.mimetype)) cb(null, true);
    else cb(new AppError("Accepted file types: PNG, JPEG, WebP, and GIF", 400));
  },
});
router.post(
  "/assets",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    z.object({}).strict().parse(req.query);
    const { settingKey } = z
      .object({ settingKey: z.enum(["frontend_logo_url", "favicon_url"]) })
      .strict()
      .parse(req.body);
    if (!req.file) return res.status(400).json({ message: "Select an image to upload" });
    const label = settingKey === "frontend_logo_url" ? "Site logo" : "Site favicon";
    const asset = await createCmsMediaAssetFromUpload({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user!.id,
      directory: "branding",
      title: label,
      alt: label,
      optimize: BRANDING_OPTIONS,
    });
    // Uploading prepares a media asset. Only the versioned PUT changes the active identity.
    res.status(201).json({ url: asset.url, mediaId: asset.id });
  }),
);
export default router;
