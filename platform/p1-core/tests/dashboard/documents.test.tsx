// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  sync: vi.fn(),
  owned: true,
  verify: vi.fn(),
  acquire: vi.fn(),
}));
vi.mock("../../../../artifacts/p1-dashboard/src/marketing/useDocumentReservation", () => ({
  useDocumentReservation: () => ({
    owned: state.owned,
    verify: state.verify,
    acquire: state.acquire,
    error: "",
    holder: "Other editor",
  }),
}));
vi.mock("@workspace/api-client-react/dashboard", () => ({
  getWebsiteDocuments: state.list,
  saveWebsiteDocument: state.save,
  createWebsiteDocument: state.create,
  deleteWebsiteDocument: state.remove,
  syncWebsiteDocuments: state.sync,
}));
import DocumentManager from "../../../../artifacts/p1-dashboard/src/marketing/DocumentManager";
const id = "11111111-1111-4111-8111-111111111111",
  version = "a".repeat(64);
const doc = {
  id,
  version,
  title: "Operations Guide",
  slug: "operations-guide",
  category: "Reference",
  content: "# Welcome\n\n## Getting started",
  sortOrder: 1,
  isPublished: true,
  createdBy: null,
  createdAt: null,
  updatedAt: null,
};
let container: HTMLDivElement, root: Root;
beforeEach(async () => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function () {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function () {
      this.removeAttribute("open");
    },
  });
  state.owned = true;
  state.verify.mockResolvedValue(undefined);
  state.list.mockResolvedValue({ docs: [doc], version });
  window.history.replaceState(null, "", "/marketing/system/documents?doc=operations-guide");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<DocumentManager />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
async function click(text: string) {
  const b = [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === text);
  expect(b).toBeTruthy();
  await act(async () => b!.click());
}
async function changeContent(value: string) {
  const el = container.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("reads a deep-linked document with outline and category controls", () => {
  expect(container.textContent).toContain("Operations Guide");
  expect(container.querySelector(".doc-markdown h2")?.id).toBe("getting-started");
  expect(container.querySelector('a[href="#getting-started"]')).not.toBeNull();
});
it("keeps the draft and blocks a repeated write after conflict", async () => {
  await click("Edit document");
  await changeContent("# Local draft");
  state.save.mockRejectedValueOnce(Object.assign(Error("Conflict"), { status: 409 }));
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(state.save).toHaveBeenCalledWith(
    id,
    expect.objectContaining({
      expectedVersion: version,
      document: expect.objectContaining({ content: "# Local draft" }),
    }),
    expect.anything(),
  );
  expect(container.querySelector("textarea")?.value).toBe("# Local draft");
  expect(container.textContent).toContain("Your draft is retained");
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(state.save).toHaveBeenCalledTimes(1);
  await click("Reload saved documents");
  expect(container.querySelector("textarea")?.value).toBe("# Local draft");
});
it("retains text on reservation loss and prevents saves", async () => {
  await click("Edit document");
  await changeContent("Retain this draft");
  state.owned = false;
  await act(async () => root.render(<DocumentManager />));
  expect(container.querySelector("textarea")?.value).toBe("Retain this draft");
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(state.save).not.toHaveBeenCalled();
});
it("does not sync or delete when the operator cancels", async () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  await click("Refresh repository docs");
  await click("Delete");
  expect(state.sync).not.toHaveBeenCalled();
  expect(state.remove).not.toHaveBeenCalled();
});
it("saves edits with the original version and refreshes the collection", async () => {
  await click("Edit document");
  await changeContent("# Revised guide");
  state.save.mockResolvedValue({ ...doc, content: "# Revised guide", version: "b".repeat(64) });
  state.list.mockResolvedValue({
    docs: [{ ...doc, content: "# Revised guide", version: "b".repeat(64) }],
    version: "c".repeat(64),
  });
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(state.verify).toHaveBeenCalled();
  expect(state.save).toHaveBeenCalledWith(
    id,
    expect.objectContaining({
      expectedVersion: version,
      document: expect.objectContaining({
        isPublished: true,
        sortOrder: 1,
        content: "# Revised guide",
      }),
    }),
    expect.anything(),
  );
  expect(container.textContent).toContain("Document saved.");
});
it("uses collection and document versions for confirmed sync and deletion", async () => {
  state.sync.mockResolvedValue({
    docs: [doc],
    version: "b".repeat(64),
    created: 0,
    updated: 1,
    total: 1,
  });
  await click("Refresh repository docs");
  expect(state.sync).toHaveBeenCalledWith({ expectedVersion: version }, expect.anything());
  state.remove.mockResolvedValue({ deleted: true });
  state.list.mockResolvedValue({ docs: [], version: "c".repeat(64) });
  await click("Delete");
  expect(state.remove).toHaveBeenCalledWith(id, { expectedVersion: version }, expect.anything());
  expect(container.textContent).toContain("Document deleted.");
});

it("shares ordered system counts, excerpts, generated badges and hierarchical outline", async () => {
  state.list.mockResolvedValue({
    docs: [
      doc,
      {
        ...doc,
        id: "two",
        slug: "system-intro",
        category: "Getting Started",
        title: "Start here",
        content: "# Index\n\nUseful introduction\n\n### Nested topic",
        isPublished: false,
      },
    ],
    version,
  });
  await click("Reload saved documents");
  const categories = Array.from(
    container.querySelectorAll('[aria-label="Document categories"] button'),
  );
  expect(categories.map((button) => button.textContent)).toEqual([
    "All Systems2",
    "Getting Started1",
    "Reference1",
  ]);
  expect(container.querySelectorAll(".document-stat")).toHaveLength(3);
  expect(container.querySelector(".document-list")?.textContent).toContain("Useful introduction");
  expect(container.querySelector(".document-list")?.textContent).toContain("Generated");
  await act(async () => categories[1].dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect(container.querySelectorAll(".document-list>button")).toHaveLength(1);
  await act(async () =>
    container.querySelector<HTMLButtonElement>(".document-list>button")!.click(),
  );
  expect(
    container.querySelector(".document-outline a[href='#nested-topic']")?.getAttribute("style"),
  ).toContain("26px");
});
it("guards dirty Escape and restores the opener when the Sheet closes", async () => {
  const opener = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Edit document",
  )!;
  opener.focus();
  await click("Edit document");
  expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(true);
  await changeContent("# Unsaved sheet draft");
  vi.mocked(window.confirm).mockReturnValue(false);
  await act(async () =>
    container.querySelector("dialog")!.dispatchEvent(new Event("cancel", { cancelable: true })),
  );
  expect(container.querySelector("textarea")?.value).toBe("# Unsaved sheet draft");
  vi.mocked(window.confirm).mockReturnValue(true);
  await act(async () =>
    container.querySelector("dialog")!.dispatchEvent(new Event("cancel", { cancelable: true })),
  );
  expect(container.querySelector("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
});
it("retains the open Sheet and draft throughout an uncertain pending save", async () => {
  let reject!: (error: Error) => void;
  state.save.mockReturnValue(
    new Promise((_resolve, fail) => {
      reject = fail;
    }),
  );
  await click("Edit document");
  await changeContent("# Pending draft");
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(container.querySelector("fieldset")?.disabled).toBe(true);
  await act(async () =>
    container.querySelector("dialog")!.dispatchEvent(new Event("cancel", { cancelable: true })),
  );
  expect(container.querySelector("dialog")).not.toBeNull();
  await act(async () => reject(Error("transport lost")));
  expect(container.querySelector("dialog [role='alert']")?.textContent).toContain(
    "Your draft is retained",
  );
  expect(container.querySelector("textarea")?.value).toBe("# Pending draft");
});
