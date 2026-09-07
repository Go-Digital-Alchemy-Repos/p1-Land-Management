import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import { optionalAuth, authenticateToken } from "../middleware/auth";
import type { Event } from "@shared/schema/events";
import * as r2Service from "../services/r2.service";
import {
  applyEventAccessEntitlements,
  canAccessPublicEvent,
  redactEventAccessFields,
} from "../services/public-event.service";

const router = Router();

async function normalizeEventImage(event: Event): Promise<Event> {
  return {
    ...event,
    imageUrl: (await r2Service.normalizePublicUrl(event.imageUrl)) ?? null,
  };
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const eventsList = await storage.events.getUpcomingEvents();
    res.json(
      await Promise.all(
        eventsList.map((event) => normalizeEventImage(redactEventAccessFields(event))),
      ),
    );
  }),
);

router.get(
  "/all",
  asyncHandler(async (_req, res) => {
    const eventsList = await storage.events.getPublishedEvents();
    res.json(
      await Promise.all(
        eventsList.map((event) => normalizeEventImage(redactEventAccessFields(event))),
      ),
    );
  }),
);

router.get(
  "/recordings",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const eventsList = await storage.events.getRecordingEvents();
    const userRole = req.user?.role ?? null;
    const userId = req.user?.id ?? null;

    let purchasedEventIds = new Set<string>();
    if (userId) {
      const purchases = await storage.recordingPurchases.getByUser(userId);
      purchasedEventIds = new Set(
        purchases.filter((p) => p.stripePaymentIntentId).map((p) => p.eventId),
      );
    }

    const filtered = eventsList
      .filter((event) => canAccessPublicEvent(event, userRole))
      .map((event) =>
        applyEventAccessEntitlements(event, {
          canJoin: false,
          canViewRecording:
            userRole === "admin" ||
            event.recordingAccess !== "paid" ||
            !event.recordingPrice ||
            purchasedEventIds.has(event.id),
        }),
      );
    res.json(await Promise.all(filtered.map(normalizeEventImage)));
  }),
);

router.get(
  "/recordings/my-purchases",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const purchases = await storage.recordingPurchases.getByUser(req.user!.id);
    res.json(purchases);
  }),
);

router.get(
  "/recordings/:eventId/purchase-status",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const eventId = paramString(req.params.eventId);
    const purchase = await storage.recordingPurchases.getByUserAndEvent(req.user!.id, eventId);
    res.json({
      purchased: !!(purchase && purchase.stripePaymentIntentId),
      pending: !!(purchase && !purchase.stripePaymentIntentId && purchase.stripeCheckoutSessionId),
    });
  }),
);

router.get(
  "/:id/registration-form",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const event = await storage.events.getEventByIdentifier(id);
    if (
      !event ||
      event.status === "draft" ||
      event.status === "archived" ||
      !event.registrationFormId
    ) {
      return res.status(404).json({ message: "Form not found" });
    }
    const userRole = req.user?.role ?? null;
    if (!canAccessPublicEvent(event, userRole)) {
      return res.status(403).json({ message: "You do not have access to this form" });
    }
    const form = await storage.forms.getPublicById(event.registrationFormId);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    res.json(form);
  }),
);

router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const event = await storage.events.getEventByIdentifier(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.status === "draft" || event.status === "archived") {
      return res.status(404).json({ message: "Event not found" });
    }
    const userRole = req.user?.role ?? null;
    if (!canAccessPublicEvent(event, userRole)) {
      return res.status(404).json({ message: "Event not found" });
    }

    const isAdmin = userRole === "admin";
    let canJoin = isAdmin;
    let canViewRecording = isAdmin || event.recordingAccess !== "paid";
    if (req.user && !isAdmin) {
      const [registration, purchase] = await Promise.all([
        storage.eventRegistrations.getRegistrationByEventAndUser(event.id, req.user.id),
        storage.recordingPurchases.getByUserAndEvent(req.user.id, event.id),
      ]);
      canJoin = Boolean(
        registration?.status === "confirmed" &&
        (event.registrationType !== "paid" || registration.paymentStatus === "paid"),
      );
      canViewRecording = canViewRecording || Boolean(purchase?.stripePaymentIntentId);
    }

    res.json(
      await normalizeEventImage(applyEventAccessEntitlements(event, { canJoin, canViewRecording })),
    );
  }),
);

export default router;
