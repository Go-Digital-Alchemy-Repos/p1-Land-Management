import { describe, expect, it } from "vitest";
import { formatEventListDateLines, isSameEventDay } from "@/lib/event-datetime";

describe("event list date formatting", () => {
  it("treats start and end on the same local event day as a single-day event", () => {
    expect(
      isSameEventDay("2026-06-10T14:00:00.000Z", "2026-06-10T16:00:00.000Z", "America/New_York"),
    ).toBe(true);

    expect(
      formatEventListDateLines(
        "2026-06-10T14:00:00.000Z",
        "2026-06-10T16:00:00.000Z",
        "America/New_York",
      ),
    ).toEqual([
      {
        text: "Wed, June 10, 2026 · 10:00 AM — 12:00 PM",
      },
    ]);
  });

  it("renders separate starts and ends lines for multi-day events", () => {
    expect(
      formatEventListDateLines(
        "2026-06-10T23:00:00.000Z",
        "2026-06-12T01:30:00.000Z",
        "America/New_York",
      ),
    ).toEqual([
      {
        label: "Starts",
        text: "Wed, June 10, 2026 at 7:00 PM",
      },
      {
        label: "Ends",
        text: "Thu, June 11, 2026 at 9:30 PM",
      },
    ]);
  });

  it("keeps a single start line when there is no end date", () => {
    expect(formatEventListDateLines("2026-06-10T14:00:00.000Z", null, "America/New_York")).toEqual([
      {
        text: "Wed, June 10, 2026 at 10:00 AM",
      },
    ]);
  });

  it("uses the event timezone when evaluating same-day boundaries near midnight", () => {
    expect(
      isSameEventDay("2026-06-11T03:30:00.000Z", "2026-06-11T05:30:00.000Z", "America/New_York"),
    ).toBe(false);

    expect(
      formatEventListDateLines(
        "2026-06-11T03:30:00.000Z",
        "2026-06-11T05:30:00.000Z",
        "America/New_York",
      ),
    ).toEqual([
      {
        label: "Starts",
        text: "Wed, June 10, 2026 at 11:30 PM",
      },
      {
        label: "Ends",
        text: "Thu, June 11, 2026 at 1:30 AM",
      },
    ]);
  });
});
