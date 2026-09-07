import { federationEnabled } from "../services/federation-client";
import { FEDERATION_COOKIE, federationConsumer, hasFederationHistory, updateUnlinkedPassword } from "../services/federation-runtime";
import { pool } from "../db";
import { digest } from "../services/federation-consumer";
import { getBaseUrl } from "../utils/route-helpers";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import {
  hashPassword,
  comparePassword,
  generateToken,
  setTokenCookie,
  clearTokenCookie,
  authenticateToken,
} from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { asyncHandler } from "../middleware/error-handler";
import {
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  registerLimiter,
} from "../middleware/security";
import { logger } from "../utils/logger";
import * as r2Service from "../services/r2.service";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function normalizeUserImage<T extends { profileImageUrl?: string | null }>(
  user: T,
): Promise<T> {
  return {
    ...user,
    profileImageUrl: (await r2Service.normalizePublicUrl(user.profileImageUrl)) ?? null,
  };
}


router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    if (federationEnabled()) { res.status(403).json({message:"Use Dashboard sign-in or explicit account linking"}); return; }
    const { email, password } = req.body;

    const user = await storage.users.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    if (await hasFederationHistory(user.id)) { res.status(403).json({message:"Use P1 Dashboard to sign in"}); return; }
    const valid = await comparePassword(password, user.password);
    if (!valid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({ message: "Your account has been suspended. Please contact support." });
      return;
    }

    await storage.users.updateUser(user.id, { lastLoginAt: new Date() });
    await storage.activity.log(user.id, "login", "User logged in");

    const token = generateToken(user);
    setTokenCookie(res, token);

    const { password: _, ...safeUser } = user;
    res.json(await normalizeUserImage(safeUser));
  }),
);

router.post("/logout", asyncHandler(async (req, res) => {
  const token=req.cookies?.[FEDERATION_COOKIE];
  if(typeof token === "string") await pool.query("DELETE FROM p1_federation_session WHERE token_hash=$1",[digest(token)]);
  res.clearCookie(FEDERATION_COOKIE,{path:"/api"});
  clearTokenCookie(res);
  res.json({ message: "Logged out" });
}));

router.get(
  "/me",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { password: _, ...safeUser } = req.user!;
    res.json(await normalizeUserImage(safeUser));
  }),
);

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await storage.users.getUserByEmail(email);
    if (user && !federationEnabled() && !await hasFederationHistory(user.id)) {
      const resetToken = await storage.passwordResets.createToken(user.id);
      const baseUrl = getBaseUrl(req);
      const resetUrl = `${baseUrl}/admin/reset-password?token=${resetToken.token}`;
      const { sendPasswordResetEmail } = await import("../services/email.service");
      sendPasswordResetEmail(user.email, user.firstName, resetUrl).catch((err) =>
        logger.email.warn("Failed to send password reset email", { error: err.message }),
      );
    }
    res.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  }),
);

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

router.post(
  "/reset-password",
  resetPasswordLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const resetToken = await storage.passwordResets.getValidToken(token);
    if (!resetToken) {
      res.status(400).json({ message: "Invalid or expired reset link" });
      return;
    }

    if (federationEnabled() || await hasFederationHistory(resetToken.userId)) { res.status(403).json({message:"Use P1 Dashboard password recovery"}); return; }
    const hashed = await hashPassword(password);
    await updateUnlinkedPassword(resetToken.userId, hashed);
    await storage.passwordResets.markUsed(resetToken.id);

    res.json({ message: "Password reset successfully. You can now log in." });
  }),
);

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

router.put(
  "/profile",
  authenticateToken,
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email } = req.body;
    const userId = req.user!.id;

    if (email && email !== req.user!.email) {
      const existing = await storage.users.getUserByEmail(email);
      if (existing && existing.id !== userId) {
        res.status(409).json({ message: "Email already in use" });
        return;
      }
    }

    const updated = await storage.users.updateUser(userId, {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email }),
    });

    if (!updated) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const { password: _, ...safeUser } = updated;
    res.json(await normalizeUserImage(safeUser));
  }),
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.put(
  "/change-password",
  authenticateToken,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    if (federationEnabled() || await hasFederationHistory(req.user!.id)) { res.status(403).json({message:"Use P1 Dashboard password settings"}); return; }
    const { currentPassword, newPassword } = req.body;

    const valid = await comparePassword(currentPassword, req.user!.password);
    if (!valid) {
      res.status(400).json({ message: "Current password is incorrect" });
      return;
    }

    const hashed = await hashPassword(newPassword);
    await updateUnlinkedPassword(req.user!.id, hashed);

    res.json({ message: "Password changed successfully" });
  }),
);

export default router;
