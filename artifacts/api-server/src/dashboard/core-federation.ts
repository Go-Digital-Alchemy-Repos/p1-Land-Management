import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  json,
  Router,
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";
import { z } from "zod";
import { actor, identity } from "./access";
import { pool, transaction } from "./database";
import { HttpError } from "./policy";

const authorizationLifetimeSeconds = 60;
const continuationLifetimeSeconds = 10 * 60;
const purpose = "p1-core-cms-v1";
const browserCookie = "p1-core-federation";
const enabled = () => process.env.CORE_FEDERATION_ENABLED === "true";
const browserAuthorizationBuckets = new Map<
  string,
  { count: number; expiresAt: number }
>();
let retentionTimer: NodeJS.Timeout | undefined;
type FederationConfig = {
  clientId: string;
  clientSecrets: string[];
  redirectUri: string;
};

function configuration(): FederationConfig {
  if (!enabled()) throw new HttpError(404, "Endpoint not found");
  const clientId = process.env.CORE_FEDERATION_CLIENT_ID || "";
  const clientSecret = process.env.CORE_FEDERATION_CLIENT_SECRET_CURRENT || "";
  const previousClientSecret =
    process.env.CORE_FEDERATION_CLIENT_SECRET_PREVIOUS || "";
  const previousSecretExpiresAt =
    process.env.CORE_FEDERATION_CLIENT_SECRET_PREVIOUS_EXPIRES_AT || "";
  const redirectUri = process.env.CORE_FEDERATION_REDIRECT_URI || "";
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(clientId) || clientSecret.length < 43)
    throw new Error("Core federation credentials are not configured safely");
  const clientSecrets = [clientSecret];
  if (previousClientSecret || previousSecretExpiresAt) {
    const expiresAt = Date.parse(previousSecretExpiresAt);
    if (
      previousClientSecret.length < 43 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
        previousSecretExpiresAt,
      ) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now() ||
      expiresAt > Date.now() + 24 * 60 * 60 * 1000
    )
      throw new Error(
        "Core federation secret rotation is not configured safely",
      );
    clientSecrets.push(previousClientSecret);
  }
  const issuer = process.env.DASHBOARD_ORIGIN || "";
  let parsedIssuer: URL;
  try {
    parsedIssuer = new URL(issuer);
  } catch {
    throw new Error("Dashboard federation issuer is invalid");
  }
  if (
    (parsedIssuer.protocol !== "https:" &&
      process.env.CORE_FEDERATION_TEST_ALLOW_INSECURE_ORIGIN !== "true") ||
    parsedIssuer.username ||
    parsedIssuer.password ||
    parsedIssuer.search ||
    parsedIssuer.hash ||
    parsedIssuer.pathname !== "/"
  )
    throw new Error("Dashboard federation issuer is invalid");
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new Error("Core federation redirect URI is invalid");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("Core federation redirect URI is invalid");
  return { clientId, clientSecrets, redirectUri: parsed.toString() };
}

function constantEquals(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function codeHash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function pkceS256(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

async function purgeExpired(client: {
  query: (sql: string) => Promise<unknown>;
}) {
  await client.query(
    "DELETE FROM core_federation_authorization_code WHERE expires_at<=now()",
  );
  await client.query(
    "DELETE FROM core_federation_browser_request WHERE expires_at<=now()",
  );
  await client.query(
    "DELETE FROM core_federation_grant WHERE expires_at<=now()",
  );
}

export function startCoreFederationRetention() {
  if (!enabled() || retentionTimer) return;
  const cleanup = () =>
    void purgeExpired(pool).catch(() =>
      console.error(
        JSON.stringify({ event: "core_federation.retention_failed" }),
      ),
    );
  cleanup();
  retentionTimer = setInterval(cleanup, 60_000);
  retentionTimer.unref();
}

export function stopCoreFederationRetention() {
  if (!retentionTimer) return;
  clearInterval(retentionTimer);
  retentionTimer = undefined;
}

function continuationCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.DASHBOARD_ORIGIN?.startsWith("https:") ?? false,
    sameSite: "lax" as const,
    path: "/api/v1/federation",
    maxAge: continuationLifetimeSeconds * 1000,
  };
}

function callbackRedirect(redirectUri: string, code: string, state: string) {
  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  redirect.searchParams.set("state", state);
  return redirect.toString();
}

function readCookie(header: string | undefined, name: string) {
  return header
    ?.split(";")
    .map((part) => part.trim().split("=", 2))
    .find(([key]) => key === name)?.[1];
}

async function issueAuthorizationCode(
  client: { query: (...args: any[]) => Promise<any> },
  request: {
    codeChallenge: string;
    clientId: string;
    redirectUri: string;
    state: string;
  },
  canonical: { userId: string; sessionId: string; ownerAttested: boolean },
) {
  const code = randomBytes(32).toString("base64url");
  await client.query(
    "INSERT INTO core_federation_authorization_code(id,code_hash,code_challenge,client_id,redirect_uri,canonical_user_id,canonical_session_id,owner_attested,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+interval '60 seconds')",
    [
      randomUUID(),
      codeHash(code),
      request.codeChallenge,
      request.clientId,
      request.redirectUri,
      canonical.userId,
      canonical.sessionId,
      canonical.ownerAttested,
    ],
  );
  await client.query(
    "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'core_federation.authorization_created',$3,$4)",
    [
      randomUUID(),
      canonical.userId,
      canonical.sessionId,
      { purpose, clientId: request.clientId },
    ],
  );
  return code;
}

const serviceOnly: RequestHandler = (req, res, next) => {
  if (
    req.headers.cookie ||
    req.headers.origin ||
    Object.keys(req.query).length
  ) {
    res.status(403).json({ error: "core_federation_service_only" });
    return;
  }
  next();
};

const browserAuthorizationRateLimit: RequestHandler = (req, res, next) => {
  const now = Date.now();
  for (const [key, bucket] of browserAuthorizationBuckets)
    if (bucket.expiresAt <= now) browserAuthorizationBuckets.delete(key);
  const key = req.socket.remoteAddress || "unknown";
  let bucket = browserAuthorizationBuckets.get(key);
  if (!bucket) {
    if (browserAuthorizationBuckets.size >= 256) {
      res.status(429).json({ error: "core_federation_rate_limit" });
      return;
    }
    bucket = { count: 0, expiresAt: now + 60_000 };
    browserAuthorizationBuckets.set(key, bucket);
  }
  if (++bucket.count > 10) {
    res.set("Retry-After", "60");
    res.status(429).json({ error: "core_federation_rate_limit" });
    return;
  }
  next();
};

function authenticateServiceClient(authorization: string | undefined) {
  const config = configuration();
  const encoded = authorization?.match(/^Basic\s+([A-Za-z0-9+/]+=*)$/i)?.[1];
  if (!encoded)
    throw new HttpError(401, "Federation client authentication failed");
  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    throw new HttpError(401, "Federation client authentication failed");
  }
  const separator = decoded.indexOf(":");
  if (
    separator < 1 ||
    !constantEquals(decoded.slice(0, separator), config.clientId) ||
    !config.clientSecrets
      .map((secret) => constantEquals(decoded.slice(separator + 1), secret))
      .some(Boolean)
  )
    throw new HttpError(401, "Federation client authentication failed");
  return config;
}

const authorizeQuery = z
  .object({
    client_id: z.string().regex(/^[a-zA-Z0-9_-]{8,128}$/),
    redirect_uri: z.string().url().max(500),
    state: z.string().regex(/^[A-Za-z0-9_-]{32,512}$/),
    code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
    code_challenge_method: z.literal("S256"),
    purpose: z.literal(purpose),
  })
  .strict();
const tokenBody = z
  .object({
    code: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
    code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
    purpose: z.literal(purpose),
  })
  .strict();
const introspectBody = z
  .object({
    grant_id: z.string().uuid(),
    purpose: z.literal(purpose),
    require_owner_attestation: z.boolean().optional().default(false),
  })
  .strict();

export const coreFederationApi = Router();
coreFederationApi.get(
  "/federation/authorize",
  browserAuthorizationRateLimit,
  async (req, res) => {
    const config = configuration();
    const query = authorizeQuery.parse(req.query);
    if (
      query.client_id !== config.clientId ||
      query.redirect_uri !== config.redirectUri
    )
      throw new HttpError(400, "Invalid federation client request");

    try {
      // actor() is the shared dashboard boundary for verified identity, active
      // account, role and current-session MFA assurance.
      const authenticated = await actor(req);
      const session = await identity(req);
      if (authenticated.id !== session.user.id)
        throw new HttpError(401, "Sign in with a verified account");
      const code = await transaction(async (client) => {
        await purgeExpired(client);
        return issueAuthorizationCode(
          client,
          {
            codeChallenge: query.code_challenge,
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            state: query.state,
          },
          {
            userId: session.user.id,
            sessionId: session.session.id,
            ownerAttested: authenticated.role === "owner",
          },
        );
      });
      res.set("Referrer-Policy", "no-referrer");
      res.redirect(
        303,
        callbackRedirect(config.redirectUri, code, query.state),
      );
    } catch (error) {
      if (!(error instanceof HttpError) || ![401, 403].includes(error.status))
        throw error;
      const nonce = randomBytes(32).toString("base64url");
      await transaction(async (client) => {
        await purgeExpired(client);
        await client.query(
          "INSERT INTO core_federation_browser_request(id,nonce_hash,code_challenge,client_id,redirect_uri,state,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '10 minutes')",
          [
            randomUUID(),
            codeHash(nonce),
            query.code_challenge,
            config.clientId,
            config.redirectUri,
            query.state,
          ],
        );
      });
      res.cookie(browserCookie, nonce, continuationCookieOptions());
      res.set("Referrer-Policy", "no-referrer");
      res.redirect(303, "/?federation=1");
    }
  },
);
coreFederationApi.post("/federation/resume", async (req, res) => {
  const config = configuration();
  const nonce = readCookie(req.get("cookie"), browserCookie);
  if (typeof nonce !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(nonce))
    throw new HttpError(401, "Federation continuation is invalid");
  // A saved continuation is only resumed after actor() proves the current
  // Dashboard session completed ordinary login and any required MFA step.
  const authenticated = await actor(req);
  const session = await identity(req);
  if (authenticated.id !== session.user.id)
    throw new HttpError(401, "Sign in with a verified account");
  try {
    const result = await transaction(async (client) => {
      await purgeExpired(client);
      const pending = await client.query(
        "SELECT code_challenge,client_id,redirect_uri,state FROM core_federation_browser_request WHERE nonce_hash=$1 AND expires_at>now() FOR UPDATE",
        [codeHash(nonce)],
      );
      const request = pending.rows[0];
      if (!request)
        throw new HttpError(401, "Federation continuation is invalid");
      if (
        request.client_id !== config.clientId ||
        request.redirect_uri !== config.redirectUri
      )
        throw new HttpError(400, "Invalid federation client request");
      await client.query(
        "DELETE FROM core_federation_browser_request WHERE nonce_hash=$1",
        [codeHash(nonce)],
      );
      const code = await issueAuthorizationCode(
        client,
        {
          codeChallenge: request.code_challenge,
          clientId: request.client_id,
          redirectUri: request.redirect_uri,
          state: request.state,
        },
        {
          userId: session.user.id,
          sessionId: session.session.id,
          ownerAttested: authenticated.role === "owner",
        },
      );
      return callbackRedirect(request.redirect_uri, code, request.state);
    });
    res.clearCookie(browserCookie, continuationCookieOptions());
    res.set("Referrer-Policy", "no-referrer");
    res.json({ redirect: result });
  } catch (error) {
    res.clearCookie(browserCookie, continuationCookieOptions());
    throw error;
  }
});

export const coreFederationIngress = Router();
coreFederationIngress.use(serviceOnly);
coreFederationIngress.use(
  json({ type: "application/json", limit: "4kb", strict: true }),
);
coreFederationIngress.post("/federation/token", async (req, res) => {
  const config = authenticateServiceClient(req.get("authorization"));
  const body = tokenBody.parse(req.body);
  const grant = await transaction(async (client) => {
    await purgeExpired(client);
    const result = await client.query(
      `SELECT c.canonical_user_id,c.canonical_session_id,c.owner_attested,c.code_challenge,
              u.email,u.name,u."emailVerified",u."twoFactorEnabled",s."expiresAt",p.role,p.active,p.mfa_required,
              EXISTS(SELECT 1 FROM session_assurance WHERE session_id=c.canonical_session_id) AS assured
         FROM core_federation_authorization_code c
         JOIN "user" u ON u.id=c.canonical_user_id
         JOIN session s ON s.id=c.canonical_session_id AND s."userId"=c.canonical_user_id
         LEFT JOIN staff_profile p ON p.user_id=c.canonical_user_id
        WHERE c.code_hash=$1 AND c.client_id=$2 AND c.redirect_uri=$3 AND c.expires_at>now()
        FOR UPDATE OF c`,
      [codeHash(body.code), config.clientId, config.redirectUri],
    );
    const row = result.rows[0];
    if (
      !row ||
      !constantEquals(pkceS256(body.code_verifier), row.code_challenge)
    )
      throw new HttpError(401, "Federation authorization code is invalid");
    if (
      !row.emailVerified ||
      !row.active ||
      !row.role ||
      row.expiresAt <= new Date()
    )
      throw new HttpError(401, "Federation authorization is no longer active");
    if (row.mfa_required && (!row.twoFactorEnabled || !row.assured))
      throw new HttpError(
        403,
        "Multi-factor authentication is required for this account",
      );
    const id = randomUUID();
    await client.query(
      "INSERT INTO core_federation_grant(id,canonical_user_id,canonical_session_id,owner_attested,expires_at) VALUES($1,$2,$3,$4,$5)",
      [
        id,
        row.canonical_user_id,
        row.canonical_session_id,
        row.owner_attested,
        row.expiresAt,
      ],
    );
    await client.query(
      "DELETE FROM core_federation_authorization_code WHERE code_hash=$1",
      [codeHash(body.code)],
    );
    await client.query(
      "INSERT INTO audit_event(id,user_id,action,entity_id,details) VALUES($1,$2,'core_federation.grant_issued',$3,$4)",
      [
        randomUUID(),
        row.canonical_user_id,
        id,
        { purpose, clientId: config.clientId },
      ],
    );
    return {
      grantId: id,
      subject: row.canonical_user_id,
      email: row.email,
      name: row.name,
      expiresAt: row.expiresAt,
      ownerAttested: row.owner_attested,
    };
  });
  res.json(grant);
});
coreFederationIngress.post("/federation/introspect", async (req, res) => {
  authenticateServiceClient(req.get("authorization"));
  const body = introspectBody.parse(req.body);
  await purgeExpired(pool);
  const result = await pool.query(
    `SELECT g.canonical_user_id,g.owner_attested,g.expires_at,u.email,u.name,u."emailVerified",u."twoFactorEnabled",
            s."expiresAt",p.role,p.active,p.mfa_required,
            EXISTS(SELECT 1 FROM session_assurance WHERE session_id=g.canonical_session_id) AS assured
       FROM core_federation_grant g
       JOIN "user" u ON u.id=g.canonical_user_id
       JOIN session s ON s.id=g.canonical_session_id AND s."userId"=g.canonical_user_id
       LEFT JOIN staff_profile p ON p.user_id=g.canonical_user_id
      WHERE g.id=$1 AND g.expires_at>now() AND s."expiresAt">now()`,
    [body.grant_id],
  );
  const row = result.rows[0];
  if (!row || !row.emailVerified)
    throw new HttpError(401, "Federation grant is inactive");
  if (!row.active || !row.role)
    throw new HttpError(403, "Federation account is not active");
  if (row.mfa_required && (!row.twoFactorEnabled || !row.assured))
    throw new HttpError(
      403,
      "Multi-factor authentication is required for this account",
    );
  if (
    body.require_owner_attestation &&
    (!row.owner_attested || row.role !== "owner")
  )
    throw new HttpError(403, "Owner attestation is required");
  res.json({
    active: true,
    grantId: body.grant_id,
    subject: row.canonical_user_id,
    email: row.email,
    name: row.name,
    role: row.role,
    ownerAttested: row.owner_attested,
    expiresAt: row.expires_at,
  });
});
coreFederationIngress.use(((error, _req, res, next) => {
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: "core_federation_payload_too_large" });
    return;
  }
  next(error);
}) satisfies ErrorRequestHandler);
