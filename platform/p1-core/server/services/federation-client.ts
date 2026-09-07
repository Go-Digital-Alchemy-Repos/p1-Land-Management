import { z } from "zod";
export class FederationError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export const purpose = "p1-core-cms-v1";
const baseGrant = {
  grantId: z.string().uuid(),
  subject: z.string().min(1).max(256),
  email: z.string().email().max(320),
  name: z.string().max(500),
  expiresAt: z.string().datetime(),
  ownerAttested: z.boolean(),
};
export const tokenGrantSchema = z.object(baseGrant).strict();
export const activeGrantSchema = z
  .object({
    ...baseGrant,
    active: z.literal(true),
    role: z.enum(["owner", "manager", "dispatch", "sales", "finance", "crew", "client"]),
  })
  .strict();
export type Grant = z.infer<typeof tokenGrantSchema>;
export type FederationConfig = { issuer: string; origin: string; clientId: string; secret: string };
export function federationEnabled(env = process.env) {
  return env.CORE_FEDERATION_ENABLED === "true";
}
export function federationConfig(env = process.env): FederationConfig {
  const allowHttp = env.NODE_ENV === "test" && env.CORE_FEDERATION_ALLOW_SYNTHETIC_HTTP === "true";
  const origin = (value: string | undefined) => {
    try {
      const u = new URL(value || "");
      if (
        u.username ||
        u.password ||
        u.search ||
        u.hash ||
        u.pathname !== "/" ||
        (u.protocol !== "https:" &&
          !(
            allowHttp &&
            u.protocol === "http:" &&
            ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
          ))
      )
        throw Error();
      return u.origin;
    } catch {
      throw new FederationError(503, "federation_configuration_invalid");
    }
  };
  if (env.CORE_FEDERATION_ALLOW_SYNTHETIC_HTTP && env.NODE_ENV !== "test")
    throw new FederationError(503, "federation_configuration_invalid");
  const clientId = env.CORE_FEDERATION_CLIENT_ID || "",
    secret = env.CORE_FEDERATION_CLIENT_SECRET_CURRENT || "";
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(clientId) || !/^[A-Za-z0-9_-]{43,}$/.test(secret))
    throw new FederationError(503, "federation_configuration_invalid");
  return {
    issuer: origin(env.DASHBOARD_FEDERATION_ISSUER),
    origin: origin(env.APP_URL),
    clientId,
    secret,
  };
}
export function createFederationClient(config: FederationConfig, transport: typeof fetch = fetch) {
  async function post(path: string, body: unknown) {
    let response: Response;
    try {
      response = await transport(`${config.issuer}/api/integrations/core/v1/federation/${path}`, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
        headers: {
          "content-type": "application/json",
          authorization:
            "Basic " + Buffer.from(`${config.clientId}:${config.secret}`).toString("base64"),
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new FederationError(503, "federation_unavailable");
    }
    if (response.status === 401) throw new FederationError(401, "federation_session_inactive");
    if (response.status === 403) throw new FederationError(403, "federation_identity_ineligible");
    if (!response.ok) throw new FederationError(503, "federation_unavailable");
    try {
      const reader = response.body?.getReader();
      if (!reader) throw Error();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 8192) {
          await reader.cancel();
          throw Error();
        }
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      throw new FederationError(503, "federation_response_invalid");
    }
  }
  function parse<T extends Grant>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success || Date.parse(result.data.expiresAt) <= Date.now())
      throw new FederationError(503, "federation_response_invalid");
    return result.data;
  }
  return {
    async exchange(code: string, verifier: string) {
      return parse(
        tokenGrantSchema,
        await post("token", { code, code_verifier: verifier, purpose }),
      );
    },
    async introspect(grantId: string, owner = false) {
      const grant = parse(
        activeGrantSchema,
        await post("introspect", { grant_id: grantId, purpose, require_owner_attestation: owner }),
      );
      if (grant.grantId !== grantId || (owner && (!grant.ownerAttested || grant.role !== "owner")))
        throw new FederationError(403, "federation_identity_ineligible");
      return grant;
    },
  };
}
