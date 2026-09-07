import crypto from "crypto";
import { storage } from "../storage";
import { logger } from "../utils/logger";

interface MailchimpConfig {
  apiKey: string;
  audienceId: string;
  serverPrefix: string;
}

function normalizeServerPrefix(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\.api\.mailchimp\.com.*$/i, "");
}

function inferServerPrefixFromApiKey(apiKey: string): string | null {
  const suffix = apiKey.split("-")[1];
  return suffix ? suffix.trim() : null;
}

async function getMailchimpConfig(): Promise<MailchimpConfig | null> {
  const settings = await storage.settings.getDecryptedCategory("mailchimp");
  const apiKey = settings.mailchimp_api_key?.trim();
  const audienceId = settings.mailchimp_audience_id?.trim();
  const configuredPrefix = settings.mailchimp_server_prefix?.trim();
  const serverPrefix = configuredPrefix
    ? normalizeServerPrefix(configuredPrefix)
    : apiKey
      ? inferServerPrefixFromApiKey(apiKey)
      : null;

  if (!apiKey || !audienceId || !serverPrefix) {
    return null;
  }

  return {
    apiKey,
    audienceId,
    serverPrefix,
  };
}

function buildMailchimpUrl(config: MailchimpConfig, path: string): string {
  return `https://${config.serverPrefix}.api.mailchimp.com/3.0${path}`;
}

function getAuthHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`codex:${apiKey}`).toString("base64")}`;
}

async function mailchimpRequest<T>(
  config: MailchimpConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const deadline = setTimeout(
    () => controller.abort(new Error("mailchimp_request_timeout")),
    30_000,
  );
  deadline.unref();
  try {
    const response = await fetch(buildMailchimpUrl(config, path), {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: getAuthHeader(config.apiKey),
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Mailchimp request failed (${response.status}): ${body}`);
    }
    if (response.status === 204) return undefined as T;
    // Await body consumption before clearing the abort deadline as headers can
    // arrive while the remote server leaves the response body open indefinitely.
    return (await response.json()) as T;
  } finally {
    clearTimeout(deadline);
  }
}

function getSubscriberHash(email: string): string {
  return crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

export async function testMailchimpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getMailchimpConfig();
    if (!config) {
      return {
        success: false,
        message: "Mailchimp is missing an API key, audience ID, or server prefix.",
      };
    }

    await mailchimpRequest(config, `/lists/${config.audienceId}`, { method: "GET" });
    return { success: true, message: "Mailchimp connection successful" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Mailchimp connection failed",
    };
  }
}

export async function syncContactToMailchimp(
  input: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    tags?: string[];
  },
  options: { requireConfigured?: boolean } = {},
): Promise<void> {
  const config = await getMailchimpConfig();
  if (!config) {
    if (options.requireConfigured) throw new Error("mailchimp_not_configured");
    logger.email.info("[mailchimp] Skipping contact sync because Mailchimp is not configured");
    return;
  }

  const email = input.email.trim();
  if (!email) return;

  const subscriberHash = getSubscriberHash(email);

  await mailchimpRequest(config, `/lists/${config.audienceId}/members/${subscriberHash}`, {
    method: "PUT",
    body: JSON.stringify({
      email_address: email,
      status_if_new: "subscribed",
      merge_fields: {
        FNAME: input.firstName?.trim() || "",
        LNAME: input.lastName?.trim() || "",
      },
    }),
  });

  const tags = (input.tags ?? []).filter(Boolean);
  if (tags.length > 0) {
    await mailchimpRequest(config, `/lists/${config.audienceId}/members/${subscriberHash}/tags`, {
      method: "POST",
      body: JSON.stringify({
        tags: tags.map((tag) => ({
          name: tag,
          status: "active",
        })),
      }),
    });
  }
}
