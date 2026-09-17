import { createSign } from "node:crypto";
import { GAError } from "./google-reporting-error";
export function googleReportingToken(
  env: NodeJS.ProcessEnv,
  scope: string,
  json: (url: string, options: RequestInit) => Promise<any>,
  now: () => number,
) {
  let token: { value: string; expires: number } | undefined;
  let tokenFlight: Promise<string> | undefined;
  async function accessToken(): Promise<string> {
    if (token && token.expires > now()) return token.value;
    if (tokenFlight) return tokenFlight;
    tokenFlight = (async () => {
      let body: URLSearchParams;
      if (env.P1_GA_SERVICE_ACCOUNT_JSON) {
        let credentials: any;
        try {
          credentials = JSON.parse(env.P1_GA_SERVICE_ACCOUNT_JSON);
        } catch {
          throw new GAError("not_configured");
        }
        if (
          typeof credentials.client_email !== "string" ||
          typeof credentials.private_key !== "string"
        )
          throw new GAError("not_configured");
        const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
        const issued = Math.floor(now() / 1000);
        const unsigned =
          encode({ alg: "RS256", typ: "JWT" }) +
          "." +
          encode({
            iss: credentials.client_email,
            scope,
            aud: "https://oauth2.googleapis.com/token",
            iat: issued,
            exp: issued + 3600,
          });
        const signature = createSign("RSA-SHA256")
          .update(unsigned)
          .sign(credentials.private_key, "base64url");
        body = new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: unsigned + "." + signature,
        });
      } else if (env.P1_GA_CLIENT_ID && env.P1_GA_CLIENT_SECRET && env.P1_GA_REFRESH_TOKEN) {
        body = new URLSearchParams({
          grant_type: "refresh_token",
          client_id: env.P1_GA_CLIENT_ID,
          client_secret: env.P1_GA_CLIENT_SECRET,
          refresh_token: env.P1_GA_REFRESH_TOKEN,
        });
      } else throw new GAError("not_configured");
      const result = await json("https://oauth2.googleapis.com/token", { method: "POST", body });
      if (typeof result.access_token !== "string" || !Number.isFinite(Number(result.expires_in)))
        throw new GAError("provider_unavailable");
      token = {
        value: result.access_token,
        expires: now() + Math.max(0, Number(result.expires_in) - 60) * 1000,
      };
      return token.value;
    })();
    try {
      return await tokenFlight;
    } finally {
      tokenFlight = undefined;
    }
  }
  return accessToken;
}
