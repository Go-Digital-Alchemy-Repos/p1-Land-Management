import crypto from "crypto";
import type { CmsPage } from "@shared/schema";

const PREVIEW_SECRET =
  process.env.CMS_PREVIEW_SECRET ||
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV !== "production" ? "dev-cms-preview-secret" : "");

function getPageVersion(page: Pick<CmsPage, "updatedAt">): string {
  const updatedAt =
    page.updatedAt instanceof Date
      ? page.updatedAt
      : page.updatedAt
        ? new Date(page.updatedAt)
        : null;
  return String(updatedAt?.getTime() ?? 0);
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex");
}

export function createCmsPreviewToken(
  page: Pick<CmsPage, "id" | "slug" | "updatedAt">,
  expiresInSeconds = 7 * 24 * 60 * 60,
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${page.id}:${page.slug}:${getPageVersion(page)}:${expiresAt}`;
  const signature = signPayload(payload);
  return `${expiresAt}.${signature}`;
}

export function verifyCmsPreviewToken(
  page: Pick<CmsPage, "id" | "slug" | "updatedAt">,
  token: string | null | undefined,
): boolean {
  if (!PREVIEW_SECRET || !token) return false;
  const [expiresAtRaw, signature] = token.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (
    !expiresAtRaw ||
    !signature ||
    !Number.isFinite(expiresAt) ||
    expiresAt < Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const payload = `${page.id}:${page.slug}:${getPageVersion(page)}:${expiresAt}`;
  const expected = signPayload(payload);

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
