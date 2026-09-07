export type EventUrlParts = {
  id: string;
  slug?: string | null;
};

export function getEventUrlSegment(event: EventUrlParts): string {
  return event.slug?.trim() || event.id;
}

export function getEventPath(event: EventUrlParts): string {
  return `/events/${getEventUrlSegment(event)}`;
}
