import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import EventManager from "../src/marketing/EventManager";
const state = vi.hoisted(() => ({
  api: Object.fromEntries(
    [
      "listMarketingEvents",
      "getMarketingEvent",
      "createMarketingEvent",
      "updateMarketingEvent",
      "duplicateMarketingEvent",
      "listMarketingEventAttendees",
      "setMarketingEventAttendance",
    ].map((x) => [x, vi.fn()]),
  ),
}));
vi.mock("@workspace/api-client-react/dashboard", () => state.api);
vi.mock("../src/marketing/useCmsUnsavedChanges", () => ({
  useCmsUnsavedChanges: vi.fn(),
}));
vi.mock("../src/marketing/CmsRichTextEditor", () => ({
  CmsRichTextEditor: ({ value, onChange }: any) => (
    <textarea
      aria-label="Event description"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
vi.mock("../src/marketing/MediaLibrary", () => ({
  MediaLibrary: () => <p>Media library</p>,
}));
vi.mock("../src/marketing/EventReferences", () => ({
  EventReferences: () => null,
}));
vi.mock("../src/marketing/EventRegistrationSettings", () => ({
  EventRegistrationSettings: () => <p>Registration controls</p>,
}));

vi.mock("../src/marketing/EventDirectoryManager", () => ({
  EventDirectoryManager: () => null,
}));
const fixture = {
  id: "one",
  title: "Workshop",
  date: "2026-11-01T15:00:00Z",
  status: "draft",
  visibility: "public",
  eventType: "workshop",
  category: "education",
  deliveryMode: "in_person",
  imageUrl: "/event.webp",
  speakerBio: "Saved bio",
  speakerImageUrl: "/speaker.webp",
  tags: ["land"],
  recurrencePattern: "weekly",
  isRecurring: true,
  recordingAccess: "paid",
  recordingPrice: 1200,
  futureField: { keep: true },
  createdAt: "2026-01-01",
};
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  vi.clearAllMocks();
  state.api.listMarketingEvents.mockResolvedValue([structuredClone(fixture)]);
  state.api.listMarketingEventAttendees.mockResolvedValue([]);
  state.api.getMarketingEvent.mockResolvedValue(structuredClone(fixture));
  state.api.updateMarketingEvent.mockImplementation(async (_id, body) => ({
    ...body,
    id: "one",
  }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function render() {
  await act(async () => root.render(<EventManager />));
}
async function click(text: string) {
  const button = [...host.querySelectorAll("button")].find(
    (x) => x.textContent?.trim() === text,
  )!;
  expect(button, text).toBeTruthy();
  await act(async () => button.click());
}
async function field(label: string, value: string) {
  const wrapper = [...host.querySelectorAll("label")].find((x) =>
    x.textContent?.startsWith(label),
  );
  const input = (wrapper?.querySelector("input,textarea") ||
    host.querySelector(`[aria-label="${label}"]`)) as HTMLInputElement;
  expect(input, label).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      input.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("reuses image cards/filter toolbar and original tabs/cards", async () => {
  await render();
  expect(
    host.querySelector('[data-testid="admin-events-filter-toolbar"]'),
  ).toBeTruthy();
  expect(host.querySelector("img")?.getAttribute("src")).toBe(
    "https://www.p1landmanagement.com/event.webp",
  );
  await click("Edit Workshop");
  for (const text of [
    "Details",
    "Registrants",
    "Video Archive",
    "Recurring",
    "Basic Info",
    "Schedule",
    "Speaker / Host",
  ])
    expect(host.textContent).toContain(text);
  expect(
    host.querySelector('[data-testid="image-position-picker"]'),
  ).toBeTruthy();
  expect(host.textContent).not.toContain("Choose event image");
  await click("Registrants");
  expect(host.textContent).toContain("No matching attendees.");
});
it("preserves unsupported access/recurrence and unknown fields when editing speaker and focal point", async () => {
  await render();
  await click("Edit Workshop");
  await field("Speaker Bio", "Updated bio");
  await click("Top Left");
  await click("Save event");
  const payload = state.api.updateMarketingEvent.mock.calls[0][1];
  expect(payload).toMatchObject({
    speakerBio: "Updated bio",
    imagePositionX: 0,
    imagePositionY: 0,
    recordingAccess: "paid",
    recordingPrice: 1200,
    recurrencePattern: "weekly",
    futureField: { keep: true },
  });
});
it("does not enable recurrence or payment controls and preserves failed-save draft", async () => {
  state.api.updateMarketingEvent.mockRejectedValue(new Error("Offline"));
  await render();
  await click("Edit Workshop");
  await field("Title", "Draft retained");
  await click("Recurring");
  expect(host.textContent).toContain("generation is not available");
  await click("Video Archive");
  expect(host.textContent).toContain("entitlement controls are not available");
  await click("Save event");
  expect(host.textContent).toContain("Offline");
  await click("Details");
  expect(
    (host.querySelector("input[required]") as HTMLInputElement).value,
  ).toBe("Draft retained");
});
it("serializes saves and blocks pending field changes", async () => {
  let resolve: (v: any) => void = () => {};
  state.api.updateMarketingEvent.mockReturnValue(
    new Promise((r) => (resolve = r)),
  );
  await render();
  await click("Edit Workshop");
  await click("Save event");
  expect(host.querySelector("fieldset")?.disabled).toBe(true);
  await field("Speaker Bio", "Should not apply");
  expect(state.api.updateMarketingEvent).toHaveBeenCalledTimes(1);
  await act(async () => resolve(fixture));
});
it("filters cards by type and keeps pending drafts when discard is declined", async () => {
  await render();
  const select = host.querySelector(
    '[aria-label="Filter type"]',
  ) as HTMLSelectElement;
  await act(async () => {
    select.value = "conference";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(host.textContent).toContain("Showing 0 of 1");
  await click("Clear");
  await click("Edit Workshop");
  await field("Title", "Unsaved");
  vi.mocked(window.confirm).mockReturnValue(false);
  await click("Cancel");
  expect(
    (host.querySelector("input[required]") as HTMLInputElement).value,
  ).toBe("Unsaved");
});
it("retains comma-separated tag entry while typing and saves parsed tags", async () => {
  await render();
  await click("Edit Workshop");
  await field("Tags", "land, ");
  const label = [...host.querySelectorAll("label")].find((x) =>
    x.textContent?.startsWith("Tags"),
  )!;
  expect(label.querySelector("input")?.value).toBe("land, ");
  await field("Tags", "land, drainage");
  await click("Save event");
  expect(state.api.updateMarketingEvent.mock.calls[0][1].tags).toEqual([
    "land",
    "drainage",
  ]);
});

it("embedded attendee actions never submit the event and fence navigation while saving", async () => {
  state.api.listMarketingEventAttendees.mockResolvedValue([
    {
      id: "attendee",
      fullName: "Test Person",
      email: "test@example.test",
      status: "confirmed",
      attended: false,
      registeredAt: null,
    },
  ]);
  let resolve: (v: any) => void = () => {};
  state.api.setMarketingEventAttendance.mockReturnValue(
    new Promise((r) => (resolve = r)),
  );
  await render();
  await click("Edit Workshop");
  await click("Registrants");
  await click("Refresh attendees");
  expect(state.api.updateMarketingEvent).not.toHaveBeenCalled();
  await click("Mark attended · Test Person");
  expect(state.api.setMarketingEventAttendance).toHaveBeenCalledTimes(1);
  expect(state.api.updateMarketingEvent).not.toHaveBeenCalled();
  await click("Details");
  expect(host.textContent).toContain("Test Person");
  const cancel = [...host.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === "Cancel",
  )!;
  expect(cancel.disabled).toBe(true);
  await act(async () =>
    resolve({
      id: "attendee",
      fullName: "Test Person",
      email: "test@example.test",
      status: "confirmed",
      attended: true,
      registeredAt: null,
    }),
  );
  expect(host.textContent).toContain("Attendance updated for Test Person");
  await click("Details");
  expect(host.textContent).toContain("Speaker / Host");
});
