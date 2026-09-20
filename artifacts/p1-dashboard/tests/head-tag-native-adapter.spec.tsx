import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));
vi.mock("@workspace/api-client-react/dashboard", () => ({
  getWebsiteHeadTags: api.get,
  saveWebsiteHeadTags: api.save,
}));
import HeadTagSettings from "../src/marketing/HeadTagSettings";
const scriptConfig = {
  version: "a".repeat(64),
  googleAnalytics: { source: "deployment", measurementId: "" },
  effectiveGoogleAnalytics: {
    source: "deployment",
    measurementId: "G-YX69CJ1QNJ",
  },
  turnstile: {
    enabled: true,
    siteKey: "public-site-key",
    scriptUrl:
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  },
  scriptUrls: {
    googleAnalytics: "https://www.googletagmanager.com/gtag/js",
    turnstile:
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  },
  rawMarkupConflict: false,
};
let container: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json(scriptConfig)),
  );

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
  vi.unstubAllGlobals();
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
      .find((b) => b.textContent === "Reload saved tags")!
      .click();
  });
}
it("restores the markup card, standalone icon, example and accurate publication guidance", async () => {
  await render();
  expect(
    [...container.querySelectorAll(".head-tag-card h3")]
      .map((node) => node.textContent)
      .join(" "),
  ).toContain("Public Head Markup");
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

it("shows authoritative managed values and saves versioned GA settings without credentials", async () => {
  await render();
  expect(container.textContent).toContain("G-YX69CJ1QNJ");
  expect(container.textContent).toContain("public-site-key");
  expect(container.textContent).toContain("server-managed");
  const select = container.querySelector("select")!;
  await act(async () => {
    select.value = "managed";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => {
    const input = container.querySelector(
      'input[aria-label="GA4 measurement ID"]',
    )!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "G-NEW123");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    [...container.querySelectorAll("button")]
      .find((b) => b.textContent === "Save managed scripts")!
      .click();
  });
  const calls = vi.mocked(fetch).mock.calls;
  const put = calls.find(([, options]) => options?.method === "PUT")!;
  expect(put[0]).toBe("/api/v1/marketing/cms/website-system/scripts");
  expect(JSON.parse(put[1]!.body as string)).toEqual({
    expectedVersion: scriptConfig.version,
    googleAnalytics: { source: "managed", measurementId: "G-NEW123" },
  });
  expect(container.textContent).toContain("current settings reloaded");
});
it("retains GA draft and blocks replay after an uncertain save until reload", async () => {
  await render();
  await act(async () => {
    const select = container.querySelector("select")!;
    select.value = "disabled";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  vi.mocked(fetch).mockRejectedValueOnce(new Error("lost response"));
  const button = [...container.querySelectorAll("button")].find(
    (b) => b.textContent === "Save managed scripts",
  )!;
  await act(async () => button.click());
  expect(container.querySelector("select")!.value).toBe("disabled");
  expect(button.disabled).toBe(true);
  expect(container.textContent).toContain("Your draft is retained");
  await act(async () => {
    [...container.querySelectorAll("button")]
      .find((b) => b.textContent === "Reload managed scripts")!
      .click();
  });
  expect(container.querySelector("select")!.value).toBe("deployment");
});
