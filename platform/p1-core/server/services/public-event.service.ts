import type { Event } from "@shared/schema/events";

const EVENT_ACCESS_FIELDS = [
  "virtualJoinUrl",
  "zoomLink",
  "virtualDialInInfo",
  "recordingUrl",
] as const;

export function canAccessPublicEvent(event: Event, userRole: string | null): boolean {
  if (!event.visibility || event.visibility === "public") return true;
  if (!userRole) return false;
  if (userRole === "admin") return true;
  if (event.visibility === "members_only") return userRole === "therapist" || userRole === "client";
  if (event.visibility === "counselors_only") return userRole === "therapist";
  return false;
}

export function redactEventAccessFields(event: Event): Event {
  const redacted = { ...event } as Event & Record<(typeof EVENT_ACCESS_FIELDS)[number], null>;
  for (const field of EVENT_ACCESS_FIELDS) redacted[field] = null;
  return redacted;
}

export function applyEventAccessEntitlements(
  event: Event,
  access: { canJoin: boolean; canViewRecording: boolean },
): Event {
  const projected = redactEventAccessFields(event);
  if (access.canJoin) {
    projected.virtualJoinUrl = event.virtualJoinUrl;
    projected.zoomLink = event.zoomLink;
    projected.virtualDialInInfo = event.virtualDialInInfo;
  }
  if (access.canViewRecording) projected.recordingUrl = event.recordingUrl;
  return projected;
}
