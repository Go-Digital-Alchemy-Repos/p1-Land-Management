import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatPropertyTimestamp,
  isPreviewableImage,
  presentPropertyUpdate,
} from "../src/screens/property-presentation.ts";

test("property update presentation exposes only explicit event fields", () => {
  const update = presentPropertyUpdate({
    id: "event-1",
    kind: "inspection",
    title: "  Pond inspection  ",
    captured_at: "2026-09-07T12:00:00.000Z",
    published: true,
    conflict: false,
    payload: {
      text: "  Inlet clear.  ",
      privateEstimate: "do not display",
      accessCode: "do not display",
    },
  });

  assert.deepEqual(update, {
    title: "Pond inspection",
    kind: "Inspection",
    capturedAt: "2026-09-07T12:00:00.000Z",
    note: "Inlet clear.",
    conflict: false,
  });
});

test("property update presentation has safe fallbacks and image detection", () => {
  const update = presentPropertyUpdate({
    id: "event-2",
    kind: "issue",
    title: " ",
    captured_at: "not-a-date",
    published: false,
    conflict: true,
    payload: { detail: "never displayed" },
  });

  assert.equal(update.title, "Reported issue");
  assert.equal(update.note, null);
  assert.equal(formatPropertyTimestamp(update.capturedAt), "Date unavailable");
  assert.equal(isPreviewableImage("image/jpeg"), true);
  assert.equal(isPreviewableImage("application/pdf"), false);
});
