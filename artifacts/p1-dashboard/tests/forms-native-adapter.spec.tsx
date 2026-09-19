// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import FormManager from "../src/marketing/FormManager.tsx";
import { useFormReservation } from "../src/marketing/forms-runtime";
import { customFetch } from "../../../lib/api-client-react/src/custom-fetch";
const api = vi.hoisted(() => ({
  listMarketingForms: vi.fn(),
  getMarketingForm: vi.fn(),
  getMarketingFormBuilder: vi.fn(),
  createMarketingForm: vi.fn(),
  updateMarketingForm: vi.fn(),
  deleteMarketingForm: vi.fn(),
  listMarketingFormSubmissions: vi.fn(),
  deleteMarketingFormSubmission: vi.fn(),
}));
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("../../../lib/api-client-react/src/custom-fetch.ts", () => ({
  customFetch: vi.fn(async () => ({ ownedByCurrentUser: true, lock: null })),
}));
vi.mock("../src/marketing/MediaLibrary.tsx", () => ({
  MediaLibrary: () => null,
}));
vi.mock("../src/marketing/FormDeliveryQueue.tsx", () => ({
  FormDeliveryQueue: () => null,
}));
vi.mock("../src/marketing/BuilderPreview.tsx", () => ({
  BuilderPreview: () => null,
}));
const form = {
  id: "one",
  name: "Estimate",
  slug: "estimate",
  kind: "custom",
  isActive: true,
  isSystem: false,
  description: "",
  fields: [],
  settings: { customRouting: "keep" },
  updatedAt: "2026-09-19T12:00:00.000Z",
};
describe("native retained Forms adapter", () => {
  let root: Root, container: HTMLDivElement;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(customFetch)
      .mockReset()
      .mockResolvedValue({ ownedByCurrentUser: true, lock: null });
    api.listMarketingForms.mockResolvedValue([structuredClone(form)]);
    api.listMarketingFormSubmissions.mockResolvedValue([
      {
        id: "submission",
        formId: "one",
        createdAt: "2026-09-19T12:30:00Z",
        data: {
          name: "Site Manager",
          email: "manager@example.test",
          message: "Drainage inquiry",
        },
      },
    ]);
    api.updateMarketingForm.mockRejectedValue(
      Error("Form changed since you opened it"),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
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
    await act(async () => {
      root.render(<FormManager />);
      await new Promise((resolve) => setTimeout(resolve, 15));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });
  }
  const button = (text: string) =>
    Array.from(document.querySelectorAll("button")).find((node) =>
      node.textContent?.includes(text),
    )!;
  it("shows a failed load instead of silently replacing it with an empty library", async () => {
    api.listMarketingForms.mockRejectedValueOnce(
      Error("Unable to load saved forms"),
    );
    await render();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Unable to load saved forms",
    );
    expect(button("Retry loading forms")).toBeTruthy();
  });
  it("keeps draft fields and the saved version after a conflict", async () => {
    await render();
    await act(async () => button("Single Line Text").click());
    await act(async () => button("Save Form").click());
    expect(api.updateMarketingForm).toHaveBeenCalledWith(
      "one",
      expect.objectContaining({
        expectedUpdatedAt: form.updatedAt,
        settings: expect.objectContaining({ customRouting: "keep" }),
      }),
    );
    expect(container.textContent).toContain("Form changed since you opened it");
    expect(container.textContent).toContain("Field Settings");
    await act(async () => button("Save Form").click());
    expect(api.updateMarketingForm.mock.calls.at(-1)?.[1].fields).toHaveLength(
      1,
    );
  });
  it("restores Entries summary/detail navigation with existing JSON export", async () => {
    await render();
    await act(async () => button("Form Entries").click());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });
    expect(button("Export JSON")).toBeTruthy();
    await act(async () => button("Site Manager").click());
    expect(container.textContent).toContain("Drainage inquiry");
    expect(button("Back to Form Entries")).toBeTruthy();
    await act(async () => button("Back to Form Entries").click());
    expect(
      container.querySelector('[data-testid="card-form-entry-submission"]'),
    ).toBeTruthy();
  });
  it("keeps other forms and legacy Entries reachable when one form cannot be edited", async () => {
    const legacy = {
      ...form,
      id: "legacy",
      name: "Legacy Survey",
      fields: [{ id: "x", key: "x", label: "Legacy", type: "retired-widget" }],
    };
    api.listMarketingForms.mockResolvedValue([legacy, form]);
    await render();
    expect(container.textContent).toContain("Legacy Survey");
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => button("Legacy Survey").click());
    expect(container.textContent).toContain("unsupported field type");
    await act(async () => button("Form Entries").click());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });
    expect(api.listMarketingFormSubmissions).toHaveBeenCalledWith("legacy");
  });
  it("blocks switching and editing while a saved form reload is pending", async () => {
    api.listMarketingForms.mockResolvedValue([
      form,
      { ...form, id: "two", name: "Second Form" },
    ]);
    let resolve!: (value: unknown) => void;
    api.getMarketingForm.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await render();
    await act(async () => button("Reload saved form").click());
    expect(button("Second Form").matches(":disabled")).toBe(true);
    await act(async () => button("Second Form").click());
    await act(async () => resolve({ ...form, name: "Reloaded Estimate" }));
    expect(
      (container.querySelector('input[aria-label="Name"]') as HTMLInputElement)
        ?.value || container.textContent,
    ).toContain("Reloaded Estimate");
  });
  it("ignores a late reservation rejection for the prior form", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(customFetch).mockImplementation((url) =>
      String(url).includes("/one/acquire")
        ? new Promise((_, fail) => {
            reject = fail;
          })
        : Promise.resolve({ ownedByCurrentUser: true, lock: null }),
    );
    function Probe({ id }: { id: string }) {
      const lock = useFormReservation(id);
      return (
        <div>
          {lock.isReadOnly ? "read-only" : "owned"}
          {lock.summary?.description}
        </div>
      );
    }
    await act(async () => root.render(<Probe id="one" />));
    await act(async () => root.render(<Probe id="two" />));
    expect(container.textContent).toBe("owned");
    await act(async () => reject(Error("old request aborted")));
    expect(container.textContent).toBe("owned");
  });
  it("inserts a palette drag once even when dropping on the nested canvas target", async () => {
    await render();
    const drag = new Event("dragstart", { bubbles: true });
    Object.defineProperty(drag, "dataTransfer", {
      value: { effectAllowed: "", setData: vi.fn() },
    });
    await act(async () => button("Single Line Text").dispatchEvent(drag));
    const target = Array.from(container.querySelectorAll("div")).find(
      (node) =>
        node.textContent
          ?.trim()
          .startsWith(
            "Drag a field from the right sidebar or click one there to start building",
          ) && node.className.includes("border-dashed"),
    )!;
    expect(target).toBeTruthy();
    await act(async () =>
      target.dispatchEvent(
        new Event("drop", { bubbles: true, cancelable: true }),
      ),
    );
    await act(async () => button("Save Form").click());
    expect(api.updateMarketingForm.mock.calls.at(-1)?.[1].fields).toHaveLength(
      1,
    );
  });
  it("clean New Form and Entries clicks never require confirmation", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    await render();
    await act(async () => button("Form Entries").click());
    expect(
      container.querySelector('[role="tab"][aria-selected="true"]')
        ?.textContent,
    ).toBe("Form Entries");
    expect(window.confirm).not.toHaveBeenCalled();
    await act(async () => button("Form Builder").click());
    await act(async () => button("New Form").click());
    expect(
      (container.querySelector('input[aria-label="Name"]') as HTMLInputElement)
        .value,
    ).toBe("Untitled Form");
    expect(window.confirm).not.toHaveBeenCalled();
  });
});
