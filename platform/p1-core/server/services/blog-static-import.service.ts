import { createHash, randomUUID } from "node:crypto";
import { eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { blogPosts, cmsMedia, type User } from "@shared/schema";
import { clientSiteManifestSchema, type ClientSiteManifest } from "@shared/client-site-manifest";
import {
  blogEditorialSchema,
  blogStaticImportReceipts,
  STATIC_BLOG_SOURCE_SLUGS,
  type BlogEditorialSnapshot,
} from "@shared/schema/blog-publications";
import type { BlogCoverImageSet, ReviewedBlogImage } from "@shared/blog-cover-image-set";
import { CmsMutationError, type CmsTransaction } from "./cms-concurrency";
import {
  assertBlogImportSource,
  blogImportSourceAdmissionSchema,
  hashBlogImportJson,
} from "./blog-import-source.service";
import {
  stageReviewedBlogMedia,
  type ReviewedBlogMediaFile,
  type StagedBlogMediaFile,
} from "./blog-media-staging.service";
import type { LegacyUploadStorage } from "./legacy-upload-storage";
import {
  initializeReviewedBlogImportInTransaction,
  lockBlogPublication,
  mutateBlogPublicationInTransaction,
} from "./blog-publication.service";
import { blogLeaseInTransaction } from "./blog-publication-leases.service";
import {
  recordStaticBlogImportReceipt,
  hashStaticBlogEditorial,
} from "./blog-static-import-receipts.service";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const planSchema = z
  .object({
    schemaVersion: z.literal(1),
    reviewBundleSha256: hash,
    sourceFingerprint: hash,
    mediaReviewSha256: hash,
    fileManifestSha256: hash,
    sourceRevision: z.string().regex(/^[a-f0-9]{40}$/),
    deploymentId: z.string().min(1).max(200),
    datePolicy: z.enum(["retain-declared", "clear-unverified"]),
    sourceAdmission: blogImportSourceAdmissionSchema,
    reviewedManifest: z.custom<ClientSiteManifest>(
      (value) => clientSiteManifestSchema.safeParse(value).success,
    ),
    articles: z.array(z.unknown()).length(5),
  })
  .strict();
export type StaticBlogImportPlan = Omit<z.infer<typeof planSchema>, "articles"> & {
  articles: Array<Omit<BlogEditorialSnapshot, "coverImageSet">>;
};
export type StaticBlogImportResult = {
  planSha256: string;
  replay: boolean;
  articles: Array<{ sourceSlug: string; postId: string; receiptId: string }>;
};
const conflict = (message: string): never => {
  throw new CmsMutationError(409, "BLOG_STATIC_IMPORT_CONFLICT", message);
};
const bytesHash = (data: Buffer) => createHash("sha256").update(data).digest("hex");
/** Exact canonical metadata contract shared with the privileged review-plan builder. */
export function staticBlogFileManifest(files: readonly ReviewedBlogMediaFile[]) {
  return files
    .map((f) => ({
      sourceSlug: f.sourceSlug,
      role: f.role,
      sha256: f.sha256,
      bytes: f.bytes,
      mime: f.mime,
      width: f.width,
      height: f.height,
      quality: f.quality,
    }))
    .sort(
      (a, b) =>
        a.sourceSlug.localeCompare(b.sourceSlug) ||
        a.role.localeCompare(b.role) ||
        a.width - b.width,
    );
}
export function hashStaticBlogFileManifest(files: readonly ReviewedBlogMediaFile[]) {
  return hashBlogImportJson(staticBlogFileManifest(files));
}
function parsePlan(raw: unknown): StaticBlogImportPlan {
  // Reject coercible/non-JSON provenance and own the plan across async provider calls.
  hashBlogImportJson(raw);
  const plan = planSchema.parse(JSON.parse(JSON.stringify(raw)));
  const remaining = new Set<string>(STATIC_BLOG_SOURCE_SLUGS);
  const articles = plan.articles
    .map((rawArticle) => {
      if (rawArticle && typeof rawArticle === "object" && "coverImageSet" in rawArticle)
        conflict("Cover ledgers are built internally from verified staging, not accepted in plans");
      const article = blogEditorialSchema.parse(rawArticle);
      if (!remaining.delete(article.slug))
        conflict("Plan must contain each known static article exactly once");
      return article;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
  if (remaining.size) conflict("The five static articles are required");
  return {
    ...plan,
    articles,
    sourceAdmission: {
      ...plan.sourceAdmission,
      components: [...plan.sourceAdmission.components].sort(
        (a, b) =>
          a.routeId.localeCompare(b.routeId) || a.componentKey.localeCompare(b.componentKey),
      ),
    },
  };
}
/** Identity excludes mutable actor profile and includes the explicit date policy and all reviewed inputs.
 * Artifact hashes are privileged review claims: the caller must verify the exact review files.
 * This service independently verifies file bytes/decodability and live source admission, not raw HTML captures.
 */
export function hashStaticBlogImportPlan(raw: unknown, actorId: string) {
  if (!actorId.trim()) throw Error("Import actor required");
  return hashBlogImportJson({ plan: parsePlan(raw), actorId });
}
function identities(plan: StaticBlogImportPlan, planSha256: string) {
  return plan.articles.map((article) => ({
    sourceSlug: z.enum(STATIC_BLOG_SOURCE_SLUGS).parse(article.slug),
    postId: `blog-static-${hashBlogImportJson({ planSha256, slug: article.slug })}`,
    receiptId: `blog-static-receipt-${hashBlogImportJson({ planSha256, slug: article.slug })}`,
  }));
}
async function replay(
  tx: CmsTransaction,
  expected: ReturnType<typeof identities>,
  planSha256: string,
  actorId: string,
) {
  await lockBlogPublication(tx);
  const rows = await tx.select().from(blogStaticImportReceipts);
  if (!rows.length) return false;
  if (
    rows.length !== 5 ||
    expected.some(
      (item) =>
        !rows.some(
          (row) =>
            row.sourceSlug === item.sourceSlug &&
            row.postId === item.postId &&
            row.receiptId === item.receiptId &&
            row.actorId === actorId &&
            row.sourceManifest.importPlanSha256 === planSha256,
        ),
    )
  )
    conflict("Permanent static ownership is partial or belongs to a different approved plan");
  return true;
}
function reviewedImage(file: StagedBlogMediaFile): ReviewedBlogImage {
  return {
    mediaId: `blog-static-media-${file.sha256}`,
    url: file.url,
    sha256: file.sha256,
    bytes: file.bytes,
    mime: file.mime,
    width: file.width,
    height: file.height,
    quality: file.quality,
  };
}
async function registerMedia(tx: CmsTransaction, files: StagedBlogMediaFile[], actor: User) {
  // CMS mutations do not all acquire the Blog lock. Fence concurrent media registration/metadata writes too.
  await tx.execute(sql`LOCK TABLE cms_media IN SHARE ROW EXCLUSIVE MODE`);
  for (const file of files) {
    const asset = reviewedImage(file);
    const matches = await tx
      .select()
      .from(cmsMedia)
      .where(
        or(
          eq(cmsMedia.id, asset.mediaId),
          eq(cmsMedia.r2Key, file.r2Key),
          inArray(cmsMedia.url, [
            file.url,
            `https://www.p1landmanagement.com${file.url}`,
            `https://p1landmanagement.com${file.url}`,
          ]),
        ),
      );
    if (matches.length) {
      if (
        matches.length !== 1 ||
        matches[0].id !== asset.mediaId ||
        matches[0].r2Key !== file.r2Key ||
        matches[0].url !== file.url ||
        matches[0].mimeType !== file.mime ||
        matches[0].fileSize !== file.bytes
      )
        conflict("Staged media identity conflicts with an existing media registration");
      continue;
    }
    await tx.insert(cmsMedia).values({
      id: asset.mediaId,
      filename: file.r2Key.split("/").at(-1)!,
      originalName: `${file.sourceSlug}-${file.role}-${file.width}.${file.mime === "image/png" ? "png" : "webp"}`,
      url: file.url,
      r2Key: file.r2Key,
      mimeType: file.mime,
      fileSize: file.bytes,
      uploadedBy: actor.id,
    });
  }
}
/** Internal only: no HTTP/CLI/config/provider creation. Caller verifies reviewed artifacts and approval.
 * Provider staging may leave verified immutable objects after failure. Retry the exact approved plan;
 * never delete them automatically. All database ownership/publication changes commit together.
 */
export async function importStaticBlogArticles(
  rawPlan: unknown,
  actor: User,
  rawFiles: readonly ReviewedBlogMediaFile[],
  storage: LegacyUploadStorage,
  expectedPlanSha256: string,
): Promise<StaticBlogImportResult> {
  const plan = parsePlan(rawPlan);
  if (!actor?.id?.trim() || !["admin", "editor"].includes(actor.role))
    conflict("An authorized import actor is required");
  const actorIdentity = { ...actor };
  const planSha256 = hashStaticBlogImportPlan(plan, actorIdentity.id);
  if (!hash.safeParse(expectedPlanSha256).success || planSha256 !== expectedPlanSha256)
    conflict("Approved plan identity does not match the import input");
  if (!Array.isArray(rawFiles) || rawFiles.length !== 20)
    conflict("Twenty reviewed files are required");
  let totalBytes = 0;
  const files = rawFiles.map((file) => {
    if (
      !Buffer.isBuffer(file.data) ||
      file.data.length < 1 ||
      file.data.length > 10 * 1024 * 1024 ||
      file.data.length !== file.bytes ||
      bytesHash(file.data) !== file.sha256
    )
      conflict("Reviewed media bytes changed");
    totalBytes += file.data.length;
    if (totalBytes > 50 * 1024 * 1024) conflict("Reviewed files exceed import byte bounds");
    return { ...file, data: Buffer.from(file.data) };
  });
  if (hashStaticBlogFileManifest(files) !== plan.fileManifestSha256)
    conflict("Reviewed media metadata changed");
  const expected = identities(plan, planSha256);
  const already = await db.transaction(async (tx) => {
    if (await replay(tx, expected, planSha256, actorIdentity.id)) return true;
    await assertBlogImportSource(tx, plan.sourceAdmission, plan.reviewedManifest);
    return false;
  });
  if (already) return { planSha256, replay: true, articles: expected };
  const staged = await stageReviewedBlogMedia(storage, files);
  return db.transaction(async (tx) => {
    if (await replay(tx, expected, planSha256, actorIdentity.id))
      return { planSha256, replay: true, articles: expected };
    await assertBlogImportSource(tx, plan.sourceAdmission, plan.reviewedManifest);
    await registerMedia(tx, staged, actorIdentity);
    const existing = await tx
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(
        or(
          inArray(
            blogPosts.id,
            expected.map((x) => x.postId),
          ),
          inArray(
            blogPosts.slug,
            expected.map((x) => x.sourceSlug),
          ),
        ),
      );
    if (existing.length)
      conflict("An existing Blog post already occupies an import identity or slug");
    for (const article of plan.articles) {
      const identity = expected.find((x) => x.sourceSlug === article.slug)!;
      const media = staged.filter((file) => file.sourceSlug === article.slug);
      const original = reviewedImage(media.find((file) => file.role === "original")!);
      const variants = media
        .filter((file) => file.role === "variant")
        .sort((a, b) => a.width - b.width)
        .map(reviewedImage);
      const coverImageSet: BlogCoverImageSet = {
        schemaVersion: 1,
        sourceFingerprint: plan.sourceFingerprint,
        mediaReviewSha256: plan.mediaReviewSha256,
        original,
        variants,
        defaultMediaId: variants[2].mediaId,
      };
      const presentation =
        article.presentation && plan.datePolicy === "clear-unverified"
          ? {
              ...article.presentation,
              structuredData: {
                ...article.presentation.structuredData,
                publishedDate: null,
                modifiedDate: null,
              },
            }
          : article.presentation;
      const snapshot = blogEditorialSchema.parse({
        ...article,
        coverImageUrl: variants[2].url,
        coverImageSet,
        ...(presentation !== undefined ? { presentation } : {}),
      });
      const { presentation: _presentation, coverImageSet: _set, ...legacy } = snapshot;
      await tx.insert(blogPosts).values({
        ...legacy,
        id: identity.postId,
        isPublished: false,
        publishedAt: null,
        scheduledAt: null,
      });
      const state = await initializeReviewedBlogImportInTransaction(
        tx,
        identity.postId,
        actorIdentity.id,
        snapshot,
        coverImageSet,
        {
          kind: "static-import",
          sourceReference: plan.sourceRevision,
          reason: `Approved import ${planSha256}`,
        },
      );
      await recordStaticBlogImportReceipt(tx, {
        ...identity,
        importedRevisionId: state.draftRevisionId,
        bundleSha256: plan.reviewBundleSha256,
        editorialSha256: hashStaticBlogEditorial(snapshot),
        actorId: actorIdentity.id,
        sourceManifest: {
          schemaVersion: 1,
          importPlanSha256: planSha256,
          reviewBundleSha256: plan.reviewBundleSha256,
          sourceFingerprint: plan.sourceFingerprint,
          mediaReviewSha256: plan.mediaReviewSha256,
          fileManifestSha256: plan.fileManifestSha256,
          sourceRevision: plan.sourceRevision,
          deploymentId: plan.deploymentId,
          datePolicy: plan.datePolicy,
          sourceAdmission: plan.sourceAdmission,
          websiteManifestSha256: plan.sourceAdmission.websiteManifestSha256,
          coverImageSet,
        },
      });
      const editorInstanceId = randomUUID();
      const lease = await blogLeaseInTransaction(tx, "acquire", identity.postId, actorIdentity, {
        editorInstanceId,
      });
      if (!lease.ownedByCurrentEditor || !lease.lock)
        return conflict("Import could not acquire its own publication lease");
      await mutateBlogPublicationInTransaction(
        tx,
        identity.postId,
        actorIdentity.id,
        { expectedVersion: state.version, editorInstanceId, leaseId: lease.lock.id },
        "publish",
      );
      await blogLeaseInTransaction(tx, "release", identity.postId, actorIdentity, {
        editorInstanceId,
        leaseId: lease.lock.id,
      });
    }
    return { planSha256, replay: false, articles: expected };
  });
}
