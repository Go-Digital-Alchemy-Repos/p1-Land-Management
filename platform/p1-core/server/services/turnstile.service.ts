import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { AppError, asyncHandler } from "../middleware/error-handler";

const ACTION = "public_form" as const;
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const P1_HOSTS = new Set(["www.p1landmanagement.com", "p1landmanagement.com"]);
const unavailable = () =>
  new AppError(
    "Form verification is temporarily unavailable. Keep your inputs and try verification again.",
    503,
  );
const rejected = () => new AppError("Complete the form verification again before submitting.", 403);

export function createTurnstileService(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
) {
  function configuration() {
    if (!env.TURNSTILE_ENABLED || env.TURNSTILE_ENABLED === "false") return null;
    if (env.TURNSTILE_ENABLED !== "true") throw unavailable();
    const secret = env.TURNSTILE_SECRET_KEY?.trim();
    const siteKey = env.TURNSTILE_SITE_KEY?.trim();
    const hostnames = (env.TURNSTILE_ALLOWED_HOSTNAMES || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!secret || !siteKey || !hostnames.length || hostnames.some((host) => !P1_HOSTS.has(host)))
      throw unavailable();
    return { secret, siteKey, hostnames: new Set(hostnames) };
  }
  return {
    publicConfiguration() {
      const config = configuration();
      return { enabled: Boolean(config), siteKey: config?.siteKey ?? null, action: ACTION };
    },
    async verify(token: string | undefined) {
      const config = configuration();
      if (!config) return;
      if (!token || token.length > 2048 || !token.trim()) throw rejected();
      let result: unknown;
      try {
        const response = await fetcher(SITEVERIFY, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(8000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: config.secret,
            response: token,
            idempotency_key: randomUUID(),
          }),
        });
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("application/json") ||
          !response.body
        ) {
          await response.body?.cancel();
          throw unavailable();
        }
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          bytes += part.value.length;
          if (bytes > 8192) {
            await reader.cancel();
            throw unavailable();
          }
          chunks.push(part.value);
        }
        result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        throw unavailable();
      }
      if (!result || typeof result !== "object" || Array.isArray(result)) throw unavailable();
      const value = result as Record<string, unknown>;
      if (
        value.success !== true ||
        value.action !== ACTION ||
        typeof value.hostname !== "string" ||
        !config.hostnames.has(value.hostname)
      )
        throw rejected();
    },
  };
}
export const turnstile = createTurnstileService();
/** Reverify every attempt: the challenge token never enters submission data or receipts. */
export const requirePublicFormVerification: RequestHandler = asyncHandler(
  async (req, _res, next) => {
    await turnstile.verify(req.get("X-Turnstile-Token"));
    next();
  },
);
