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
  await change(container.querySelector("select")!, "replace");
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
  await change(container.querySelector("input")!, "new.example.test");
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
  expect(container.querySelector("select")!.value).toBe("keep");
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
  await change(container.querySelector("select")!, "clear");
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
  expect(container.textContent).toContain("Backups use these stored storage settings");
  expect(container.textContent).toContain("does not copy existing media or backups");
  expect(container.querySelectorAll("select")).toHaveLength(2);
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
