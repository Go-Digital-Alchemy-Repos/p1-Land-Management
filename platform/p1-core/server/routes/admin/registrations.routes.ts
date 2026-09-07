import { requireAdminPermission as p1Authorize } from "../../middleware/auth";
import { Router } from "express";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error-handler";
import { paramString } from "../../utils/params";
import { notFound } from "../../utils/route-helpers";
import { logger } from "../../utils/logger";
import { requireEventsEnabled } from "../../middleware/site-features";
import {
  sendRegistrationConfirmationEmail,
  sendRegistrationCanceledEmail,
} from "../../services/email.service";

const router = Router();

router.get(
  "/events/:id/registrations", p1Authorize("content"),
  requireEventsEnabled,
  asyncHandler(async (req, res) => {
    const eventId = paramString(req.params.id);
    const event = await storage.events.getEvent(eventId);
    if (!event) {
      return notFound(res, "Event");
    }
    const registrations = await storage.eventRegistrations.getRegistrationsByEvent(eventId);
    res.json(registrations);
  }),
);

router.get(
  "/events/:id/registrations/csv", p1Authorize("content"),
  requireEventsEnabled,
  asyncHandler(async (req, res) => {
    const eventId = paramString(req.params.id);
    const event = await storage.events.getEvent(eventId);
    if (!event) {
      return notFound(res, "Event");
    }
    const registrations = await storage.eventRegistrations.getRegistrationsByEvent(eventId);

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Status",
      "Payment Status",
      "Amount Paid",
      "Registered At",
      "Canceled At",
      "Notes",
    ];
    const rows = registrations.map((r) => [
      escapeCsv(r.fullName),
      escapeCsv(r.email),
      escapeCsv(r.phone || ""),
      escapeCsv(r.status),
      escapeCsv(r.paymentStatus || ""),
      escapeCsv(r.amountPaid ? (r.amountPaid / 100).toFixed(2) : "0.00"),
      escapeCsv(r.registeredAt ? new Date(r.registeredAt).toISOString() : ""),
      escapeCsv(r.canceledAt ? new Date(r.canceledAt).toISOString() : ""),
      escapeCsv(r.notes || ""),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `registrations-${event.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

router.put(
  "/registrations/:id/checkin", p1Authorize("content"),
  requireEventsEnabled,
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const { attended } = req.body;

    if (typeof attended !== "boolean") {
      return res.status(400).json({ message: "attended must be a boolean" });
    }

    const registration = await storage.eventRegistrations.checkInRegistration(id, attended);
    if (!registration) {
      return notFound(res, "Registration");
    }

    res.json(registration);
  }),
);

router.put(
  "/registrations/:id/status", p1Authorize("content"),
  requireEventsEnabled,
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const { status } = req.body;

    if (!status || !["confirmed", "waitlisted", "canceled"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Invalid status. Must be: confirmed, waitlisted, or canceled" });
    }

    const registration = await storage.eventRegistrations.getRegistration(id);
    if (!registration) {
      return notFound(res, "Registration");
    }

    const previousStatus = registration.status;

    let updated;
    if (status === "canceled") {
      updated = await storage.eventRegistrations.cancelRegistration(id);
    } else {
      updated = await storage.eventRegistrations.updateRegistrationStatus(id, status);
    }

    if (previousStatus !== status) {
      const event = await storage.events.getEvent(registration.eventId);
      if (event) {
        if (status === "confirmed" && previousStatus === "waitlisted") {
          sendRegistrationConfirmationEmail(
            registration.email,
            registration.fullName.split(" ")[0],
            event.title,
            new Date(event.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            event.locationName || event.location || (event.isVirtual ? "Virtual" : null),
          ).catch((err) => {
            logger.email.warn("Failed to send promotion email", {
              error: err instanceof Error ? err.message : String(err),
            });
          });
        } else if (status === "canceled") {
          sendRegistrationCanceledEmail(
            registration.email,
            registration.fullName.split(" ")[0],
            event.title,
          ).catch((err) => {
            logger.email.warn("Failed to send admin cancellation email", {
              error: err instanceof Error ? err.message : String(err),
            });
          });

          if (previousStatus === "confirmed" && event.waitlistEnabled) {
            const nextWaitlisted = await storage.eventRegistrations.getFirstWaitlisted(
              registration.eventId,
            );
            if (nextWaitlisted) {
              await storage.eventRegistrations.updateRegistrationStatus(
                nextWaitlisted.id,
                "confirmed",
              );
              sendRegistrationConfirmationEmail(
                nextWaitlisted.email,
                nextWaitlisted.fullName.split(" ")[0],
                event.title,
                new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
                event.locationName || event.location || (event.isVirtual ? "Virtual" : null),
              ).catch((err) => {
                logger.email.warn("Failed to send waitlist promotion email", {
                  error: err instanceof Error ? err.message : String(err),
                });
              });
            }
          }
        }
      }
    }

    res.json(updated);
  }),
);

router.delete(
  "/registrations/:id", p1Authorize("content"),
  requireEventsEnabled,
  asyncHandler(async (req, res) => {
    const id = paramString(req.params.id);
    const registration = await storage.eventRegistrations.getRegistration(id);
    if (!registration) {
      return notFound(res, "Registration");
    }

    await storage.eventRegistrations.deleteRegistration(id);

    if (registration.status === "confirmed") {
      const event = await storage.events.getEvent(registration.eventId);
      if (event?.waitlistEnabled) {
        const nextWaitlisted = await storage.eventRegistrations.getFirstWaitlisted(
          registration.eventId,
        );
        if (nextWaitlisted) {
          await storage.eventRegistrations.updateRegistrationStatus(nextWaitlisted.id, "confirmed");
          sendRegistrationConfirmationEmail(
            nextWaitlisted.email,
            nextWaitlisted.fullName.split(" ")[0],
            event.title,
            new Date(event.date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            event.locationName || event.location || (event.isVirtual ? "Virtual" : null),
          ).catch((err) => {
            logger.email.warn("Failed to send waitlist promotion email", {
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }
    }

    res.json({ message: "Registration removed" });
  }),
);

export default router;
