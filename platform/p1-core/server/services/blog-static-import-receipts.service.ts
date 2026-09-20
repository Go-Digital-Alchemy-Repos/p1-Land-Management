import { assertBlogCoverSetLedger } from "./blog-cover-image-set.service";
import { createHash } from "node:crypto";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  blogEditorialSchema,
  blogPostRevisions,
  blogStaticImportReceipts as receipts,
  STATIC_BLOG_SOURCE_SLUGS,
} from "@shared/schema/blog-publications";
import type { CmsTransaction } from "./cms-concurrency";
import { CmsMutationError } from "./cms-concurrency";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("Only JSON values are permitted");
  return encoded;
}
export function hashStaticBlogEditorial(snapshot: unknown): string {
  return createHash("sha256")
    .update(canonical(blogEditorialSchema.parse(snapshot)))
    .digest("hex");
}
const inputSchema = z
  .object({
    sourceSlug: z.enum(STATIC_BLOG_SOURCE_SLUGS),
    postId: z.string().min(1),
    receiptId: z.string().trim().min(1),
    importedRevisionId: z.string().min(1),
    bundleSha256: z.string().regex(/^[0-9a-f]{64}$/),
    editorialSha256: z.string().regex(/^[0-9a-f]{64}$/),
    actorId: z.string().trim().min(1),
    sourceManifest: z
      .record(z.unknown())
      .refine((value) => Object.keys(value).length > 0, "Source provenance is required"),
  })
  .strict();
export async function listStaticBlogRoutes(reader: Pick<CmsTransaction, "select"> = db) {
  return reader
    .select({ slug: receipts.sourceSlug, postId: receipts.postId })
    .from(receipts)
    .orderBy(asc(receipts.sourceSlug));
}
/** Internal transaction helper only: no API/import entry point. The eventual importer
 * must validate its review bundle/media and publish atomically in this same transaction. */
export async function recordStaticBlogImportReceipt(
  tx: CmsTransaction,
  raw: z.input<typeof inputSchema>,
) {
  const input = inputSchema.parse(raw);
  // Avoid a cycle with publication service, which consults receipt ownership.
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended('blog-publication-writes', 0))`,
  );
  const [revision] = await tx
    .select()
    .from(blogPostRevisions)
    .where(
      and(
        eq(blogPostRevisions.id, input.importedRevisionId),
        eq(blogPostRevisions.postId, input.postId),
      ),
    );
  if (
    !revision ||
    blogEditorialSchema.parse(revision.snapshot).slug !== input.sourceSlug ||
    hashStaticBlogEditorial(revision.snapshot) !== input.editorialSha256
  )
    throw new CmsMutationError(
      409,
      "BLOG_STATIC_RECEIPT_IDENTITY",
      "The imported revision, source slug and reviewed editorial hash must match.",
    );
  await assertBlogCoverSetLedger(
    blogEditorialSchema.parse(revision.snapshot),
    input.sourceManifest.coverImageSet,
    tx,
  );
  // JSON roundtrip rejects non-JSON provenance before it reaches the JSONB boundary.
  if (
    canonical(JSON.parse(JSON.stringify(input.sourceManifest))) !== canonical(input.sourceManifest)
  )
    throw new CmsMutationError(
      400,
      "BLOG_STATIC_RECEIPT_PROVENANCE",
      "Source provenance must contain only JSON values.",
    );
  const existing = await tx
    .select()
    .from(receipts)
    .where(
      or(
        eq(receipts.sourceSlug, input.sourceSlug),
        eq(receipts.postId, input.postId),
        eq(receipts.receiptId, input.receiptId),
      ),
    );
  if (existing.length) {
    const row = existing[0];
    const { importedAt: _time, ...identity } = row;
    if (existing.length !== 1 || canonical(identity) !== canonical(input))
      throw new CmsMutationError(
        409,
        "BLOG_STATIC_RECEIPT_CONFLICT",
        "Permanent static article ownership already exists with a different receipt identity.",
      );
    return row;
  }
  const [created] = await tx.insert(receipts).values(input).returning();
  return created;
}
