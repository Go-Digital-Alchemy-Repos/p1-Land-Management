// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmPipelineSettingsResponse } from "@shared/crm-pipeline-settings";
import { DEFAULT_CRM_PIPELINE_CONFIG } from "@shared/crm-pipeline-settings";
import CrmSettingsPage from "./crm-settings-page";
const state = vi.hoisted(() => ({
  data: undefined as CrmPipelineSettingsResponse | undefined,
  isError: false,
  mutate: vi.fn(),
}));
vi.mock("@/hooks/use-crm-pipeline-settings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-crm-pipeline-settings")>()),
  useCrmPipelineSettings: () => ({
    data: state.data,
    isError: state.isError,
    isLoading: !state.data && !state.isError,
    refetch: vi.fn(),
  }),
}));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useMutation: () => ({ mutate: state.mutate, isPending: false, isError: false }),
}));
vi.mock("@/components/shared/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: React.ReactNode }) => children,
}));
describe("CRM settings editor", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    state.data = {
      config: structuredClone(DEFAULT_CRM_PIPELINE_CONFIG),
      source: "default",
      issue: null,
    };
    state.isError = false;
    state.mutate.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  async function render() {
    await act(async () => root.render(<CrmSettingsPage />));
  }
  it("reorders with accessible buttons and saves the full six-key configuration", async () => {
    await render();
    const button = container.querySelector('[aria-label="Move New down"]') as HTMLButtonElement;
    act(() => button.click());
    const rows = Array.from(container.querySelectorAll('[data-testid^="pipeline-setting-"]')).map(
      (row) => row.getAttribute("data-testid"),
    );
    expect(rows.slice(0, 2)).toEqual(["pipeline-setting-contacted", "pipeline-setting-new"]);
    act(() =>
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
    expect(state.mutate.mock.calls[0][0].stages.map((stage: { key: string }) => stage.key)).toEqual(
      ["contacted", "new", "qualified", "proposal", "won", "lost"],
    );
  });
  it.each(["unsupported_version", "failed_load"])("prevents writes on %s", async (issue) => {
    if (issue === "failed_load") {
      state.data = undefined;
      state.isError = true;
    } else state.data!.issue = "unsupported_version";
    await render();
    expect(container.querySelector("fieldset")?.disabled).toBe(true);
    act(() =>
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
    );
    expect(state.mutate).not.toHaveBeenCalled();
  });
  it("shows recovery warning for malformed settings but permits explicit replacement", async () => {
    state.data!.issue = "invalid_stored_config";
    await render();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("saving replaces");
    expect(container.querySelector("fieldset")?.disabled).toBe(false);
  });
  it("does not discard local edits during a background configuration refresh", async () => {
    await render();
    act(() =>
      (container.querySelector('[aria-label="Move New down"]') as HTMLButtonElement).click(),
    );
    state.data = { ...state.data!, config: structuredClone(DEFAULT_CRM_PIPELINE_CONFIG) };
    await render();
    expect(
      container.querySelector('[data-testid^="pipeline-setting-"]')?.getAttribute("data-testid"),
    ).toBe("pipeline-setting-contacted");
  });
});
