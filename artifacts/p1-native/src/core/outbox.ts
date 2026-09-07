import type { FieldOperation } from "@workspace/api-zod/dashboard";
export type OutboxState = "pending" | "conflict";
export type OutboxCursor = {
  capturedAt: string;
  id: string;
  kind: "operation" | "photo";
};
export type OutboxItem = OutboxCursor & {
  targetId: string;
  state: OutboxState;
  label: string;
  summary: string;
};
export type OutboxPage = {
  items: OutboxItem[];
  nextCursor: OutboxCursor | null;
  total: number;
  pending: number;
  conflicts: number;
};
export const OUTBOX_PAGE_SIZE = 50;
export type OutboxRecord =
  | { kind: "operation"; state: OutboxState; operation: FieldOperation }
  | {
      kind: "photo";
      state: OutboxState;
      photo: {
        id: string;
        workOrderId: string;
        capturedAt: string;
        classification: string;
      };
    };
const excerpt = (text: string) =>
  text.length > 320 ? text.slice(0, 320) + "…" : text;
/** Explicit fields only: no raw persisted JSON, credentials, or image bytes. */
export function outboxItem(record: OutboxRecord): OutboxItem {
  if (!["pending", "conflict"].includes(record.state))
    throw new Error("Saved item has an unsupported state.");
  if (record.kind === "photo")
    return {
      kind: "photo",
      id: record.photo.id,
      targetId: record.photo.workOrderId,
      capturedAt: record.photo.capturedAt,
      state: record.state,
      label: "Photo",
      summary: "Saved photo · " + record.photo.classification,
    };
  const event = record.operation;
  let label: string, summary: string;
  switch (event.kind) {
    case "note":
      label = "Note";
      summary = excerpt(event.payload.text || "");
      break;
    case "issue":
      label = "Issue";
      summary = excerpt(event.payload.text || "");
      break;
    case "time":
      label = "Time entry";
      summary = "Recorded action: " + event.payload.action;
      break;
    case "checklist":
      label = "Checklist";
      summary = `${event.payload.items?.filter((item) => item.done).length || 0} of ${event.payload.items?.length || 0} items checked`;
      break;
    case "complete":
      label = "Completion request";
      summary =
        "Submitted locally for office review; acceptance is not yet confirmed.";
      break;
  }
  return {
    kind: "operation",
    id: event.id,
    targetId: event.workOrderId,
    capturedAt: event.capturedAt,
    state: record.state,
    label,
    summary,
  };
}
export function validateOutboxCursor(cursor: OutboxCursor | null) {
  if (
    cursor &&
    (typeof cursor.capturedAt !== "string" ||
      !Number.isFinite(Date.parse(cursor.capturedAt)) ||
      typeof cursor.id !== "string" ||
      !cursor.id ||
      !["operation", "photo"].includes(cursor.kind))
  )
    throw new Error("Saved queue cursor is invalid. Refresh the outbox.");
}
