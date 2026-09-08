import { Router, type Response, type Request } from "express";
import { z } from "zod";
import {
  federationEnabled,
  federationConfig,
  FederationError,
  purpose,
} from "../services/federation-client";
import { federationConsumer, FEDERATION_COOKIE } from "../services/federation-runtime";
import { opaque } from "../services/federation-consumer";
import { storage } from "../storage";
import { comparePassword, clearTokenCookie } from "../middleware/auth";
import { loginLimiter } from "../middleware/security";
import { pool } from "../db";
const router = Router(),
  nonceCookie = "p1_federation_nonce",
  intentCookie = "p1_federation_intent",
  confirmCookie = "p1_federation_confirmation";
const flowPath = "/api/auth/federation";
function set(res: Response, name: string, value: string, path = flowPath) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "test",
    sameSite: "lax",
    path,
    maxAge: path === "/api" ? 7 * 86400000 : 600000,
  });
}
function clear(res: Response, name: string, path = flowPath) {
  res.clearCookie(name, { path });
}
const run =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    try {
      if (!federationEnabled()) throw new FederationError(404, "federation_disabled");
      await fn(req, res);
    } catch (e) {
      const duplicate =
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        e.code === "23505" &&
        "constraint" in e &&
        [
          "p1_identity_link_core_user_id_key",
          "p1_identity_link_canonical_user_id_key",
          "users_email_unique",
          "users_email_key",
          "p1_federation_bootstrap_consumption_pkey",
        ].includes(String(e.constraint));
      const normalizedError = duplicate
        ? new FederationError(409, "federation_identity_conflict")
        : e;
      const known = normalizedError instanceof FederationError ? normalizedError : null;
      const status = known ? known.status : normalizedError instanceof z.ZodError ? 400 : 503;
      const code = known
        ? known.code
        : status === 400
          ? "invalid_request"
          : "federation_unavailable";
      await pool
        .query("INSERT INTO p1_federation_audit(action,outcome) VALUES('request.rejected',$1)", [
          code,
        ])
        .catch(() => undefined);
      res.status(status).json({ message: code });
    }
  };
function sameOrigin(req: Request) {
  if (req.get("origin") !== federationConfig().origin)
    throw new FederationError(403, "origin_rejected");
}
function signedIn(res: Response, token: string) {
  clearTokenCookie(res);
  set(res, FEDERATION_COOKIE, token, "/api");
}
router.get("/status", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ enabled: federationEnabled() });
});
router.post(
  "/bootstrap-intent",
  loginLimiter,
  run(async (req, res) => {
    sameOrigin(req);
    const { proof } = z
      .object({ proof: z.string().min(1).max(128) })
      .strict()
      .parse(req.body);
    const nonce = opaque();
    const intent = await federationConsumer().bootstrapIntent(proof, nonce);
    set(res, nonceCookie, nonce);
    set(res, intentCookie, intent);
    res.json({ continuePath: flowPath + "/start" });
  }),
);
router.post(
  "/link-intent",
  loginLimiter,
  run(async (req, res) => {
    sameOrigin(req);
    const { email, password } = z
      .object({ email: z.string().email(), password: z.string().min(1).max(1024) })
      .strict()
      .parse(req.body);
    const user = await storage.users.getUserByEmail(email);
    if (!user || !(await comparePassword(password, user.password)))
      throw new FederationError(401, "invalid_credentials");
    const nonce = opaque(),
      intent = await federationConsumer().linkIntent(user.id, nonce);
    clearTokenCookie(res);
    set(res, nonceCookie, nonce);
    set(res, intentCookie, intent);
    res.json({ continuePath: flowPath + "/start" });
  }),
);
router.get(
  "/start",
  run(async (req, res) => {
    if (Object.keys(req.query).length) throw new FederationError(400, "invalid_request");
    const intent = req.cookies?.[intentCookie],
      nonce = intent ? req.cookies?.[nonceCookie] : opaque();
    clear(res, intentCookie);
    if (typeof nonce !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(nonce))
      throw new FederationError(401, "federation_state_invalid");
    const state = await federationConsumer().start(nonce, intent);
    set(res, nonceCookie, nonce);
    const cfg = federationConfig(),
      url = new URL("/api/v1/federation/authorize", cfg.issuer);
    url.search = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.origin + flowPath + "/callback",
      state: state.state,
      code_challenge: state.challenge,
      code_challenge_method: "S256",
      purpose,
    }).toString();
    res.redirect(302, url.toString());
  }),
);
router.get(
  "/callback",
  run(async (req, res) => {
    const nonce = req.cookies?.[nonceCookie];
    clear(res, nonceCookie);
    clear(res, intentCookie);
    // The configured external origin is authoritative; callback never trusts Host/proxy headers.
    const result = await federationConsumer().callback(req.query.state, nonce, req.query.code);
    if (result.session) {
      signedIn(res, result.session);
      res.redirect(303, "/admin");
    } else {
      set(res, nonceCookie, result.nonce!);
      set(res, confirmCookie, result.confirmation!);
      res.redirect(303, "/admin/login?federation=confirm");
    }
  }),
);
router.get(
  "/confirmation",
  run(async (req, res) => {
    res.json(
      await federationConsumer().confirmation(
        req.cookies?.[confirmCookie],
        req.cookies?.[nonceCookie],
      ),
    );
  }),
);
router.post(
  "/confirm",
  run(async (req, res) => {
    sameOrigin(req);
    z.object({ confirm: z.literal(true) })
      .strict()
      .parse(req.body);
    const token = req.cookies?.[confirmCookie],
      nonce = req.cookies?.[nonceCookie];
    clear(res, confirmCookie);
    clear(res, nonceCookie);
    signedIn(res, await federationConsumer().confirm(token, nonce));
    res.json({ continuePath: "/admin" });
  }),
);
export default router;
