import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { clientSiteContent } from "@shared/schema";
import { STATIC_BLOG_SLUGS } from "@shared/public-blog";
import { clientSiteManifestSchema, type ClientSiteManifest } from "@shared/client-site-manifest";
import { CmsMutationError, type CmsTransaction } from "./cms-concurrency";
import { lockBlogPublication } from "./blog-publication.service";
import { parseComponentContent, resolveClientSiteComponent } from "./client-site-content.service";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const componentAdmission = z
  .object({
    routeId: z.string(),
    componentKey: z.string(),
    mode: z.enum(["absent", "unpublished", "published"]),
    rowId: z.string().min(1).nullable(),
    draftRevision: z.number().int().nonnegative().nullable(),
    publishedRevision: z.number().int().positive().nullable(),
    publishedContentSha256: digest.nullable(),
    defaultContentSha256: digest,
    effectiveContentSha256: digest,
    capturedRevision: z.number().int().nonnegative(),
  })
  .strict();
export const blogImportSourceAdmissionSchema = z
  .object({
    schemaVersion: z.literal(1),
    stackId: z.literal("p1-land-management"),
    websiteManifestSha256: digest,
    components: z.array(componentAdmission).length(6),
  })
  .strict();
export type BlogImportSourceAdmission = z.infer<typeof blogImportSourceAdmissionSchema>;

/** Canonical JSON only: no undefined, Date, non-finite numbers or implicit coercion. */
export function hashBlogImportJson(value: unknown): string {
  const seen = new Set<object>();
  function canonical(input: unknown): string {
    if (input === null || typeof input === "string" || typeof input === "boolean")
      return JSON.stringify(input);
    if (typeof input === "number" && Number.isFinite(input)) return JSON.stringify(input);
    if (typeof input !== "object" || input === null || seen.has(input))
      throw new Error("Blog import hashing requires acyclic JSON values");
    seen.add(input);
    try {
      if (Array.isArray(input)) {
        if (Object.keys(input).length !== input.length)
          throw new Error("Sparse JSON arrays are not supported");
        return `[${input.map(canonical).join(",")}]`;
      }
      if (
        Object.getPrototypeOf(input) !== Object.prototype &&
        Object.getPrototypeOf(input) !== null
      )
        throw new Error("Blog import hashing requires plain JSON objects");
      return `{${Object.keys(input)
        .sort()
        .map(
          (key) => `${JSON.stringify(key)}:${canonical((input as Record<string, unknown>)[key])}`,
        )
        .join(",")}}`;
    } finally {
      seen.delete(input);
    }
  }
  return createHash("sha256").update(canonical(value)).digest("hex");
}
function conflict(message: string): never {
  throw new CmsMutationError(409, "BLOG_IMPORT_SOURCE_CHANGED", message);
}

/**
 * Holds Blog lock then a SHARE table lock until caller transaction completes.
 * This also fences absent-row inserts. Call before import writes, with reviewed
 * artifacts already loaded; this helper performs no filesystem/provider I/O.
 */
export async function assertBlogImportSource(
  tx: CmsTransaction,
  input: BlogImportSourceAdmission,
  reviewedManifest: ClientSiteManifest,
): Promise<void> {
  // A snapshot established before waiting on the source lock could otherwise
  // conceal a concurrent publisher that committed while this transaction waited.
  const isolation = await tx.execute<{ transaction_isolation: string }>(
    sql`SHOW transaction_isolation`,
  );
  if (isolation.rows[0]?.transaction_isolation !== "read committed")
    throw new CmsMutationError(
      400,
      "BLOG_IMPORT_ISOLATION_REQUIRED",
      "Blog source admission requires a READ COMMITTED transaction",
    );
  const parsed = blogImportSourceAdmissionSchema.safeParse(input);
  if (!parsed.success)
    throw new CmsMutationError(400, "BLOG_IMPORT_SOURCE_INVALID", "Invalid Blog source admission");
  const admission = parsed.data;
  if (
    !clientSiteManifestSchema.safeParse(reviewedManifest).success ||
    reviewedManifest.client.stackId !== admission.stackId ||
    hashBlogImportJson(reviewedManifest) !== admission.websiteManifestSha256
  )
    conflict("Reviewed Website manifest changed");
  const expected = new Set([
    ...STATIC_BLOG_SLUGS.map((slug) => `blog-${slug}/blog-${slug}-content`),
    "home/site-chrome",
  ]);
  for (const component of admission.components)
    if (!expected.delete(`${component.routeId}/${component.componentKey}`))
      conflict("Blog source admission must contain each of the six source components exactly once");
  if (expected.size) conflict("Missing Blog source component");

  await lockBlogPublication(tx); // Existing helper sets transaction-local lock_timeout to 5s.
  await tx.execute(sql`LOCK TABLE client_site_content IN SHARE MODE`);
  for (const component of admission.components) {
    const { routeId, componentKey } = component;
    const definition = resolveClientSiteComponent(
      reviewedManifest,
      routeId,
      componentKey,
    ).component;
    const defaults = definition.defaultContent;
    if (hashBlogImportJson(defaults) !== component.defaultContentSha256)
      conflict(`Reviewed defaults changed: ${routeId}`);
    const [row] = await tx
      .select()
      .from(clientSiteContent)
      .where(
        and(
          eq(clientSiteContent.stackId, admission.stackId),
          eq(clientSiteContent.routeId, routeId),
          eq(clientSiteContent.componentKey, componentKey),
        ),
      );
    if (row && (row.publishedContent === null) !== (row.publishedRevision === null))
      conflict(`Inconsistent source publication: ${routeId}`);
    const mode = !row ? "absent" : row.publishedRevision === null ? "unpublished" : "published";
    if (
      mode !== component.mode ||
      (row?.id ?? null) !== component.rowId ||
      (row?.draftRevision ?? null) !== component.draftRevision ||
      (row?.publishedRevision ?? null) !== component.publishedRevision
    )
      conflict(`Source identity or revision changed: ${routeId}`);
    const publishedHash = mode === "published" ? hashBlogImportJson(row.publishedContent) : null;
    if (
      publishedHash !== component.publishedContentSha256 ||
      component.capturedRevision !== (row?.publishedRevision ?? 0)
    )
      conflict(`Source publication differs from capture: ${routeId}`);
    let effective: Record<string, unknown> = defaults;
    if (mode === "published") {
      const content = parseComponentContent(
        reviewedManifest,
        routeId,
        componentKey,
        row.publishedContent,
      );
      // Website content.mjs accepts only flat string fields. Core's validator is
      // more permissive, so do not admit content the Website would reject/cache.
      for (const [key, value] of Object.entries(content)) {
        const field = definition.fields.find((candidate) => candidate.path === key);
        if (
          !field ||
          typeof value !== "string" ||
          value.length > (field.maxLength || 12000) ||
          (field.type === "image" &&
            (!(/^\/(?!\/)/.test(value) || /^https:\/\/www\.p1landmanagement\.com\//.test(value)) ||
              /[\u0000-\u001f\\]/.test(value))) ||
          (field.type === "ctaTarget" &&
            !(
              /^(\/(?!\/)|#[A-Za-z]|https:\/\/|mailto:|tel:)/.test(value) &&
              !/[\u0000-\u001f\\]/.test(value)
            ))
        )
          conflict(`Source content is not accepted by the Website: ${routeId}`);
      }
      effective = { ...defaults, ...content };
    }
    if (hashBlogImportJson(effective) !== component.effectiveContentSha256)
      conflict(`Source effective content differs from capture: ${routeId}`);
  }
}
