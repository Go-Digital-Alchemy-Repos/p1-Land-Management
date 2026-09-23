// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProjectPhases } from "../src/ProjectPhases";

vi.mock("../src/marketing/useCmsUnsavedChanges", () => ({
  useCmsUnsavedChanges: () => undefined,
}));
vi.mock("../src/BillingAllocationPicker", () => ({
  BillingAllocationPicker: () => null,
}));

const project = { id: "project-1", name: "Synthetic project", property_name: "Test property" };
const phase = {
  id: "phase-1",
  title: "Site preparation",
  scope: "Synthetic work",
  status: "manager_review",
  position: 0,
  version: 4,
  prerequisites: [],
};
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

function render(api: ReturnType<typeof vi.fn>, onError = vi.fn()) {
  root.render(
    <ProjectPhases
      projects={[project]}
      estimates={[]}
      role="owner"
      api={api}
      refresh={async () => undefined}
      onError={onError}
    />,
  );
}

function button(label: string) {
  return Array.from(host.querySelectorAll("button")).find(
    (item) => item.textContent?.trim() === label,
  );
}

it("does not claim a project has no phases when loading fails and allows retry", async () => {
  const api = vi.fn().mockRejectedValueOnce(Error("Temporary service failure"))
    .mockResolvedValueOnce([]);
  await act(async () => {
    render(api);
    await Promise.resolve();
  });
  expect(host.textContent).toContain("Project phases could not be loaded");
  expect(host.textContent).not.toContain("No normalized phases have been added");
  expect((button("Add phase") as HTMLButtonElement).disabled).toBe(true);
  await act(async () => {
    button("Retry loading phases")?.click();
    await Promise.resolve();
  });
  expect(host.textContent).toContain("No normalized phases have been added");
  expect((button("Add phase") as HTMLButtonElement).disabled).toBe(false);
});

it("keeps a failed reload visible after a successful phase write", async () => {
  const api = vi.fn()
    .mockResolvedValueOnce([phase])
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(Error("Reload failed"));
  await act(async () => {
    render(api);
    await Promise.resolve();
  });
  await act(async () => {
    button("Move to accepted")?.click();
    await Promise.resolve();
  });
  expect(api).toHaveBeenCalledWith("/project-phases/phase-1/transitions", expect.objectContaining({
    expectedVersion: 4,
    status: "accepted",
  }));
  expect(host.textContent).toContain("Project phases could not be loaded");
  expect(host.textContent).toContain("Reload failed");
  expect(host.textContent).not.toContain("No normalized phases have been added");
  expect(button("Retry loading phases")).toBeTruthy();
});

it("requires review of the exact client note before publishing", async () => {
  const api = vi.fn().mockResolvedValue([phase]);
  await act(async () => {
    render(api);
    await Promise.resolve();
  });
  await act(async () => button("Review client note")?.click());
  expect(api).toHaveBeenCalledTimes(1);
  const textarea = host.querySelector<HTMLTextAreaElement>('textarea[required]');
  expect(textarea?.value).toBe("P1 has reviewed the Site preparation phase.");
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!
      .set!.call(textarea, "Client-approved synthetic update");
    textarea?.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    host.querySelector("form.phase-form")?.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    await Promise.resolve();
  });
  expect(api).toHaveBeenCalledWith("/project-phases/phase-1/publish", {
    expectedVersion: 4,
    summary: "Client-approved synthetic update",
  });
});

it("cancels a client note without publishing", async () => {
  const api = vi.fn().mockResolvedValue([phase]);
  await act(async () => {
    render(api);
    await Promise.resolve();
  });
  await act(async () => button("Review client note")?.click());
  await act(async () => button("Cancel")?.click());
  expect(host.querySelector("form.phase-form")).toBeNull();
  expect(api).toHaveBeenCalledTimes(1);
});
