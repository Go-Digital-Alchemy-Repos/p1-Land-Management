// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(), test: vi.fn() }));
vi.mock("@workspace/api-client-react/dashboard", () => ({
  getWebsiteIntegrations: api.get,
  saveWebsiteIntegration: api.save,
  testWebsiteIntegration: api.test,
}));
import WebsiteIntegrations from "../../../../artifacts/p1-dashboard/src/marketing/WebsiteIntegrations";
const provider = {
  provider: "mailgun",
  version: "a".repeat(64),
  fields: { mailgun_domain: "mail.example.test", mailgun_from_address: "P1 <office@example.test>" },
  secrets: { mailgun_api_key: { configured: true } },
  effectiveSource: "settings",
  configurationManagement: "settings",
  configurationIssue: null,
  testEffects: "Read-only provider request; no email, subscriptions, or object writes.",
};
const snapshot = {
  providers: [provider],
  google: {
    effectiveSource: "deployment",
    configurationManagement: "remaining",
    credentialMode: "oauth",
    propertyId: "554712298",
    searchConsoleConfigured: true,
    searchConsoleSite: "https://p1landmanagement.com/",
    publicTrackingSource: "website-build-VITE_GA_MEASUREMENT_ID",
    note: "Credential presence does not prove provider access or canonical site coverage.",
  },
  backups: { effectiveSource: "settings" },
  smtpFallbackConfigured: true,
};
let container: HTMLDivElement, root: Root;
beforeEach(async () => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.clearAllMocks();
  api.get.mockResolvedValue(snapshot);
  api.save.mockResolvedValue({
    saved: true,
    integration: { ...provider, version: "b".repeat(64) },
  });
  api.test.mockResolvedValue({ success: true, code: "connection_verified", effects: "read-only" });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<WebsiteIntegrations />));
  await click("Configure");
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
function button(text: string) {
  return [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === text,
  )!;
}
async function click(text: string) {
  expect(button(text)).toBeTruthy();
  await act(async () => button(text).click());
}
async function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  await act(async () => {
    const proto =
      element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(element, value);
    element.dispatchEvent(
      new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }),
    );
  });
}
async function replaceSecret() {
  await change(container.querySelector("dialog select")!, "replace");
  await change(container.querySelector('input[type="password"]')!, "synthetic-new-key");
}
async function submit() {
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
it("shows redacted presence and deployment reporting limits without automatic tests", () => {
  expect(container.querySelector('input[type="password"]')).toBeNull();
  expect(container.textContent).toContain("Its value is never displayed");
  expect(container.textContent).toContain("Configuration presence is not verified provider access");
  expect(container.querySelector('a[href="/marketing/reporting/analytics"]')).not.toBeNull();
  expect(api.test).not.toHaveBeenCalled();
});
it("keeps a credential without sending masks or replacement values", async () => {
  await change(container.querySelector("dialog input")!, "new.example.test");
  await submit();
  expect(api.save).toHaveBeenCalledWith(
    "mailgun",
    {
      expectedVersion: provider.version,
      fields: {
        ...provider.fields,
        mailgun_domain: "new.example.test",
        mailgun_api_key: { operation: "keep" },
      },
    },
    expect.any(Object),
  );
  expect(api.test).not.toHaveBeenCalled();
});
it("erases replacement credentials only after confirmed save", async () => {
  await replaceSecret();
  await submit();
  expect(api.save.mock.calls[0][1].fields.mailgun_api_key).toEqual({
    operation: "replace",
    value: "synthetic-new-key",
  });
  expect(container.querySelector('input[type="password"]')).toBeNull();
  expect(container.querySelector("dialog select")!.value).toBe("keep");
});
it("retains a failed replacement and blocks replay until successful explicit reload", async () => {
  await replaceSecret();
  api.save.mockRejectedValueOnce(Error("conflict"));
  await submit();
  expect((container.querySelector('input[type="password"]') as HTMLInputElement).value).toBe(
    "synthetic-new-key",
  );
  expect(button("Save Mailgun settings").disabled).toBe(true);
  await submit();
  expect(api.save).toHaveBeenCalledTimes(1);
  api.get.mockRejectedValueOnce(Error("offline"));
  await click("Reload saved configuration");
  expect((container.querySelector('input[type="password"]') as HTMLInputElement).value).toBe(
    "synthetic-new-key",
  );
  await click("Reload saved configuration");
  expect(container.querySelector('input[type="password"]')).toBeNull();
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("replacement credentials"));
});
it("requires confirmation before clearing a saved credential", async () => {
  await change(container.querySelector("dialog select")!, "clear");
  vi.mocked(window.confirm).mockReturnValueOnce(false);
  await submit();
  expect(api.save).not.toHaveBeenCalled();
  await submit();
  expect(api.save.mock.calls[0][1].fields.mailgun_api_key).toEqual({ operation: "clear" });
});
it("checks only saved connection without saving current draft", async () => {
  await replaceSecret();
  await click("Check saved Mailgun connection");
  expect(api.test).toHaveBeenCalledWith("mailgun", expect.any(Object));
  expect(api.save).not.toHaveBeenCalled();
  expect((container.querySelector('input[type="password"]') as HTMLInputElement).value).toBe(
    "synthetic-new-key",
  );
});
it("prevents duplicate saves while the request is pending", async () => {
  await replaceSecret();
  let resolve!: (value: unknown) => void;
  api.save.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await submit();
  await submit();
  expect(api.save).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ saved: true, integration: provider }));
});
it("shows deployment override and blocks historical configuration issues", async () => {
  api.get.mockResolvedValue({
    ...snapshot,
    providers: [
      {
        ...provider,
        effectiveSource: "deployment",
        configurationIssue: "Stored category requires review.",
      },
    ],
  });
  await click("Reload saved configuration");
  expect(container.textContent).toContain("Deployment override");
  expect(container.textContent).toContain("fields edit the stored fallback");
  expect(container.querySelector("fieldset")!.disabled).toBe(true);
  expect(container.textContent).toContain("Stored category requires review.");
});
it("explains storage backup coupling without claiming a media migration", async () => {
  api.get.mockResolvedValue({
    ...snapshot,
    providers: [
      {
        ...provider,
        provider: "cloudflare_r2",
        fields: { r2_account_id: "", r2_bucket_name: "", r2_public_url: "" },
        secrets: {
          r2_access_key_id: { configured: false },
          r2_secret_access_key: { configured: false },
        },
      },
    ],
  });
  await click("Reload saved configuration");
  await click("Close");
  await click("Configure");
  expect(container.textContent).toContain("Backups use these stored storage settings");
  expect(container.textContent).toContain("does not copy existing media or backups");
  expect(container.querySelectorAll("dialog select")).toHaveLength(2);
});
it("replaces an earlier successful check with unavailable after a network failure", async () => {
  await click("Check saved Mailgun connection");
  expect(container.textContent).toContain("connection verified by a read-only provider request");
  await replaceSecret();
  api.test.mockRejectedValueOnce(Error("network unavailable"));
  await click("Check saved Mailgun connection");
  expect(container.textContent).not.toContain(
    "connection verified by a read-only provider request",
  );
  expect(container.textContent).toContain("Connection check unavailable");
  expect(container.textContent).not.toContain("save was not confirmed");
  expect((container.querySelector('input[type="password"]') as HTMLInputElement).value).toBe(
    "synthetic-new-key",
  );
  expect(button("Check saved Mailgun connection").disabled).toBe(false);
  expect(button("Save Mailgun settings").disabled).toBe(false);
});

it("uses original provider library and sheet, retains dirty credentials on declined close", async () => {
  expect(container.querySelector('[data-testid="library-integration-mailgun"]')).toBeTruthy();
  expect(container.querySelector('svg[aria-label="Mailgun logo"]')).toBeTruthy();
  expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(true);
  await replaceSecret();
  vi.mocked(window.confirm).mockReturnValueOnce(false);
  await click("Close");
  expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(true);
  expect((container.querySelector('input[type="password"]') as HTMLInputElement).value).toBe(
    "synthetic-new-key",
  );
  await click("Close");
  expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(false);
  await click("Configure");
  expect((container.querySelector('input[type="password"]') as HTMLInputElement).value).toBe(
    "synthetic-new-key",
  );
});
it("blocks Escape while a save is pending and displays uncertain errors within the sheet", async () => {
  await replaceSecret();
  let reject!: (e: Error) => void;
  api.save.mockReturnValueOnce(new Promise((_r, j) => (reject = j)));
  await submit();
  const dialog = container.querySelector("dialog")!;
  await act(async () => {
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
  });
  expect(dialog.hasAttribute("open")).toBe(true);
  expect(button("Close").disabled).toBe(true);
  await act(async () => reject(new Error("unknown outcome")));
  expect(dialog.querySelector('[role="alert"]')?.textContent).toContain("save was not confirmed");
  expect(button("Save Mailgun settings").disabled).toBe(true);
});
it("filters the shared provider library without discarding configuration drafts", async () => {
  await replaceSecret();
  await click("Close");
  const search = container.querySelector('[aria-label="Search integrations"]') as HTMLInputElement;
  await change(search, "no-match");
  expect(container.textContent).toContain("No integrations match");
  await click("Clear Filters");
  await click("Configure");
  expect((container.querySelector('input[type="password"]') as HTMLInputElement).value).toBe(
    "synthetic-new-key",
  );
  expect(api.save).not.toHaveBeenCalled();
  expect(api.test).not.toHaveBeenCalled();
});

it("retains original filter trigger widths in the native select adapter", () => {
  const module = container.querySelector('[data-testid="select-integration-group-filter"]')!;
  const category = container.querySelector('[data-testid="select-integration-category-filter"]')!;
  const status = container.querySelector('[data-testid="select-integration-status-filter"]')!;
  expect(module.tagName).toBe("SELECT");
  expect(module.classList.contains("w-full")).toBe(true);
  expect(module.classList.contains("sm:w-[190px]")).toBe(true);
  expect(category.classList.contains("sm:w-[190px]")).toBe(true);
  expect(status.classList.contains("sm:w-[165px]")).toBe(true);
  expect(module.getAttribute("aria-label")).toBe("Module type");
});
