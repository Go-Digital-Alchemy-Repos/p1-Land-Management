import { Router } from "express";
import { storage } from "../storage/index";
import { asyncHandler } from "../middleware/error-handler";
import { paramString } from "../utils/params";
import { logger } from "../utils/logger";
import { z } from "zod";
import { sendRegistrationConfirmationEmail, sendWaitlistEmail } from "../services/email.service";
import { submitManagedFormById } from "../services/forms.service";

import type { Event } from "@shared/schema/events";

const router = Router();

const guestRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Valid email is required").max(255),
  formData: z.record(z.unknown()).optional(),
});

function canGuestAccessEvent(event: Event): boolean {
  if (!event.visibility || event.visibility === "public") return true;
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
  "/:id/register-guest",
  asyncHandler(async (req, res) => {
    const eventId = paramString(req.params.id);

    const parsed = guestRegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }

    const { firstName, lastName } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const event = await storage.events.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.status !== "published") {
      return res.status(400).json({ message: "Event is not available for registration" });
    }
    if (!canGuestAccessEvent(event)) {
      return res.status(403).json({ message: "This event requires an account to register" });
    }
    if (!event.registrationEnabled) {
      return res.status(400).json({ message: "Registration is not enabled for this event" });
    }
    if (event.registrationType !== "free") {
      return res.status(400).json({
        message:
          "Guest registration is only available for free events. Please log in to register for paid events.",
      });
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

    const existing = await storage.eventRegistrations.getRegistrationByEventAndEmail(
      eventId,
      email,
    );
    if (existing && existing.status !== "canceled") {
      return res.status(409).json({ message: "This email is already registered for this event" });
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
      await submitManagedFormById(event.registrationFormId, parsed.data.formData ?? {}, {
        source: `event:${eventId}`,
      });
    }

    const fullName = `${firstName} ${lastName}`;

    let registration;
    if (existing && existing.status === "canceled") {
      registration = await storage.eventRegistrations.updateRegistration(existing.id, {
        status,
        fullName,
        email,
        canceledAt: null,
      });
    } else {
      registration = await storage.eventRegistrations.createRegistration({
        eventId,
        userId: null,
        fullName,
        email,
        status,
        paymentStatus: "not_required",
      });
    }

    const eventLocation =
      event.locationName || event.location || (event.isVirtual ? "Virtual" : null);
    const eventDate = formatEventDate(event.date);

    if (status === "confirmed") {
      sendRegistrationConfirmationEmail(
        email,
        firstName,
        event.title,
        eventDate,
        eventLocation,
        event,
      ).catch((err) => {
        logger.email.warn("Failed to send guest registration confirmation", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } else if (status === "waitlisted") {
      sendWaitlistEmail(email, firstName, event.title, eventDate, event).catch((err) => {
        logger.email.warn("Failed to send guest waitlist email", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    res.status(201).json(registration);
  }),
);

export default router;
