// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import WebsiteIdentity from "../../../../../../artifacts/p1-dashboard/src/marketing/WebsiteIdentity";

vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react",
  async () => await import("react"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react/jsx-runtime",
  async () => await import("react/jsx-runtime"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react/jsx-dev-runtime",
  async () => await import("react/jsx-dev-runtime"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/lucide-react",
  async () => await import("lucide-react"),
);
const api = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), upload: vi.fn() }));
vi.mock("../../../../../../lib/api-client-react/src/dashboard/index", () => ({
  getWebsiteIdentity: api.load,
  saveWebsiteIdentity: api.save,
  uploadWebsiteIdentityAsset: api.upload,
}));
vi.mock("../../../../../../artifacts/p1-dashboard/src/marketing/MediaLibrary", () => ({
  MediaLibrary: ({
    onSelect,
    acceptAsset,
  }: {
    onSelect: (asset: { url: string; mimeType: string }) => void;
    acceptAsset: (asset: { url: string; mimeType: string }) => boolean;
  }) => {
    const asset = { url: "/uploads/cms/library-logo.png", mimeType: "image/png" };
    return (
      <button type="button" disabled={!acceptAsset(asset)} onClick={() => onSelect(asset)}>
        Choose fixture media
      </button>
    );
  },
}));
let host: HTMLDivElement;
let root: Root;
const snapshot = () => ({
  version: "original-version",
  settings: {
    company_name: "Old name",
    company_address: "Street\nCity",
    company_phone_numbers: "123",
    company_google_business_url: "",
    frontend_logo_url: "legacy relative logo",
    favicon_url: "",
  },
});
const input = (id: string) => host.querySelector<HTMLInputElement>(`#${id}`)!;
const save = () =>
  host.querySelector<HTMLButtonElement>('[data-testid="button-save-company-information"]')!;
const button = (label: string) =>
  Array.from(host.querySelectorAll("button")).find((node) => node.textContent === label)!;
async function enter(id: string, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      input(id),
      value,
    );
    input(id).dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
async function upload(file: File) {
  const fileInput = host.querySelector<HTMLInputElement>(
    '[data-testid="branding-media-frontend_logo_url-file-input"]',
  )!;
  Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
  await act(async () => fileInput.dispatchEvent(new Event("change", { bubbles: true })));
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  vi.clearAllMocks();
  api.load.mockResolvedValue(snapshot());
  api.save.mockResolvedValue({});
  api.upload.mockResolvedValue({ url: "/uploads/cms/upload-logo.png" });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<WebsiteIdentity />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

it("retains separate image cards and saves company changes without rewriting legacy image values", async () => {
  expect(host.querySelectorAll(".branding-image-card")).toHaveLength(2);
  expect(host.querySelectorAll(".branding-company-field")).toHaveLength(4);
  await enter("company-name", "P1 Land & Property Management");
  const next = snapshot();
  next.settings.company_name = "P1 Land & Property Management";
  api.load.mockResolvedValue(next);
  await submit();
  expect(api.save).toHaveBeenCalledWith(
    {
      settings: { company_name: "P1 Land & Property Management" },
      expectedVersion: "original-version",
    },
    expect.anything(),
  );
  expect(input("frontend_logo_url").value).toBe("legacy relative logo");
  expect(save().disabled).toBe(true);
});

it("offers existing media only with its grant and stages selection without a settings write", async () => {
  expect(button("Library")).toBeUndefined();
  expect(button("Pick from library")).toBeUndefined();
  await act(async () => root.render(<WebsiteIdentity canUseMedia />));
  await act(async () => button("Library").click());
  expect(host.querySelector("dialog")!.open).toBe(true);
  await act(async () => button("Choose fixture media").click());
  expect(input("frontend_logo_url").value).toBe("/uploads/cms/library-logo.png");
  expect(api.save).not.toHaveBeenCalled();
  expect(host.querySelector("dialog")!.open).toBe(false);
  await submit();
  expect(api.save).toHaveBeenCalledWith(
    {
      settings: { frontend_logo_url: "/uploads/cms/library-logo.png" },
      expectedVersion: "original-version",
    },
    expect.anything(),
  );
});

it("rejects unsupported or oversized files and stages accepted uploads until save", async () => {
  await upload(new File(["fixture"], "logo.svg", { type: "image/svg+xml" }));
  expect(api.upload).not.toHaveBeenCalled();
  const big = new File(["fixture"], "large.png", { type: "image/png" });
  Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
  await upload(big);
  expect(api.upload).not.toHaveBeenCalled();
  await upload(new File(["fixture"], "logo.png", { type: "image/png" }));
  expect(api.upload).toHaveBeenCalledTimes(1);
  expect(input("frontend_logo_url").value).toBe("/uploads/cms/upload-logo.png");
  expect(api.save).not.toHaveBeenCalled();
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label="Remove Frontend Logo"]')!.click(),
  );
  expect(input("frontend_logo_url").value).toBe("");
  expect(api.save).not.toHaveBeenCalled();
});

it("keeps the draft blocked after conflict and discards only after confirmation", async () => {
  await enter("company-name", "Draft name");
  api.save.mockRejectedValue(new Error("conflict"));
  await submit();
  expect(input("company-name").value).toBe("Draft name");
  expect(input("company-name").disabled).toBe(true);
  expect(save().disabled).toBe(true);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await act(async () => button("Reload saved branding settings").click());
  expect(input("company-name").value).toBe("Draft name");
  confirm.mockReturnValue(true);
  await act(async () => button("Reload saved branding settings").click());
  expect(input("company-name").value).toBe("Old name");
  expect(input("company-name").disabled).toBe(false);
});

it("prefills an empty business URL and prevents a doubled protocol from a full URL paste", async () => {
  await act(async () => input("company-google-business-url").focus());
  expect(input("company-google-business-url").value).toBe("https://");
  expect(save().disabled).toBe(true);
  await enter("company-google-business-url", "https://https://maps.google.com/example");
  expect(input("company-google-business-url").value).toBe("https://maps.google.com/example");
  expect(save().disabled).toBe(false);
});

it("keeps the empty upload target and media-library action separate for keyboard use", async () => {
  await act(async () => root.render(<WebsiteIdentity canUseMedia />));
  const target = host.querySelector<HTMLElement>('[role="button"][aria-label="Upload Favicon"]')!;
  const library = button("Pick from library");
  expect(target.querySelector("button")).toBeNull();
  expect(library.parentElement).toBe(target.parentElement);
  const fileInput = host.querySelector<HTMLInputElement>(
    '[data-testid="branding-media-favicon_url-file-input"]',
  )!;
  const fileClick = vi.spyOn(fileInput, "click").mockImplementation(() => {});
  for (const key of ["Enter", " "]) {
    await act(async () =>
      target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })),
    );
  }
  expect(fileClick).toHaveBeenCalledTimes(2);
  expect(host.querySelector("dialog")!.open).toBe(false);
  await act(async () => library.click());
  expect(host.querySelector("dialog")!.open).toBe(true);
  expect(fileClick).toHaveBeenCalledTimes(2);
});
