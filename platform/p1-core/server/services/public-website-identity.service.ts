import { createHash } from "node:crypto";
import { eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { cmsMedia } from "@shared/schema";
import {
  canonicalIdentityImagePath,
  PUBLIC_IDENTITY_BUNDLED_IMAGES,
  publicWebsiteIdentitySchema,
} from "@shared/public-website-identity";
import { isPublicR2Key } from "../utils/public-storage-policy";
function text(values: Record<string, string>, key: string, max: number) {
  const value = values[key];
  if (value === undefined || value === "") return null;
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  )
    throw Error("Invalid identity");
  return value.trim() || null;
}
function phone(value: string | null) {
  if (!value) return { phoneDisplay: null, phoneHref: null };
  const phones = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const normalized = phones.map((display) => {
    if (display.length > 80 || !/^\+?[0-9() .-]+$/.test(display)) throw Error("Invalid phone");
    const digits = display.replace(/\D/g, "");
    const international = display.startsWith("+")
      ? digits
      : digits.length === 10
        ? `1${digits}`
        : digits.length === 11 && digits.startsWith("1")
          ? digits
          : "";
    if (!/^[0-9]{7,15}$/.test(international)) throw Error("Invalid phone");
    return { phoneDisplay: display, phoneHref: `tel:+${international}` };
  });
  return normalized[0] ?? { phoneDisplay: null, phoneHref: null };
}

export async function projectPublicWebsiteIdentity(snapshot: {
  values: Record<string, string>;
  version: string;
}) {
  const values = snapshot.values;
  async function image(key: string) {
    const raw = text(values, key, 2048);
    if (!raw) return null;
    // Bootstrap administration artwork is not the public website's wide P1 logo.
    if (
      key === "frontend_logo_url" &&
      [
        "/admin/p1-land-management-logo.png",
        "https://www.p1landmanagement.com/admin/p1-land-management-logo.png",
        "https://p1landmanagement.com/admin/p1-land-management-logo.png",
      ].includes(raw)
    )
      return null;
    if (
      key === "favicon_url" &&
      [
        "/p1-symbol.svg",
        "https://www.p1landmanagement.com/p1-symbol.svg",
        "https://p1landmanagement.com/p1-symbol.svg",
      ].includes(raw)
    )
      return null;
    const local = canonicalIdentityImagePath(raw);
    if (local && PUBLIC_IDENTITY_BUNDLED_IMAGES.some((path) => path === local)) return local;
    const urls = local
      ? [
          raw,
          local,
          `https://www.p1landmanagement.com${local}`,
          `https://p1landmanagement.com${local}`,
        ]
      : [raw];
    const candidates = await db
      .select({ url: cmsMedia.url, r2Key: cmsMedia.r2Key, mimeType: cmsMedia.mimeType })
      .from(cmsMedia)
      .where(
        or(
          inArray(cmsMedia.url, urls),
          local?.startsWith("/r2/cms/") ? eq(cmsMedia.r2Key, local.slice(4)) : undefined,
        ),
      )
      .limit(2);
    if (candidates.length !== 1) throw Error("Unknown branding asset");
    const asset = candidates[0];
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(asset.mimeType))
      throw Error("Unsupported branding asset");
    const resolved = asset.r2Key
      ? canonicalIdentityImagePath(`/r2/${asset.r2Key}`)
      : canonicalIdentityImagePath(asset.url);
    if (!resolved || (asset.r2Key && !isPublicR2Key(asset.r2Key)))
      throw Error("Private branding asset");
    return resolved;
  }
  const configuredName = text(values, "company_name", 255);
  const payload = {
    schemaVersion: 1 as const,
    stackId: "p1-land-management" as const,
    companyName: configuredName === "P1 Land & Property Management" ? null : configuredName,
    companyAddress: text(values, "company_address", 2000)?.replace(/[\r\n\t]+/g, " ") ?? null,
    ...phone(text(values, "company_phone_numbers", 2000)),
    logoUrl: await image("frontend_logo_url"),
    faviconUrl: await image("favicon_url"),
    googleBusinessUrl: text(values, "company_google_business_url", 2048),
  };
  const version = createHash("sha256")
    .update(JSON.stringify([snapshot.version, payload]))
    .digest("hex");
  return publicWebsiteIdentitySchema.parse({ ...payload, version });
}
