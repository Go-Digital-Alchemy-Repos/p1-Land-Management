import { z } from "zod";
import { HttpError } from "./policy";

export const reports = {
  analytics: { capability: "marketing.analytics.view", path: "analytics" },
  realtime: { capability: "marketing.analytics.view", path: "realtime" },
  "search-console": { capability: "marketing.search-console.view", path: "search-console" },
} as const;
type ReportFailureCode = "invalid_date_range" | "not_configured" | "provider_unavailable";
const reportMessages: Record<ReportFailureCode, string> = {
  invalid_date_range: "Use a valid reporting date range of at most 93 days.",
  not_configured: "Website reporting is not connected yet.",
  provider_unavailable: "Website reporting is temporarily unavailable.",
};
export class ReportFailure extends HttpError {
  constructor(public code: ReportFailureCode) { super(code === "invalid_date_range" ? 400 : 503, reportMessages[code]); }
}
async function boundedJson(response: Response, limit: number) {
  if (!response.headers.get("content-type")?.includes("application/json")) throw Error();
  const reader = response.body?.getReader(); if (!reader) throw Error();
  let size = 0; const chunks: Uint8Array[] = [];
  for (;;) {
    const {value, done} = await reader.read(); if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw Error(); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export const dates = z.object({startDate: z.string().date().optional(), endDate: z.string().date().optional()}).strict();
export function marketingConnection(env = process.env) {
  const key = env.CORE_MARKETING_SERVICE_KEY || "";
  let url: URL;
  try { url = new URL(env.CORE_MARKETING_ORIGIN || ""); } catch { throw new ReportFailure("not_configured"); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !/^[A-Za-z0-9_-]{43,}$/.test(key))
    throw new ReportFailure("not_configured");
  return {origin: url.origin, key};
}
export async function readMarketingReport(origin: string, key: string, path: string, grantId: string, query: unknown, transport: typeof fetch = fetch) {
  if (!Object.values(reports).some(report => report.path === path)) throw new HttpError(404, "Report not found");
  let response: Response;
  try {
    const parsedQuery = dates.parse(query);
    const search = new URLSearchParams(Object.entries(parsedQuery).filter((entry): entry is [string, string] => entry[1] !== undefined));
    response = await transport(`${origin}/api/integrations/business-center/reporting/${path}?${search}`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(30000),
      headers: {"content-type": "application/json", authorization: `Bearer ${key}`},
      body: JSON.stringify({grantId}),
    });
    // Never forward provider messages, cookies, credentials or arbitrary response headers.
    if (!response.ok) {
      if ([400, 503].includes(response.status)) {
        const failure = await boundedJson(response, 8192);
        const code = failure?.status === "unavailable" && Object.hasOwn(reportMessages, failure.code) ? failure.code as ReportFailureCode : "provider_unavailable";
        throw new ReportFailure(code);
      }
      await response.body?.cancel();
      throw new HttpError([401, 403, 429].includes(response.status) ? response.status : 503,
        response.status === 403 ? "Website reporting access is unavailable" : "Website reporting is temporarily unavailable");
    }
    const payload = await boundedJson(response, 8 * 1024 * 1024);
    if (!payload || !["ok", "empty"].includes(payload.status)) throw Error();
    return payload;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new ReportFailure("provider_unavailable");
  }
}
