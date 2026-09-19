// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";

let host: HTMLDivElement;
let root: Root;
const fields = [
  { type: "text", label: "Your organization" },
  { type: "email", label: "Work email" },
  { type: "textarea", label: "Project details" },
  { type: "select", label: "Service", options: [{ label: "Land", value: "land" }] },
  { type: "multiselect", label: "Regions", options: [{ label: "North", value: "north" }] },
  { type: "name", label: "Contact name", config: { nameFormat: "split" } },
  { type: "address", label: "Site address", config: { showStreet2: true, showCountry: true } },
  {
    type: "radio",
    label: "Priority",
    options: [
      { label: "Soon", value: "soon" },
      { label: "Later", value: "later" },
    ],
  },
  { type: "checkbox", label: "Services", options: [{ label: "Mowing", value: "mowing" }] },
  { type: "image-choice", label: "Terrain", options: [{ label: "Flat", value: "flat" }] },
  {
    type: "consent",
    label: "Contact permission",
    config: { consentCheckboxLabel: "You may contact me" },
  },
  {
    type: "list",
    label: "Properties",
    config: { listColumns: [{ id: "address", label: "Property address" }] },
  },
].map((field, index) => ({
  ...field,
  id: `field-${index}`,
  key: `field-${index}`,
  required: false,
}));
const fixture: any = { id: "inquiry", slug: "inquiry", name: "Inquiry", fields, settings: {} };
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const render = () => (
  <QueryClientProvider client={client}>
    {[0, 1].map((key) => (
      <PublicFormRenderer key={key} slug="inquiry" formOverride={fixture} />
    ))}
  </QueryClientProvider>
);
beforeEach(async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(render()));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("associates simple fields and select triggers with visible labels using distinct stable instance IDs", async () => {
  const ids = Array.from(host.querySelectorAll("[id]")).map((element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const label of Array.from(host.querySelectorAll("label[for]"))) {
    const control = document.getElementById(label.getAttribute("for")!);
    expect(control, label.textContent ?? "").not.toBeNull();
    expect(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]).toContain(control!.tagName);
  }
  for (const name of ["Your organization", "Work email", "Project details", "Service", "Regions"]) {
    const labels = Array.from(host.querySelectorAll("label")).filter(
      (label) => label.textContent === name,
    );
    expect(labels).toHaveLength(2);
    expect(labels[0].htmlFor).not.toBe(labels[1].htmlFor);
  }
  for (const select of host.querySelectorAll('[role="combobox"]'))
    expect(document.getElementById(select.getAttribute("aria-labelledby")!)?.textContent).toBe(
      "Service",
    );
  await act(async () => root.render(render()));
  expect(Array.from(host.querySelectorAll("[id]")).map((element) => element.id)).toEqual(ids);
});
it("names grouped subfields and choices and gives repeated list cells associated labels", async () => {
  for (const group of host.querySelectorAll('[role="group"]'))
    expect(
      document.getElementById(group.getAttribute("aria-labelledby")!)?.textContent?.trim(),
    ).toBeTruthy();
  for (const name of [
    "Contact name: First name",
    "Contact name: Last name",
    "Site address: Street address",
    "Site address: City",
    "Site address: Country",
    "Mowing",
    "Flat",
    "You may contact me",
  ])
    expect(host.querySelectorAll(`[aria-label="${name}"]`)).toHaveLength(2);
  const radios = Array.from(host.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  expect(radios[0].name).toBe(radios[1].name);
  expect(radios[0].name).not.toBe(radios[2].name);
  for (const radio of radios) expect(radio.closest("label")?.textContent?.trim()).toBeTruthy();
  const add = Array.from(host.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Add Row"),
  )!;
  await act(async () => add.click());
  await act(async () => add.click());
  const cells = Array.from(
    host.querySelectorAll<HTMLInputElement>('input[aria-label^="Properties, row"]'),
  );
  expect(cells.map((input) => input.getAttribute("aria-label"))).toEqual([
    "Properties, row 1, Property address",
    "Properties, row 2, Property address",
  ]);
  for (const input of cells) expect(input.labels?.[0]?.textContent).toBe("Property address");
});
