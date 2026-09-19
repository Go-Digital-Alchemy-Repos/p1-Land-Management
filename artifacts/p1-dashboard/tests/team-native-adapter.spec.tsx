import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import TeamManager from "../src/marketing/TeamManager";
const state = vi.hoisted(() => ({
  api: Object.fromEntries(
    [
      "listMarketingTeam",
      "createMarketingTeam",
      "updateMarketingTeam",
      "uploadMarketingMedia",
    ].map((name) => [name, vi.fn()]),
  ),
}));
vi.mock("@workspace/api-client-react/dashboard", () => state.api);
vi.mock("../src/marketing/CmsRichTextEditor", () => ({
  CmsRichTextEditor: ({ value, onChange, disabled }: any) => (
    <textarea
      aria-label="Full biography"
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
vi.mock("../src/marketing/MediaLibrary", () => ({
  MediaLibrary: ({ onSelect }: any) => (
    <button
      onClick={() =>
        onSelect({
          url: "/selected.png",
          alt: "Selected photo",
          mimeType: "image/png",
        })
      }
    >
      Select library photo
    </button>
  ),
}));
vi.mock("../src/marketing/useCmsUnsavedChanges", () => ({
  useCmsUnsavedChanges: vi.fn(),
}));
let host: HTMLDivElement, root: Root;
const member = {
  id: "member1",
  name: "Example Person",
  role: "Field team",
  biography: "Plain biography",
  excerpt: "Summary",
  photoUrl: "/photo.png",
  photoAlt: "Portrait",
  status: "draft",
};
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  state.api.listMarketingTeam.mockResolvedValue([member]);
  state.api.updateMarketingTeam.mockResolvedValue(member);
  state.api.createMarketingTeam.mockResolvedValue(member);
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
async function mount(media = false) {
  await act(async () => root.render(<TeamManager canUseMedia={media} />));
}
async function click(name: string) {
  const button = Array.from(host.querySelectorAll("button")).find(
    (b) =>
      b.getAttribute("aria-label") === name || b.textContent?.trim() === name,
  );
  expect(button).toBeTruthy();
  await act(async () => button!.click());
}
async function field(selector: string, value: string) {
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
it("shows original cards and opens the retained field layout in a named dialog", async () => {
  await mount();
  expect(host.querySelector("h1")?.textContent).toBe("Team");
  await click("Edit Example Person");
  expect(
    host.querySelector("dialog[open]")?.getAttribute("aria-labelledby"),
  ).toBe("team-dialog-title");
  expect(host.textContent).toContain("Edit Team Member");
  expect(host.querySelector<HTMLInputElement>("#team-role")?.value).toBe(
    "Field team",
  );
  expect(
    host.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Full biography"]',
    )?.value,
  ).toBe("<p>Plain biography</p>");
  expect(host.textContent).not.toContain("Pick from library");
});
it("retains dirty input after canceled close and failed save", async () => {
  await mount();
  await click("Edit Example Person");
  await field("#team-name", "Local name");
  vi.mocked(window.confirm).mockReturnValue(false);
  await click("Cancel");
  expect(host.querySelector<HTMLInputElement>("#team-name")?.value).toBe(
    "Local name",
  );
  state.api.updateMarketingTeam.mockRejectedValueOnce(Error("Save failed"));
  await click("Save Member");
  expect(host.querySelector("dialog")?.textContent).toContain("Save failed");
  expect(host.querySelector<HTMLInputElement>("#team-name")?.value).toBe(
    "Local name",
  );
});
it("Escape follows dirty-close confirmation", async () => {
  await mount();
  await click("Edit Example Person");
  await field("#team-name", "Unsaved");
  vi.mocked(window.confirm).mockReturnValue(false);
  const modal = host.querySelector("dialog")!;
  await act(async () =>
    modal.dispatchEvent(
      new Event("cancel", { bubbles: false, cancelable: true }),
    ),
  );
  expect(host.querySelector("dialog")).toBeTruthy();
  expect(window.confirm).toHaveBeenCalledWith(
    "Discard unsaved team member changes?",
  );
});
it("preserves completed mutation state when list refresh fails", async () => {
  await mount();
  await click("Add Team Member");
  await field("#team-name", "New person");
  state.api.listMarketingTeam.mockRejectedValueOnce(Error("Refresh failed"));
  await click("Save Member");
  expect(host.querySelector("dialog")?.textContent).toContain(
    "Member saved. Reload the list",
  );
  expect(host.querySelector("fieldset")?.disabled).toBe(true);
  expect(state.api.createMarketingTeam).toHaveBeenCalledTimes(1);
});
it("image library selections stage photo and alt text without saving", async () => {
  await mount(true);
  await click("Edit Example Person");
  await click("Pick from library");
  await click("Select library photo");
  expect(host.querySelector<HTMLInputElement>("#team-alt")?.value).toBe(
    "Selected photo",
  );
  expect(state.api.updateMarketingTeam).not.toHaveBeenCalled();
});
it("blocks Escape and duplicate save while pending, then restores opener focus", async () => {
  await mount();
  const opener = host.querySelector<HTMLButtonElement>(
    '[aria-label="Edit Example Person"]',
  )!;
  opener.focus();
  await click("Edit Example Person");
  let finish!: (value: any) => void;
  state.api.updateMarketingTeam.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await click("Save Member");
  const modal = host.querySelector("dialog")!;
  await act(async () =>
    modal.dispatchEvent(new Event("cancel", { cancelable: true })),
  );
  expect(host.querySelector("dialog")).toBeTruthy();
  expect(host.querySelector("fieldset")?.hasAttribute("inert")).toBe(true);
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(state.api.updateMarketingTeam).toHaveBeenCalledTimes(1);
  await act(async () => finish(member));
  expect(host.querySelector("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
});
it("rejects invalid upload without changing the saved photo", async () => {
  await mount(true);
  await click("Edit Example Person");
  const file = host.querySelector<HTMLInputElement>("input[type=file]")!;
  await act(async () => {
    Object.defineProperty(file, "files", {
      configurable: true,
      value: [new File(["bad"], "bad.txt", { type: "text/plain" })],
    });
    file.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(host.querySelector("dialog")?.textContent).toContain(
    "Choose a PNG, JPEG, WebP or GIF",
  );
  expect(state.api.uploadMarketingMedia).not.toHaveBeenCalled();
  expect(
    host
      .querySelector<HTMLImageElement>(".blog-cover-preview")
      ?.getAttribute("src"),
  ).toContain("/photo.png");
});
