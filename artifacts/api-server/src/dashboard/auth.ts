import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { bearer, twoFactor } from "better-auth/plugins";
import { randomUUID, createHash } from "node:crypto";
import { pool } from "./database";
import { verifyCode } from "./policy";
export const origin = process.env.DASHBOARD_ORIGIN || "http://localhost:4180";
async function queueEmail(to: string, subject: string, text: string) {
  await pool.query("INSERT INTO outbox(id,kind,payload) VALUES($1,$2,$3)", [
    randomUUID(),
    "email",
    { to, subject, text },
  ]);
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
      if (!["/two-factor/verify-totp", "/two-factor/verify-backup-code"].includes(ctx.path)) return;
      const result = ctx.context.returned;
      if (!result || result instanceof APIError || typeof result !== "object" || !("token" in result)) return;
      // Mark only a session returned by successful factor verification, never a user-wide flag.
      const session = ctx.context.newSession || ctx.context.session;
      if (session) await pool.query(
        "INSERT INTO session_assurance(session_id) SELECT id FROM session WHERE id=$1 ON CONFLICT DO NOTHING",
        [session.session.id],
      );
    }),
    before: createAuthMiddleware(async (ctx) => {
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
      // MFA is mandatory for the owner; recovery uses audited operator procedures.
      if (ctx.path === "/two-factor/disable") {
        const session = await auth.api.getSession({
          headers: ctx.headers || new Headers(),
        });
        if (session) {
          const p = await pool.query(
            "SELECT role FROM staff_profile WHERE user_id=$1",
            [session.user.id],
          );
          if (p.rows[0]?.role === "owner")
            throw new APIError("FORBIDDEN", {
              message: "Owner MFA cannot be disabled",
            });
        }
      }
    }),
  },
});
