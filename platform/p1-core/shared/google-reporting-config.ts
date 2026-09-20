import { z } from "zod";
export const GOOGLE_REPORTING_CATEGORY = "google_reporting";
export const googleReportingKeys = {
  targetSource: "p1_google_reporting_target_source",
  propertyId: "p1_google_reporting_property_id",
  searchConsoleSite: "p1_google_reporting_search_console_site",
} as const;
export const googleReportingKeyRules = Object.fromEntries(
  Object.values(googleReportingKeys).map((key) => [key, false]),
);
export const googlePropertyId = z.string().max(32).regex(/^\d+$/);
export const googleSearchConsoleSite = z.enum([
  "sc-domain:p1landmanagement.com",
  "https://www.p1landmanagement.com/",
  "https://p1landmanagement.com/",
]);
export const googleReportingFields = z
  .object({
    targetSource: z.enum(["deployment", "managed"]),
    propertyId: z.union([z.literal(""), googlePropertyId]),
    searchConsoleSite: z.union([z.literal(""), googleSearchConsoleSite]),
  })
  .strict()
  .superRefine((fields, ctx) => {
    if (fields.targetSource === "managed" && (!fields.propertyId || !fields.searchConsoleSite))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Managed reporting requires both property targets",
      });
  });
export const googleReportingWrite = z
  .object({ expectedVersion: z.string().regex(/^[a-f0-9]{64}$/), fields: googleReportingFields })
  .strict();
export function isGoogleReportingSetting(key: unknown, category?: unknown) {
  return (
    category === GOOGLE_REPORTING_CATEGORY ||
    (typeof key === "string" &&
      Object.values(googleReportingKeys).includes(
        key as (typeof googleReportingKeys)[keyof typeof googleReportingKeys],
      ))
  );
}
