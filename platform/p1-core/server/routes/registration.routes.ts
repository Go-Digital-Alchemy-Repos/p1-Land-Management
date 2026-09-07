import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { authenticateToken } from "../middleware/auth";
import { paramString } from "../utils/params";
import { logger } from "../utils/logger";
import {
  sendRegistrationConfirmationEmail,
  sendWaitlistEmail,
  sendRegistrationCanceledEmail,
} from "../services/email.service";
import { submitManagedFormById } from "../services/forms.service";

import type { Event } from "@shared/schema/events";

const router = Router();

router.use(authenticateToken);

function canAccessEvent(event: Event, userRole: string | null): boolean {
  if (!event.visibility || event.visibility === "public") return true;
  if (!userRole) return false;
  if (userRole === "admin") return true;
  if (event.visibility === "members_only") return userRole === "therapist" || userRole === "client";
  if (event.visibility === "counselors_only") return userRole === "therapist";
  return false;
}

function formatEventDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

router.post(
  "/:id/register",
  asyncHandler(async (req, res) => {
    const eventId = paramString(req.params.id);
    const userId = req.user!.id;

    const event = await storage.events.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.status !== "published") {
      return res.status(400).json({ message: "Event is not available for registration" });
    }
    if (!canAccessEvent(event, req.user!.role)) {
      return res.status(403).json({ message: "You do not have access to this event" });
    }
    if (!event.registrationEnabled) {
      return res.status(400).json({ message: "Registration is not enabled for this event" });
    }
    if (event.registrationType !== "free") {
      return res.status(400).json({ message: "Paid registration is not yet supported" });
    }

    const now = new Date();
    if (event.registrationOpensAt && new Date(event.registrationOpensAt) > now) {
      return res.status(400).json({ message: "Registration has not opened yet" });
    }
    if (event.registrationClosesAt && new Date(event.registrationClosesAt) < now) {
      return res.status(400).json({ message: "Registration has closed" });
    }
    if (event.date && new Date(event.date) < now) {
      return res.status(400).json({ message: "This event has already occurred" });
    }

    const existing = await storage.eventRegistrations.getRegistrationByEventAndUser(
      eventId,
      userId,
    );
    if (existing && existing.status !== "canceled") {
      return res
        .status(409)
        .json({ message: "You are already registered for this event", registration: existing });
    }

    const user = await storage.users.getUser(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    let status = event.registrationApprovalMode === "manual" ? "pending" : "confirmed";
    if (event.capacity) {
      const confirmedCount = await storage.eventRegistrations.getConfirmedCount(eventId);
      if (confirmedCount >= event.capacity) {
        if (event.waitlistEnabled) {
          status = "waitlisted";
        } else {
          return res.status(400).json({ message: "This event is full" });
        }
      }
    }

    if (event.registrationFormId) {
      await submitManagedFormById(event.registrationFormId, req.body?.formData ?? {}, {
        source: `event:${eventId}`,
      });
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    let registration;
    if (existing && existing.status === "canceled") {
      registration = await storage.eventRegistrations.updateRegistrationStatus(existing.id, status);
    } else {
      registration = await storage.eventRegistrations.createRegistration({
        eventId,
        userId,
        fullName,
        email: user.email,
        status,
        paymentStatus: "not_required",
      });
    }

    const eventLocation =
      event.locationName || event.location || (event.isVirtual ? "Virtual" : null);
    const eventDate = formatEventDate(event.date);

    if (status === "confirmed") {
      sendRegistrationConfirmationEmail(
        user.email,
        user.firstName,
        event.title,
        eventDate,
        eventLocation,
        event,
      ).catch((err) => {
        logger.email.warn("Failed to send registration confirmation", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } else if (status === "waitlisted") {
      sendWaitlistEmail(user.email, user.firstName, event.title, eventDate, event).catch((err) => {
        logger.email.warn("Failed to send waitlist email", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    res.status(201).json(registration);
  }),
);

router.get(
  "/:id/registration",
  asyncHandler(async (req, res) => {
    const eventId = paramString(req.params.id);
    const userId = req.user!.id;

    const registration = await storage.eventRegistrations.getRegistrationByEventAndUser(
      eventId,
      userId,
    );
    if (!registration || registration.status === "canceled") {
      return res.status(404).json({ message: "No active registration found" });
    }
    res.json(registration);
  }),
);

router.delete(
  "/:id/registration",
  asyncHandler(async (req, res) => {
    const eventId = paramString(req.params.id);
    const userId = req.user!.id;

    const registration = await storage.eventRegistrations.getRegistrationByEventAndUser(
      eventId,
      userId,
    );
    if (!registration || registration.status === "canceled") {
      return res.status(404).json({ message: "No active registration found" });
    }

    await storage.eventRegistrations.cancelRegistration(registration.id);

    const event = await storage.events.getEvent(eventId);
    const user = await storage.users.getUser(userId);

    if (event && user) {
      sendRegistrationCanceledEmail(user.email, user.firstName, event.title).catch((err) => {
        logger.email.warn("Failed to send cancellation email", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    if (registration.status === "confirmed" && event?.waitlistEnabled) {
      const nextWaitlisted = await storage.eventRegistrations.getFirstWaitlisted(eventId);
      if (nextWaitlisted) {
        await storage.eventRegistrations.updateRegistrationStatus(nextWaitlisted.id, "confirmed");
        sendRegistrationConfirmationEmail(
          nextWaitlisted.email,
          nextWaitlisted.fullName.split(" ")[0],
          event.title,
          formatEventDate(event.date),
          event.locationName || event.location || (event.isVirtual ? "Virtual" : null),
          event,
        ).catch((err) => {
          logger.email.warn("Failed to send waitlist promotion email", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    }

    res.json({ message: "Registration canceled" });
  }),
);

export default router;
