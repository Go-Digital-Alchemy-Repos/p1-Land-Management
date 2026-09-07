import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";

const router = Router();
router.use(authenticateToken);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const notifs = await storage.notifications.getForUser(userId);
    res.json(notifs);
  }),
);

router.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const count = await storage.notifications.getUnreadCount(userId);
    res.json({ count });
  }),
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    await storage.notifications.markAllRead(userId);
    res.json({ ok: true });
  }),
);

router.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    await storage.notifications.markRead(Number(req.params.id), userId);
    res.json({ ok: true });
  }),
);

router.get(
  "/preferences",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const prefs = await storage.notifications.getPreferences(userId);
    res.json(prefs);
  }),
);

const prefsSchema = z.object({
  emailNewMessage: z.boolean().optional(),
  inAppNewMessage: z.boolean().optional(),
});

router.put(
  "/preferences",
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const body = prefsSchema.parse(req.body);
    const prefs = await storage.notifications.updatePreferences(userId, body);
    res.json(prefs);
  }),
);

export default router;
