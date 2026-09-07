import { Router } from "express";
import { z } from "zod";
import { inArray, eq } from "drizzle-orm";
import { db } from "../../db";
import { users, therapistProfiles } from "@shared/schema";
import { AdminPermission } from "@shared/types";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { hashPassword } from "../../middleware/auth";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../../services/email.service";
import { paramString } from "../../utils/params";
import { getBaseUrl, notFound, conflict } from "../../utils/route-helpers";
import { logger } from "../../utils/logger";
import * as r2Service from "../../services/r2.service";

const router = Router();
const permissionSchema = z.enum([
  AdminPermission.DIRECTORY,
  AdminPermission.CONTENT,
  AdminPermission.DESIGN,
  AdminPermission.CRM,
]);

function isSystemUserRole(role: string) {
  return role === "admin" || role === "editor";
}

function normalizePermissions(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function normalizeActiveFormNotificationIds(formIds: string[]) {
  if (formIds.length === 0) return [];

  const forms = await storage.forms.getAll();
  const activeIds = new Set(forms.filter((form) => form.isActive).map((form) => form.id));
  return formIds.filter((formId) => activeIds.has(formId));
}

function normalizeSystemUserPayload<
  T extends {
    role: "admin" | "editor";
    adminPermissions?: string[];
    formNotificationFormIds?: string[];
  },
>(payload: T) {
  if (payload.role === "admin") {
    return {
      ...payload,
      adminPermissions: [],
      formNotificationFormIds: payload.formNotificationFormIds ?? [],
    };
  }

  const permissions = payload.adminPermissions ?? [];
  if (permissions.length === 0) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "Editors must be assigned at least one permission.",
        path: ["adminPermissions"],
      },
    ]);
  }

  return {
    ...payload,
    adminPermissions: permissions,
    formNotificationFormIds: payload.formNotificationFormIds ?? [],
  };
}

async function ensureAdminGuardrails({
  targetUserId,
  nextRole,
  suspend,
  deleting,
}: {
  targetUserId: string;
  nextRole?: "admin" | "editor";
  suspend?: boolean;
  deleting?: boolean;
}) {
  const user = await storage.users.getUser(targetUserId);
  if (!user) {
    return undefined;
  }

  if (user.role !== "admin") {
    return user;
  }

  const adminCount = await storage.users.countUsersByRole("admin");
  const wouldRemoveAdmin =
    deleting || suspend === true || (nextRole !== undefined && nextRole !== "admin");

  if (wouldRemoveAdmin && adminCount <= 1) {
    throw new Error("At least one system admin must remain active.");
  }

  return user;
}

async function toSafeUser<
  T extends {
    password?: string;
    profileImageUrl?: string | null;
    adminPermissions?: unknown;
    formNotificationFormIds?: unknown;
  },
>(user: T) {
  const { password: _password, ...safeUser } = user;
  return {
    ...safeUser,
    adminPermissions: normalizePermissions(safeUser.adminPermissions),
    formNotificationFormIds: normalizePermissions(safeUser.formNotificationFormIds),
    profileImageUrl: (await r2Service.normalizePublicUrl(safeUser.profileImageUrl)) ?? null,
  };
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        adminPermissions: users.adminPermissions,
        formNotificationFormIds: users.formNotificationFormIds,
        profileImageUrl: users.profileImageUrl,
        isSuspended: users.isSuspended,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        country: therapistProfiles.country,
      })
      .from(users)
      .leftJoin(therapistProfiles, eq(therapistProfiles.userId, users.id))
      .where(inArray(users.role, ["admin", "editor"]));

    res.json(await Promise.all(rows.map((row) => toSafeUser(row))));
  }),
);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["admin", "editor"]).default("editor"),
  adminPermissions: z.array(permissionSchema).optional().default([]),
  formNotificationFormIds: z.array(z.string().min(1)).optional().default([]),
  sendWelcomeEmail: z.boolean().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createUserSchema.parse(req.body);
    const data = normalizeSystemUserPayload(parsed);

    const existing = await storage.users.getUserByEmail(data.email);
    if (existing) {
      conflict(res, "Email already registered");
      return;
    }

    const validFormIds = await normalizeActiveFormNotificationIds(data.formNotificationFormIds);
    const hashedPassword = await hashPassword(data.password);
    const user = await storage.users.createUser({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      adminPermissions: data.adminPermissions,
      formNotificationFormIds: validFormIds,
    });

    if (data.sendWelcomeEmail) {
      const baseUrl = getBaseUrl(req);
      sendWelcomeEmail(user.email, user.firstName, `${baseUrl}/auth/login`, data.password).catch(
        (err) => logger.email.warn("Failed to send welcome email", { error: err.message }),
      );
    }

    res.status(201).json(await toSafeUser(user));
  }),
);

const updateUserSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "editor"]).optional(),
  adminPermissions: z.array(permissionSchema).optional(),
  formNotificationFormIds: z.array(z.string().min(1)).optional(),
});

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const current = await storage.users.getUser(paramString(req.params.id));
    if (!current) {
      notFound(res, "User");
      return;
    }
    if (!isSystemUserRole(current.role)) {
      notFound(res, "System user");
      return;
    }

    const parsed = updateUserSchema.parse(req.body);
    if (parsed.email) {
      const existing = await storage.users.getUserByEmail(parsed.email);
      if (existing && existing.id !== current.id) {
        conflict(res, "Email already in use");
        return;
      }
    }

    const merged = normalizeSystemUserPayload({
      role: parsed.role ?? (current.role as "admin" | "editor"),
      adminPermissions: parsed.adminPermissions ?? normalizePermissions(current.adminPermissions),
      formNotificationFormIds:
        parsed.formNotificationFormIds ?? normalizePermissions(current.formNotificationFormIds),
    });

    await ensureAdminGuardrails({ targetUserId: current.id, nextRole: merged.role });

    const validFormIds = await normalizeActiveFormNotificationIds(merged.formNotificationFormIds);
    const updated = await storage.users.updateUser(current.id, {
      ...(parsed.firstName !== undefined && { firstName: parsed.firstName }),
      ...(parsed.lastName !== undefined && { lastName: parsed.lastName }),
      ...(parsed.email !== undefined && { email: parsed.email }),
      role: merged.role,
      adminPermissions: merged.adminPermissions,
      formNotificationFormIds: validFormIds,
    });

    res.json(await toSafeUser(updated!));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = paramString(req.params.id);
    if (userId === req.user!.id) {
      res.status(400).json({ message: "Cannot delete your own account" });
      return;
    }

    const user = await storage.users.getUser(userId);
    if (!user) {
      notFound(res, "User");
      return;
    }
    if (!isSystemUserRole(user.role)) {
      notFound(res, "System user");
      return;
    }

    await ensureAdminGuardrails({ targetUserId: userId, deleting: true });
    await storage.users.deleteUser(userId);
    res.json({ message: "User deleted" });
  }),
);

router.patch(
  "/:id/suspend",
  asyncHandler(async (req, res) => {
    const userId = paramString(req.params.id);
    if (userId === req.user!.id) {
      res.status(400).json({ message: "Cannot suspend your own account" });
      return;
    }

    const user = await storage.users.getUser(userId);
    if (!user) {
      notFound(res, "User");
      return;
    }
    if (!isSystemUserRole(user.role)) {
      notFound(res, "System user");
      return;
    }

    await ensureAdminGuardrails({ targetUserId: userId, suspend: !user.isSuspended });
    const updated = await storage.users.updateUser(userId, { isSuspended: !user.isSuspended });
    res.json(await toSafeUser(updated!));
  }),
);

router.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const user = await storage.users.getUser(paramString(req.params.id));
    if (!user) {
      notFound(res, "User");
      return;
    }
    if (!isSystemUserRole(user.role)) {
      notFound(res, "System user");
      return;
    }

    const { newPassword } = z.object({ newPassword: z.string().min(6).optional() }).parse(req.body);

    if (newPassword) {
      const hashed = await hashPassword(newPassword);
      await storage.users.updateUser(user.id, { password: hashed });
      res.json({ message: "Password reset successfully" });
      return;
    }

    const resetToken = await storage.passwordResets.createToken(user.id);
    const baseUrl = getBaseUrl(req);
    const resetUrl = `${baseUrl}/admin/reset-password?token=${resetToken.token}`;
    sendPasswordResetEmail(user.email, user.firstName, resetUrl).catch((err) =>
      logger.email.warn("Failed to send password reset email", { error: err.message }),
    );
    res.json({ message: "Password reset link sent" });
  }),
);

export default router;
