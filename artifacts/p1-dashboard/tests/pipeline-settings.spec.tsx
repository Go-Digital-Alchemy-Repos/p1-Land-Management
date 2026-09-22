import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({
  getSalesPipelineSettings: vi.fn(),
  saveSalesPipelineSettings: vi.fn(),
}));
vi.mock("@workspace/api-client-react/dashboard", () => api);
import {
  PipelineProvider,
  PipelineSettingsEditor,
  PipelineStage,
  usePipelineStages,
} from "../src/PipelineSettings";
import { defaultPipelineConfig } from "@workspace/api-zod/pipeline-settings";
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  api.getSalesPipelineSettings.mockResolvedValue({
    revision: 0,
    config: structuredClone(defaultPipelineConfig),
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
function Consumer() {
  const stages = usePipelineStages();
  return (
    <div data-testid="consumer">
      <PipelineStage value="new" />
      <select aria-label="Inquiry stage">
        {stages.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
const button = (label: string) =>
  Array.from(host.querySelectorAll("button")).find(
    (b) => b.textContent === label,
  )!;
async function render(initiallyOpen = false) {
  await act(async () =>
    root.render(
      <PipelineProvider>
        <PipelineSettingsEditor initiallyOpen={initiallyOpen} />
        <Consumer />
      </PipelineProvider>,
    ),
  );
}
it("opens the existing editor when entered through the settings deep link", async () => {
  await render(true);
  expect(host.querySelector('[aria-label="new label"]')).not.toBeNull();
  expect(button("Edit pipeline")).toBeUndefined();
  await click("Close editor");
  expect(host.querySelector('[aria-label="new label"]')).toBeNull();
  expect(button("Edit pipeline")).not.toBeUndefined();
});
async function click(label: string) {
  await act(async () => button(label).click());
}
async function change(label: string, value: string) {
  await act(async () => {
    const input = host.querySelector(
      `[aria-label="${label}"]`,
    ) as HTMLInputElement;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("saves stable keys with labels/order and updates consumers", async () => {
  await render();
  await click("Edit pipeline");
  await change("new label", "Incoming");
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Move new down"]')!
      .click(),
  );
  api.saveSalesPipelineSettings.mockImplementation(async (body: any) => ({
    revision: 1,
    config: body.config,
  }));
  await click("Save pipeline");
  const sent = api.saveSalesPipelineSettings.mock.calls[0][0];
  expect(sent.expectedRevision).toBe(0);
  expect(sent.config.stages[1]).toMatchObject({
    key: "new",
    label: "Incoming",
  });
  expect(host.querySelector('[data-testid="consumer"]')!.textContent).toContain(
    "Incoming",
  );
  expect(
    host
      .querySelectorAll('[aria-label="Inquiry stage"] option')[1]
      .getAttribute("value"),
  ).toBe("new");
  expect(host.textContent).toContain("Pipeline settings saved.");
});
it("retains uncertain drafts and requires explicit discard before reload", async () => {
  await render();
  await click("Edit pipeline");
  await change("new label", "Incoming");
  api.saveSalesPipelineSettings.mockRejectedValue(new Error("409"));
  await click("Save pipeline");
  expect(
    (host.querySelector('[aria-label="new label"]') as HTMLInputElement).value,
  ).toBe("Incoming");
  expect(button("Save pipeline").disabled).toBe(true);
  expect(button("Reload saved settings").disabled).toBe(true);
  await act(async () =>
    host.querySelector<HTMLInputElement>("input[type=checkbox]")!.click(),
  );
  await click("Reload saved settings");
  expect(host.querySelector('[aria-label="new label"]')).toBeNull();
  expect(api.getSalesPipelineSettings).toHaveBeenCalledTimes(2);
});
it("failed initial reads show defaults but never enable an editor", async () => {
  api.getSalesPipelineSettings.mockRejectedValue(new Error("unavailable"));
  await render(true);
  expect(button("Edit pipeline").disabled).toBe(true);
  expect(host.querySelector('[aria-label="new label"]')).toBeNull();
  expect(host.textContent).toContain("Default stage labels are shown.");
  expect(api.saveSalesPipelineSettings).not.toHaveBeenCalled();
});
it("duplicate labels prevent saves", async () => {
  await render();
  await click("Edit pipeline");
  await change("new label", "Contacted");
  expect(button("Save pipeline").disabled).toBe(true);
  expect(host.textContent).toContain("Stage labels must be unique");
});

it("does not fetch sales configuration for a client estimate view", async () => {
  await act(async () => root.render(<PipelineProvider enabled={false}><p>Client estimates</p></PipelineProvider>));
  expect(api.getSalesPipelineSettings).not.toHaveBeenCalled();
  expect(host.textContent).toBe("Client estimates");
});
