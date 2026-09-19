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
    mailchimp_server_prefix: z.string().max(2048).refine(value => !value || normalizeMailchimpServerPrefix(value) !== null).transform(value => value ? normalizeMailchimpServerPrefix(value)! : ""),
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

/** Enforced before decryption and again inside the versioned write transaction. */
export function integrationKeyRules(provider: WebsiteIntegrationProvider): Readonly<Record<string, boolean>> {
  const registry = integrationRegistry[provider];
  return Object.fromEntries([...registry.publicKeys.map(key => [key, false]), ...registry.secretKeys.map(key => [key, true])]);
}

export function normalizeMailchimpServerPrefix(value: string): string | null {
  const text = value.trim();
  if (/^us[0-9]{1,14}$/.test(text)) return text;
  // Retain known Mailchimp API-host input, never arbitrary hosts or URL credentials.
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    const match = /^(us[0-9]{1,14})\.api\.mailchimp\.com$/i.exec(url.hostname);
    if (!match || !["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || url.search || url.hash) return null;
    return match[1].toLowerCase();
  } catch { return null; }
}
