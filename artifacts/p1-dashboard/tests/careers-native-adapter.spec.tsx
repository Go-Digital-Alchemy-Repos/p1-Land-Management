import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import CareerManager from "../src/marketing/CareerManager";
const state = vi.hoisted(() => ({
  api: Object.fromEntries(
    [
      "listMarketingCareerJobs",
      "getMarketingCareerJob",
      "createMarketingCareerJob",
      "updateMarketingCareerJob",
      "deleteMarketingCareerJob",
      "listMarketingCareerApplications",
      "getMarketingCareerApplication",
      "updateMarketingCareerApplication",
      "downloadMarketingCareerResume",
      "getMarketingCareerSettings",
      "updateMarketingCareerSettings",
    ].map((name) => [name, vi.fn()]),
  ),
}));
vi.mock("@workspace/api-client-react/dashboard", () => state.api);
vi.mock("../src/marketing/CmsRichTextEditor", () => ({
  CmsRichTextEditor: ({ value, onChange, label }: any) => (
    <textarea
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
vi.mock("../src/marketing/MediaLibrary", () => ({ MediaLibrary: () => null }));
let host: HTMLDivElement, root: Root;
const job = {
  id: "job1",
  title: "Field operator",
  slug: "field-operator",
  status: "draft",
  visibility: "public",
  employmentType: "full_time",
  workMode: "on_site",
  department: "Operations",
  location: "SC",
  publishedAt: "2026-09-01T12:30:00.000Z",
  closesAt: "2026-10-01T22:00:00.000Z",
  updatedAt: "2026-09-19T10:00:00.000Z",
  integrationMetadata: { retained: true },
};
const application = {
  id: "a1",
  firstName: "Example",
  lastName: "Applicant",
  email: "example@example.test",
  status: "submitted",
  createdAt: "2026-09-18T12:00:00Z",
  updatedAt: "2026-09-19T12:00:00Z",
  job: { title: "Field operator" },
  notes: [],
};
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  state.api.listMarketingCareerJobs.mockResolvedValue([job]);
  state.api.getMarketingCareerJob.mockResolvedValue(job);
  state.api.listMarketingCareerApplications.mockResolvedValue([application]);
  state.api.getMarketingCareerApplication.mockResolvedValue(application);
  state.api.updateMarketingCareerJob.mockImplementation(async (_id, value) => ({
    ...job,
    ...value,
  }));
  state.api.getMarketingCareerSettings.mockResolvedValue({
    version: "v1",
    sharing: { enabled: true },
    integrations: {},
    credentialStatus: {},
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function mount(owner = false) {
  await act(async () => root.render(<CareerManager isOwner={owner} />));
}
async function click(name: string) {
  const b = Array.from(host.querySelectorAll("button")).find(
    (b) =>
      b.textContent?.trim() === name || b.getAttribute("aria-label") === name,
  );
  expect(b).toBeTruthy();
  await act(async () => b!.click());
}
async function setInput(selector: string, value: string) {
  const el = host.querySelector<HTMLInputElement>(selector)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      el.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("restores job table/dialog and preserves UTC dates and retained metadata", async () => {
  await mount();
  expect(host.querySelector("table")).toBeTruthy();
  await click("Edit Field operator");
  expect(host.querySelector("dialog[open]")).toBeTruthy();
  expect(
    host.querySelector<HTMLInputElement>("input[type=datetime-local]")?.value,
  ).toBe("2026-09-01T12:30");
  await setInput("input[required]", "New title");
  await click("Save job");
  expect(state.api.updateMarketingCareerJob).toHaveBeenCalledWith(
    "job1",
    expect.objectContaining({
      title: "New title",
      publishedAt: job.publishedAt,
      closesAt: job.closesAt,
      integrationMetadata: { retained: true },
      expectedUpdatedAt: job.updatedAt,
    }),
  );
});
it("guards Escape and retains input after a conflict", async () => {
  await mount();
  await click("Edit Field operator");
  await setInput("input[required]", "Unsaved");
  vi.mocked(window.confirm).mockReturnValue(false);
  await act(async () =>
    host
      .querySelector("dialog")!
      .dispatchEvent(new Event("cancel", { cancelable: true })),
  );
  expect(host.querySelector("dialog")).toBeTruthy();
  state.api.updateMarketingCareerJob.mockRejectedValueOnce({
    data: { message: "Conflict" },
    status: 409,
  });
  await click("Save job");
  expect(host.textContent).toContain("Conflict");
  expect(host.querySelector<HTMLInputElement>("input[required]")?.value).toBe(
    "Unsaved",
  );
});
it("prevents duplicate creation after uncertain response", async () => {
  await mount();
  await click("New job");
  await setInput("input[required]", "A new role");
  state.api.createMarketingCareerJob.mockRejectedValueOnce(
    Error("Lost response"),
  );
  await click("Create job");
  expect(host.textContent).toContain("creation result is uncertain");
  await click("Create job");
  expect(state.api.createMarketingCareerJob).toHaveBeenCalledTimes(1);
});
it("keeps application table visible alongside review and preserves notes after résumé denial", async () => {
  await mount();
  await click("Applications");
  await click("Example Applicant");
  expect(host.querySelector("table")).toBeTruthy();
  expect(host.textContent).toContain("Application Detail");
  await setInput('textarea[aria-label="Review note"]', "Local note");
  state.api.downloadMarketingCareerResume.mockRejectedValueOnce({
    status: 403,
  });
  await click("Download resume");
  expect(host.textContent).toContain("Your access has changed");
  expect(
    host.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Review note"]',
    )?.value,
  ).toBe("Local note");
  state.api.updateMarketingCareerApplication.mockRejectedValueOnce(
    Error("Conflict"),
  );
  await click("Save review");
  expect(state.api.updateMarketingCareerApplication).toHaveBeenCalledWith(
    "a1",
    expect.objectContaining({
      note: "Local note",
      expectedUpdatedAt: application.updatedAt,
    }),
  );
  expect(
    host.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Review note"]',
    )?.value,
  ).toBe("Local note");
});
it("keeps settings owner gated and renders original grouping for owner", async () => {
  await mount();
  expect(host.textContent).not.toContain("Careers settings");
  await act(async () => root.render(<CareerManager isOwner />));
  await click("Careers settings");
  expect(host.textContent).toContain("Share Options");
  expect(host.textContent).toContain("Integrations");
  expect(host.querySelectorAll("input[type=password]").length).toBeGreaterThan(
    0,
  );
});
it("requires discard confirmation before selecting another applicant", async () => {
  state.api.listMarketingCareerApplications.mockResolvedValueOnce([
    application,
    { ...application, id: "a2", firstName: "Second" },
  ]);
  await mount();
  await click("Applications");
  await click("Example Applicant");
  await setInput('textarea[aria-label="Review note"]', "Keep this note");
  vi.mocked(window.confirm).mockReturnValue(false);
  await click("Second Applicant");
  expect(state.api.getMarketingCareerApplication).toHaveBeenCalledTimes(1);
  expect(
    host.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Review note"]',
    )?.value,
  ).toBe("Keep this note");
});
