import type { PropertyTimelineEvent } from "../../../../lib/api-client-react/src/dashboard/models/propertyTimelineEvent";

const eventKinds: Record<PropertyTimelineEvent["kind"], string> = {
  note: "Field note",
  issue: "Reported issue",
  time: "Work time",
  checklist: "Checklist update",
  complete: "Completion update",
  inspection: "Inspection",
};

/**
 * Keep the native property view constrained to the explicit, supported event
 * fields. In particular, it must never enumerate or serialize JSON payloads,
 * which can contain private operational details from historical events.
 */
export function presentPropertyUpdate(event: PropertyTimelineEvent) {
  const title = event.title.trim() || eventKinds[event.kind];
  const text = event.payload.text;

  return {
    title,
    kind: eventKinds[event.kind],
    capturedAt: event.captured_at,
    note: typeof text === "string" && text.trim() ? text.trim() : null,
    conflict: event.conflict,
  };
}

export function formatPropertyTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

export function isPreviewableImage(mime: string) {
  return mime.toLowerCase().startsWith("image/");
}
