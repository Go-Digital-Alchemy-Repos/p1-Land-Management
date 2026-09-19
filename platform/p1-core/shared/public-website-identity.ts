import { z } from "zod";
export const PUBLIC_IDENTITY_BUNDLED_IMAGES = [
  "/p1-symbol.svg",
  "/favicon.svg",
  "/favicon.ico",
  "/favicon-32.png",
  "/apple-touch-icon.png",
] as const;
export function canonicalIdentityImagePath(value: string): string | null {
  if (
    /[\u0000-\u0020\u007f\\%]/.test(value) ||
    value.split("/").some((part) => part === "." || part === "..")
  )
    return null;
  let candidate = value;
  if (value.startsWith("https://")) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (
      !["https://www.p1landmanagement.com", "https://p1landmanagement.com"].includes(url.origin) ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      return null;
    candidate = url.pathname;
  }
  if (PUBLIC_IDENTITY_BUNDLED_IMAGES.some((path) => path === candidate)) return candidate;
  // Uploaded raster media only; SVG remains limited to the checked-in company assets above.
  if (!/^\/(?:uploads\/cms|r2\/cms)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|gif)$/.test(candidate))
    return null;
  if (
    candidate
      .split("/")
      .slice(1)
      .some((segment) => !segment || segment === "." || segment === "..")
  )
    return null;
  return candidate;
}
const nullableText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value))
    .nullable();
const image = z
  .string()
  .max(2048)
  .refine((value) => canonicalIdentityImagePath(value) === value)
  .nullable();
export const publicWebsiteIdentitySchema = z
  .object({
    schemaVersion: z.literal(1),
    stackId: z.literal("p1-land-management"),
    version: z.string().regex(/^[a-f0-9]{64}$/),
    companyName: nullableText(255),
    companyAddress: nullableText(2000),
    phoneDisplay: nullableText(80),
    phoneHref: z
      .string()
      .regex(/^tel:\+[0-9]{7,15}$/)
      .nullable(),
    logoUrl: image,
    faviconUrl: image,
    googleBusinessUrl: z
      .string()
      .max(2048)
      .url()
      .refine((value) => {
        if (/[\u0000-\u0020\u007f\\]/.test(value)) return false;
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          ["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "g.page"].includes(
            url.hostname,
          ) &&
          !url.username &&
          !url.password
        );
      })
      .nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.phoneDisplay && value.phoneHref) {
      const digits = value.phoneDisplay.replace(/\D/g, "");
      const expected = value.phoneDisplay.startsWith("+")
        ? digits
        : digits.length === 10
          ? `1${digits}`
          : digits.length === 11 && digits.startsWith("1")
            ? digits
            : "";
      if (!/^\+?[0-9() .-]+$/.test(value.phoneDisplay) || value.phoneHref !== `tel:+${expected}`)
        context.addIssue({ code: "custom", message: "Inconsistent phone pair" });
    }
    if ((value.phoneDisplay === null) !== (value.phoneHref === null))
      context.addIssue({ code: "custom", message: "Incomplete phone pair" });
  });
export type PublicWebsiteIdentity = z.infer<typeof publicWebsiteIdentitySchema>;
