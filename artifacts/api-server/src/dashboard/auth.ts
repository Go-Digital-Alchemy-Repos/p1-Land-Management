import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { bearer, twoFactor } from "better-auth/plugins";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID, createHash } from "node:crypto";
import pg, { type PoolClient } from "pg";
import { pool } from "./database";
import { verifyCode } from "./policy";
export const origin = process.env.DASHBOARD_ORIGIN || "http://localhost:4180";
const factorResetPaths = new Set([
  "/two-factor/disable",
  "/two-factor/enable",
  "/two-factor/generate-backup-codes",
  "/two-factor/get-totp-uri",
]);
const factorVerificationPaths = new Set([
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
]);
// Factor resets must be serialized with a policy change for the same account.
// This pool is intentionally separate from Better Auth's main database pool:
// a held row lock must never consume the connection that Better Auth needs to
// complete the factor operation itself.
const factorResetLockPool = new pg.Pool({
  connectionString: process.env.DASHBOARD_DATABASE_URL,
  max: 4,
  idleTimeoutMillis: 10_000,
});
type FactorResetLockScope = { client?: PoolClient };
const factorResetLockScope = new AsyncLocalStorage<FactorResetLockScope>();
async function queueEmail(to: string, subject: string, text: string) {
  await pool.query("INSERT INTO outbox(id,kind,payload) VALUES($1,$2,$3)", [
    randomUUID(),
    "email",
    { to, subject, text },
  ]);
}
async function releaseFactorResetLock(client: PoolClient | undefined) {
  if (!client) return;
  try {
    // This transaction only acquires a row lock. Rolling it back is the most
    // explicit way to release that lock without committing any unrelated work.
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}
// Better Auth can return a raw Response or rethrow an unexpected endpoint
// error without running global after-hooks. Scope cleanup at the Node handler
// boundary instead, so every exit path releases this short-lived row lock.
export async function withFactorResetLockScope<T>(
  work: () => Promise<T>,
): Promise<T> {
  return factorResetLockScope.run({}, async () => {
    try {
      return await work();
    } finally {
      const scope = factorResetLockScope.getStore();
      await releaseFactorResetLock(scope?.client);
    }
  });
}
export async function closeFactorResetLockPool() {
  await factorResetLockPool.end();
}
async function requireAssuredFactorReset(ctx: any) {
  const isFactorReset = factorResetPaths.has(ctx.path);
  if (!isFactorReset && !factorVerificationPaths.has(ctx.path)) return;
  // Global before-hooks run ahead of Better Auth's endpoint middleware, so
  // resolve the authoritative session from the request before checking the
  // dashboard's per-account policy.
  const session = await auth.api.getSession({ headers: ctx.headers });
  if (!session?.session) return;
  const scope = factorResetLockScope.getStore();
  if (!scope)
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: "Unable to verify two-factor authentication policy",
    });
  const client = await factorResetLockPool.connect();
  try {
    await client.query("BEGIN");
    // Hold the profile-row lock through the Better Auth factor operation. The
    // owner policy update writes this same row, making the policy check and
    // factor reset one serializable decision instead of a check-then-act race.
    const policy = await client.query(
      "SELECT mfa_required,EXISTS(SELECT 1 FROM session_assurance WHERE session_id=$2) AS assured FROM staff_profile WHERE user_id=$1 AND active=true FOR UPDATE",
      [session.user.id, session.session.id],
    );
    // Do not trust the user object captured by getSession before waiting for
    // this lock. A concurrent enrollment can flip this flag while this request
    // is queued, so read it again after the policy decision is serialized.
    const user = await client.query(
      'SELECT "twoFactorEnabled" AS enabled FROM "user" WHERE id=$1',
      [session.user.id],
    );
    if (
      isFactorReset &&
      policy.rows[0]?.mfa_required &&
      user.rows[0]?.enabled &&
      !policy.rows[0].assured
    )
      throw new APIError("FORBIDDEN", {
        message:
          "Verify your existing authenticator or recovery code before changing two-factor authentication",
      });
    scope.client = client;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
    throw error;
  }
}
export const auth = betterAuth({
  database: pool,
  baseURL: origin,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [origin],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) =>
      queueEmail(user.email, "Reset your P1 password", url),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) =>
      queueEmail(user.email, "Verify your P1 account", url),
  },
  advanced: {
    cookiePrefix: "p1-dashboard",
    useSecureCookies: origin.startsWith("https:"),
  },
  session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
  rateLimit: { enabled: true, window: 60, max: 30 },
  // Native clients receive a signed session token after the normal email/password
  // sign-in and present it as `Authorization: Bearer <token>`. Keeping the same
  // session store as the web app means invitations, verification, revocation and
  // MFA policy apply equally to every P1 operations client.
  plugins: [
    bearer({ requireSignature: true }),
    twoFactor({ issuer: "P1 Land & Property Management" }),
  ],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (
        !["/two-factor/verify-totp", "/two-factor/verify-backup-code"].includes(
          ctx.path,
        )
      )
        return;
      const result = ctx.context.returned;
      if (
        !result ||
        result instanceof APIError ||
        typeof result !== "object" ||
        !("token" in result)
      )
        return;
      // Mark only a session returned by successful factor verification, never a user-wide flag.
      const session = ctx.context.newSession || ctx.context.session;
      if (session)
        await pool.query(
          "INSERT INTO session_assurance(session_id) SELECT id FROM session WHERE id=$1 ON CONFLICT DO NOTHING",
          [session.session.id],
        );
    }),
    before: createAuthMiddleware(async (ctx) => {
      await requireAssuredFactorReset(ctx);
      if (ctx.path === "/sign-up/email") {
        const email = String(ctx.body?.email || "").toLowerCase();
        const code = ctx.headers?.get("x-p1-setup-code") || "";
        const install = await pool.query(
          "SELECT completed_at FROM installation WHERE id=1",
        );
        const bootstrap =
          !install.rows[0]?.completed_at &&
          email === process.env.BOOTSTRAP_OWNER_EMAIL?.toLowerCase() &&
          verifyCode(
            code,
            process.env.BOOTSTRAP_CODE_HASH,
            process.env.BOOTSTRAP_EXPIRES_AT,
          );
        const token = ctx.headers?.get("x-p1-invitation") || "";
        const invite = await pool.query(
          "SELECT id FROM invitation WHERE email=$1 AND token_hash=$2 AND accepted_at IS NULL AND expires_at>now()",
          [email, createHash("sha256").update(token).digest("hex")],
        );
        if (!bootstrap && !invite.rowCount)
          throw new APIError("FORBIDDEN", {
            message: "A valid owner setup code or invitation is required",
          });
      }
    }),
  },
});
