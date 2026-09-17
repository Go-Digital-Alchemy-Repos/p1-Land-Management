import { Router } from "express";
import { z } from "zod";
import { requireBusinessCapability } from "../middleware/auth";
import { requireEventsEnabled } from "../middleware/site-features";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
import { paramString } from "../utils/params";
import type { EventRegistration } from "@shared/schema";

// Explicit projection: identity links and payment-provider identifiers stay in Core.
function attendee(row: EventRegistration) {
  const {
    id,
    eventId,
    fullName,
    email,
    phone,
    status,
    paymentStatus,
    notes,
    attended,
    checkedInAt,
    registeredAt,
    canceledAt,
  } = row;
  return {
    id,
    eventId,
    fullName,
    email,
    phone,
    status,
    paymentStatus,
    notes,
    attended,
    checkedInAt,
    registeredAt,
    canceledAt,
  };
}
const router = Router();
const access = [requireBusinessCapability("marketing.content.events"), requireEventsEnabled];
router.get(
  "/events/:eventId/attendees",
  ...access,
  asyncHandler(async (req, res) => {
    const eventId = paramString(req.params.eventId);
    if (!(await storage.events.getEvent(eventId))) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json((await storage.eventRegistrations.getRegistrationsByEvent(eventId)).map(attendee));
  }),
);
router.put(
  "/events/:eventId/attendees/:id/checkin",
  ...access,
  asyncHandler(async (req, res) => {
    const { attended } = z.object({ attended: z.boolean() }).strict().parse(req.body);
    const row = await storage.eventRegistrations.setEventAttendance(
      paramString(req.params.eventId),
      paramString(req.params.id),
      attended,
    );
    if (!row) {
      res.status(404).json({ message: "Event attendee not found" });
      return;
    }
    await storage.activity.log(req.user!.id, "event_attendance_updated", row.id);
    res.json(attendee(row));
  }),
);
export default router;
