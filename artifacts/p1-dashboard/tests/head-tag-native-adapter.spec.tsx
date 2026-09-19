import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));
vi.mock("@workspace/api-client-react/dashboard", () => ({
  getWebsiteHeadTags: api.get,
  saveWebsiteHeadTags: api.save,
}));
import HeadTagSettings from "../src/marketing/HeadTagSettings";
let container: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({
    html: '<meta name="old">',
    version: "version-one",
  });
  api.save.mockResolvedValue({});
  vi.spyOn(window, "confirm").mockReturnValue(true);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
async function render() {
  await act(async () => root.render(<HeadTagSettings />));
}
function save() {
  return container.querySelector('[type="submit"]') as HTMLButtonElement;
}
function textarea() {
  return container.querySelector("textarea")!;
}
async function edit(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(textarea(), value);
    textarea().dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}
async function reload() {
  await act(async () => {
    [...container.querySelectorAll("button")]
      .find((b) => b.textContent?.includes("Reload"))!
      .click();
  });
}
it("restores the markup card, standalone icon, example and accurate publication guidance", async () => {
  await render();
  expect(container.querySelector(".head-tag-card h3")?.textContent).toContain(
    "Public Head Markup",
  );
  expect(container.querySelector(".head-tag-icon")).not.toBeNull();
  expect(textarea().placeholder).toContain("google-site-verification");
  expect(container.textContent).toContain("A quick note on Google Analytics");
  expect(container.textContent).toContain("up to 30 seconds");
  expect(container.textContent).toContain(
    "unapproved script sources remain blocked",
  );
  expect(container.querySelector("script")).toBeNull();
  expect(save().disabled).toBe(true);
});
it("sends the loaded version and adopts the read-after-save result", async () => {
  await render();
  await edit('<meta name="changed">');
  api.get.mockResolvedValue({
    html: '<meta name="confirmed">',
    version: "version-two",
  });
  await submit();
  expect(api.save).toHaveBeenCalledWith(
    { html: '<meta name="changed">', expectedVersion: "version-one" },
    expect.objectContaining({ signal: expect.anything() }),
  );
  expect(textarea().value).toBe('<meta name="confirmed">');
  expect(save().disabled).toBe(true);
  await edit('<meta name="next">');
  await submit();
  expect(api.save.mock.calls[1][0].expectedVersion).toBe("version-two");
});
it("retains the draft and blocks replay after an uncertain save", async () => {
  await render();
  await edit("draft");
  api.save.mockRejectedValue(new Error("conflict"));
  await submit();
  expect(textarea().value).toBe("draft");
  expect(save().disabled).toBe(true);
  await submit();
  expect(api.save).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("save could not be confirmed");
  api.get.mockResolvedValue({ html: "current", version: "two" });
  await reload();
  expect(window.confirm).toHaveBeenCalled();
  expect(textarea().value).toBe("current");
});
it("distinguishes confirmed save with failed reload and keeps dirty-navigation protection", async () => {
  await render();
  await edit("draft");
  api.get.mockRejectedValue(new Error("offline"));
  await submit();
  expect(textarea().value).toBe("draft");
  expect(save().disabled).toBe(true);
  expect(container.textContent).toContain(
    "save completed, but current settings could not be reloaded",
  );
  vi.mocked(window.confirm).mockReturnValue(false);
  const event = new Event("p1:before-navigation", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  await reload();
  expect(textarea().value).toBe("draft");
});
it("locks editor and rejects duplicate submissions while save is pending", async () => {
  await render();
  await edit("draft");
  let finish!: () => void;
  api.save.mockImplementation(
    () =>
      new Promise<void>((r) => {
        finish = r;
      }),
  );
  await submit();
  expect(textarea().disabled).toBe(true);
  await submit();
  expect(api.save).toHaveBeenCalledTimes(1);
  await act(async () => finish());
});
it("preserves existing oversized markup without silently truncating it", async () => {
  api.get.mockResolvedValue({ html: "x".repeat(100001), version: "one" });
  await render();
  expect(textarea().value.length).toBe(100001);
  expect(textarea().hasAttribute("maxlength")).toBe(false);
  expect(save().disabled).toBe(true);
  expect(container.textContent).toContain("Existing longer markup is retained");
  await edit("shortened");
  expect(save().disabled).toBe(false);
});
