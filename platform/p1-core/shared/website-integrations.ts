import { z } from "zod";

export const websiteIntegrationProviders = ["mailgun", "mailchimp", "cloudflare_r2"] as const;
export const websiteIntegrationProviderSchema = z.enum(websiteIntegrationProviders);
export type WebsiteIntegrationProvider = z.infer<typeof websiteIntegrationProviderSchema>;
const secret = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("keep") }).strict(),
  z.object({ operation: z.literal("clear") }).strict(),
  z.object({ operation: z.literal("replace"), value: z.string().min(1).max(8192).refine(value => !/[\r\n\u0000]/.test(value) && !/^•+$/.test(value)) }).strict(),
]);
const domain = z.string().max(253).regex(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/);
const optional = (schema: z.ZodString | z.ZodEffects<any>) => z.union([z.literal(""), schema]);
export const integrationFields = {
  mailgun: z.object({
    mailgun_domain: optional(domain),
    mailgun_from_address: z.string().max(320).refine(value => !/[\r\n\u0000]/.test(value)),
    mailgun_api_key: secret,
  }).strict(),
  mailchimp: z.object({
    mailchimp_audience_id: z.string().max(64).regex(/^[a-zA-Z0-9]*$/),
    mailchimp_server_prefix: z.string().max(16).regex(/^(?:us[0-9]+)?$/),
    mailchimp_api_key: secret,
  }).strict(),
  cloudflare_r2: z.object({
    r2_account_id: z.string().regex(/^(?:[a-fA-F0-9]{32})?$/),
    r2_bucket_name: z.string().max(63).regex(/^(?:[a-z0-9][a-z0-9-]{1,61}[a-z0-9])?$/),
    r2_public_url: z.string().max(2048).refine(value => {
      if (!value) return true;
      try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && !url.hostname.endsWith(".r2.cloudflarestorage.com"); } catch { return false; }
    }),
    r2_access_key_id: secret,
    r2_secret_access_key: secret,
  }).strict(),
};
export const integrationRegistry = {
  mailgun: { publicKeys: ["mailgun_domain", "mailgun_from_address"], secretKeys: ["mailgun_api_key"] },
  mailchimp: { publicKeys: ["mailchimp_audience_id", "mailchimp_server_prefix"], secretKeys: ["mailchimp_api_key"] },
  cloudflare_r2: { publicKeys: ["r2_account_id", "r2_bucket_name", "r2_public_url"], secretKeys: ["r2_access_key_id", "r2_secret_access_key"] },
} as const;
export function integrationWriteSchema(provider: WebsiteIntegrationProvider) {
  return z.object({ expectedVersion: z.string().regex(/^[a-f0-9]{64}$/), fields: integrationFields[provider] }).strict();
}
