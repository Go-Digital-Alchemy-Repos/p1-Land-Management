import type { BlogCommentSettings } from "@shared/schema";
import { blogCommentSettingsSchema } from "@shared/schema";
import { storage } from "../storage";

export const DEFAULT_BLOG_COMMENT_SETTINGS: BlogCommentSettings = {
  commentsEnabled: false,
  allowGuestComments: false,
  allowLinksInComments: false,
  requireApproval: true,
  enableSpamProtection: true,
  enableHoneypot: true,
  enableRateLimit: true,
  rateLimitSeconds: 60,
  maxLinksPerComment: 2,
};

function normalizeBoolean(value: string | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  return value === "true";
}

function normalizeNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getBlogCommentSettings(): Promise<BlogCommentSettings> {
  const settings = await storage.settings.getDecryptedCategory("blog_comments");
  return blogCommentSettingsSchema.parse({
    commentsEnabled: normalizeBoolean(
      settings.comments_enabled,
      DEFAULT_BLOG_COMMENT_SETTINGS.commentsEnabled,
    ),
    allowGuestComments: normalizeBoolean(
      settings.allow_guest_comments,
      DEFAULT_BLOG_COMMENT_SETTINGS.allowGuestComments,
    ),
    allowLinksInComments: normalizeBoolean(
      settings.allow_links_in_comments,
      DEFAULT_BLOG_COMMENT_SETTINGS.allowLinksInComments,
    ),
    requireApproval: normalizeBoolean(
      settings.require_approval,
      DEFAULT_BLOG_COMMENT_SETTINGS.requireApproval,
    ),
    enableSpamProtection: normalizeBoolean(
      settings.enable_spam_protection,
      DEFAULT_BLOG_COMMENT_SETTINGS.enableSpamProtection,
    ),
    enableHoneypot: normalizeBoolean(
      settings.enable_honeypot,
      DEFAULT_BLOG_COMMENT_SETTINGS.enableHoneypot,
    ),
    enableRateLimit: normalizeBoolean(
      settings.enable_rate_limit,
      DEFAULT_BLOG_COMMENT_SETTINGS.enableRateLimit,
    ),
    rateLimitSeconds: normalizeNumber(
      settings.rate_limit_seconds,
      DEFAULT_BLOG_COMMENT_SETTINGS.rateLimitSeconds,
    ),
    maxLinksPerComment: normalizeNumber(
      settings.max_links_per_comment,
      DEFAULT_BLOG_COMMENT_SETTINGS.maxLinksPerComment,
    ),
  });
}

export async function saveBlogCommentSettings(settings: BlogCommentSettings): Promise<void> {
  const parsed = blogCommentSettingsSchema.parse(settings);
  const values: Array<[string, string]> = [
    ["comments_enabled", String(parsed.commentsEnabled)],
    ["allow_guest_comments", String(parsed.allowGuestComments)],
    ["allow_links_in_comments", String(parsed.allowLinksInComments)],
    ["require_approval", String(parsed.requireApproval)],
    ["enable_spam_protection", String(parsed.enableSpamProtection)],
    ["enable_honeypot", String(parsed.enableHoneypot)],
    ["enable_rate_limit", String(parsed.enableRateLimit)],
    ["rate_limit_seconds", String(parsed.rateLimitSeconds)],
    ["max_links_per_comment", String(parsed.maxLinksPerComment)],
  ];

  for (const [key, value] of values) {
    await storage.settings.upsertSetting(key, value, "blog_comments", false);
  }
  storage.settings.invalidateCategory("blog_comments");
}

export function countLinksInText(body: string) {
  return body.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi)?.length ?? 0;
}

export function textContainsLinks(body: string) {
  return countLinksInText(body) > 0;
}
