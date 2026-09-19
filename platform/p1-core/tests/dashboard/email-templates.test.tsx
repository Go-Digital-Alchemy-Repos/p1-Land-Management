// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  features: vi.fn(),
  list: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  preview: vi.fn(),
  test: vi.fn(),
  owned: true,
  verify: vi.fn(),
  acquire: vi.fn(),
}));
vi.mock("../../../../artifacts/p1-dashboard/src/marketing/useEmailTemplateReservation", () => ({
  useEmailTemplateReservation: () => ({
    owned: state.owned,
    verify: state.verify,
    acquire: state.acquire,
    error: "",
    holder: "Other editor",
  }),
}));
vi.mock("@workspace/api-client-react/dashboard", () => ({
  getWebsiteFeatures: state.features,
  getWebsiteEmailTemplates: state.list,
  saveWebsiteEmailTemplate: state.save,
  restoreWebsiteEmailTemplates: state.restore,
  previewWebsiteEmailTemplate: state.preview,
  testWebsiteEmailTemplate: state.test,
}));
import EmailTemplateManager from "../../../../artifacts/p1-dashboard/src/marketing/EmailTemplateManager";
const template = {
  id: 1,
  slug: "welcome",
  name: "Welcome email",
  module: "Website",
  subject: "Welcome",
  htmlBody: "<p>Hello {{name}}</p>",
  description: "Website welcome",
  variables: ["name"],
  isActive: true,
  updatedAt: null,
  version: "a".repeat(64),
};
const collection = { version: "b".repeat(64), templates: [template] };
let container: HTMLDivElement, root: Root;
beforeEach(async () => {
  Object.assign(globalThis, { React });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  vi.clearAllMocks();
  state.owned = true;
  state.features.mockResolvedValue({
    features: { eventsEnabled: false, careersEnabled: false, crmEnabled: true },
  });
  state.verify.mockResolvedValue(undefined);
  state.list.mockResolvedValue(collection);
  state.save.mockResolvedValue(template);
  state.restore.mockResolvedValue(collection);
  state.preview.mockResolvedValue({
    subject: "Preview",
    html: "<script>alert(1)</script><p>Sample</p>",
  });
  state.test.mockResolvedValue({ success: true, message: "Test sent." });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<EmailTemplateManager />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
function button(text: string) {
  return [...container.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === text || b.getAttribute("aria-label") === text,
  )!;
}
async function click(text: string) {
  expect(button(text)).toBeTruthy();
  await act(async () => button(text).click());
}
async function open() {
  await click("Edit Welcome email");
}
async function edit() {
  await open();
  await click("HTML editor");
}
async function change(value: string) {
  const input = container.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      input,
      value,
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
it("previews without sending email inside a restricted frame", async () => {
  await open();
  await click("Preview draft");
  const frame = container.querySelector('iframe[title="Email template preview"]')!;
  expect(frame.getAttribute("sandbox")).toBe("");
  expect(frame.getAttribute("referrerpolicy")).toBe("no-referrer");
  expect(frame.srcdoc).toContain("default-src 'none'");
  expect(state.test).not.toHaveBeenCalled();
});
it("retains draft on uncertain save and blocks replay until successful reload", async () => {
  await edit();
  await change("<p>Local retained</p>");
  state.save.mockRejectedValueOnce(Error("timeout"));
  await submit();
  expect(container.querySelector("textarea")!.value).toContain("Local retained");
  expect(button("Save template").disabled).toBe(true);
  await submit();
  expect(state.save).toHaveBeenCalledTimes(1);
  state.list.mockRejectedValueOnce(Error("offline"));
  await click("Reload saved templates");
  expect(container.querySelector("textarea")!.value).toContain("Local retained");
  expect(button("Save template").disabled).toBe(true);
  await click("Reload saved templates");
  expect(container.querySelector("textarea")!.value).toBe(template.htmlBody);
  expect(button("Save template").disabled).toBe(false);
});
it("checks the reservation before saving and retains content on lost lock", async () => {
  await edit();
  await change("<p>Draft</p>");
  state.verify.mockRejectedValueOnce(Error("lost"));
  await submit();
  expect(state.save).not.toHaveBeenCalled();
  expect(container.querySelector("textarea")!.value).toBe("<p>Draft</p>");
});
it("saves only editable fields using the selected template version", async () => {
  await edit();
  await submit();
  expect(state.save).toHaveBeenCalledWith(
    "welcome",
    {
      template: { subject: template.subject, htmlBody: template.htmlBody, isActive: true },
      expectedVersion: template.version,
    },
    expect.any(Object),
  );
});
it("requires explicit test confirmation and prevents uncertain send replay", async () => {
  await open();
  vi.mocked(window.confirm).mockReturnValueOnce(false);
  await click("Send saved test email");
  expect(state.test).not.toHaveBeenCalled();
  state.test.mockRejectedValueOnce(Error("timeout"));
  await click("Send saved test email");
  expect(state.test).toHaveBeenCalledTimes(1);
  expect(button("Send saved test email").disabled).toBe(true);
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("signed-in account"));
});
it("disables saved test sending while edits are unsaved", async () => {
  await edit();
  await change("<p>Not saved</p>");
  expect(button("Send saved test email").disabled).toBe(true);
  expect(state.test).not.toHaveBeenCalled();
});
it("confirms default restoration and supplies collection version", async () => {
  vi.mocked(window.confirm).mockReturnValueOnce(false);
  await click("Restore System Templates");
  expect(state.restore).not.toHaveBeenCalled();
  await click("Restore System Templates");
  expect(state.restore).toHaveBeenCalledWith(
    { expectedVersion: collection.version },
    expect.any(Object),
  );
  expect(window.confirm).toHaveBeenCalledWith(
    expect.stringContaining("activation choices and custom templates"),
  );
});
it("prevents duplicate submissions while a save is pending", async () => {
  await edit();
  let resolve!: (value: unknown) => void;
  state.save.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await submit();
  await submit();
  expect(state.save).toHaveBeenCalledTimes(1);
  await act(async () => resolve(template));
});
it("hides disabled optional modules after loading feature configuration", async () => {
  state.list.mockResolvedValue({
    ...collection,
    templates: [
      template,
      { ...template, slug: "event", name: "Event disabled", module: "events" },
      { ...template, slug: "career", name: "Career disabled", module: "careers" },
    ],
  });
  await click("Reload saved templates");
  expect(container.textContent).not.toContain("Event disabled");
  expect(container.textContent).not.toContain("Career disabled");
});
it("visual mode preserves original HTML until an edit and retains formatting controls", async () => {
  await open();

  const frame = container.querySelector('iframe[title="Visual email editor"]')!;
  expect(frame.getAttribute("sandbox")).toBe("allow-same-origin");
  expect(frame.getAttribute("srcdoc")).toContain(template.htmlBody);
  expect(frame.getAttribute("srcdoc")).toContain("https://www.p1landmanagement.com");
  for (const label of [
    "Paragraph",
    "Heading",
    "Bold",
    "Italic",
    "Underline",
    "Bulleted list",
    "Numbered list",
    "Link",
    "Clear formatting",
  ])
    expect(button(label)).toBeTruthy();
  await submit();
  expect(state.save).toHaveBeenCalledWith(
    template.slug,
    {
      template: { subject: template.subject, htmlBody: template.htmlBody, isActive: true },
      expectedVersion: template.version,
    },
    expect.any(Object),
  );
});
it("finds templates by subject and variable and exposes original summary cards", async () => {
  const input = container.querySelector('[aria-label="Search templates"]')!;
  for (const term of ["name", "Welcome"]) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, term);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="card-template-welcome"]')).toBeTruthy();
  }
  expect(container.querySelector('[data-testid="button-template-module-Website"]')).toBeTruthy();
});
it("inserts variables at the HTML caret without replacing surrounding source", async () => {
  await edit();
  await change("<p>Before AFTER</p>");
  const source = container.querySelector("textarea")!;
  source.focus();
  source.setSelectionRange(10, 15);
  await click("{{name}}");
  expect(source.value).toBe("<p>Before {{name}}</p>");
  expect(state.save).not.toHaveBeenCalled();
});
it("inserts a variable into the iframe selection while preserving HTML styles", async () => {
  await open();
  const frame = container.querySelector('iframe[title="Visual email editor"]') as HTMLIFrameElement;
  const doc = frame.contentDocument!;
  doc.body.innerHTML = '<p style="color:red">Before AFTER</p>';
  const text = doc.querySelector("p")!.firstChild!;
  const range = doc.createRange();
  range.setStart(text, 7);
  range.setEnd(text, 12);
  doc.getSelection()!.removeAllRanges();
  doc.getSelection()!.addRange(range);
  Object.defineProperty(frame.contentWindow!, "focus", { value: vi.fn(), configurable: true });
  Object.defineProperty(doc, "execCommand", {
    configurable: true,
    value: vi.fn((command, _ui, value) => {
      if (command === "insertText") {
        const selected = doc.getSelection()!.getRangeAt(0);
        selected.deleteContents();
        selected.insertNode(doc.createTextNode(value));
      }
      return true;
    }),
  });
  const token = button("{{name}}");
  const down = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
  token.dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  await act(async () => token.click());
  await click("HTML editor");
  expect(container.querySelector("textarea")!.value).toBe(
    '<p style="color:red">Before {{name}}</p>',
  );
});
it("opens activation changes as an unsaved reserved draft and preserves modal on declined close", async () => {
  await act(async () =>
    (container.querySelector('[aria-label="Active: Welcome email"]') as HTMLButtonElement).click(),
  );
  expect(state.save).not.toHaveBeenCalled();
  expect((container.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(
    false,
  );
  vi.mocked(window.confirm).mockReturnValueOnce(false);
  await click("Close email template editor");
  expect(container.querySelector("dialog")!.hasAttribute("open")).toBe(true);
});
