// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClientWorkspace, PropertyWorkspace } from "../../../../artifacts/p1-dashboard/src/AccountWorkspace";

vi.mock("../../../../artifacts/p1-dashboard/src/PropertyMap", () => ({
  ClientPropertyMap: () => <div>Client map</div>,
  PropertyMap: () => <div>Client map</div>,
  PropertyLocationMap: () => <div>Property map</div>,
}));
vi.mock("../../../../artifacts/p1-dashboard/src/RichTextEditor", () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (next: string) => void }) =>
    <textarea value={value} onChange={(event) => onChange(event.target.value)} />,
}));

const propertyId = "22222222-2222-4222-8222-222222222222";
const clientId = "11111111-1111-4111-8111-111111111111";
const property = {
  id: propertyId,
  client_id: clientId,
  client_name: "Synthetic client",
  name: "Synthetic grounds",
  address: "12063 Guion Ln, Stallings, NC 28104",
  address_line1: "12063 Guion Ln",
  address_line2: "",
  city: "Stallings",
  state: "NC",
  postal_code: "28104",
  acreage: 3,
  access_instructions: "Call before arrival",
  property_type_id: null,
  version: 4,
};
const propertyWorkspace = {
  property,
  schedule: [], agreements: [], requests: [], projects: [], inspections: [],
  files: [], contacts: [], notes: [],
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

function requestForProperty() {
  return vi.fn(async (path: string, body?: unknown) => {
    if (path === `/properties/${propertyId}/workspace`) return propertyWorkspace;
    if (path === "/property-types") return [];
    if (path === `/properties/${propertyId}` && body) return { ...property, version: 5 };
    throw new Error(`Unexpected request: ${path}`);
  });
}

it("lets an owner open and save the complete property form from the profile title", async () => {
  const request = requestForProperty();
  await act(async () => {
    root.render(<PropertyWorkspace id={propertyId} tab="overview" request={request} onTab={vi.fn()} onClient={vi.fn()} canOpenClient role="owner" capabilities={[]} />);
    await Promise.resolve();
  });
  const edit = host.querySelector<HTMLButtonElement>(".property-profile-edit-trigger");
  expect(edit?.getAttribute("aria-label")).toBe("Edit Synthetic grounds profile");
  await act(async () => edit?.click());
  expect(edit?.getAttribute("aria-expanded")).toBe("true");
  const form = host.querySelector<HTMLFormElement>(".property-profile-edit-panel form");
  expect(form).not.toBeNull();
  expect(form?.querySelector<HTMLInputElement>('input[autocomplete="address-line1"]')?.value).toBe("12063 Guion Ln");
  const zip = form?.querySelector<HTMLInputElement>('input[autocomplete="postal-code"]');
  expect(zip?.value).toBe("28104");
  expect(zip?.validity.patternMismatch).toBe(false);
  if (zip) {
    zip.value = "28104-1234";
    expect(zip.validity.patternMismatch).toBe(false);
    zip.value = "2810";
    expect(zip.validity.patternMismatch).toBe(true);
    zip.value = "28104";
  }
  await act(async () => form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(request).toHaveBeenCalledWith(`/properties/${propertyId}`, expect.objectContaining({
    name: "Synthetic grounds", addressLine1: "12063 Guion Ln", city: "Stallings",
    state: "NC", postalCode: "28104", acreage: 3,
    accessInstructions: "Call before arrival", version: 4,
  }));
  expect(host.querySelector(".property-profile-edit-panel")).toBeNull();
});

it("limits the new profile edit control to the owner or a permitted manager", async () => {
  const request = requestForProperty();
  await act(async () => {
    root.render(<PropertyWorkspace id={propertyId} tab="overview" request={request} onTab={vi.fn()} onClient={vi.fn()} canOpenClient role="sales" capabilities={["customers.properties"]} />);
    await Promise.resolve();
  });
  expect(host.querySelector(".property-profile-edit-trigger")).toBeNull();
  await act(async () => {
    root.render(<PropertyWorkspace id={propertyId} tab="overview" request={request} onTab={vi.fn()} onClient={vi.fn()} canOpenClient role="manager" capabilities={["customers.properties"]} />);
    await Promise.resolve();
  });
  expect(host.querySelector(".property-profile-edit-trigger")).not.toBeNull();
});

it("accepts a five-digit ZIP in the client property's Add form", async () => {
  const request = vi.fn(async (path: string) => path === "/property-types" ? [] : {
    client: { id: clientId, name: "Synthetic client", billing_address: null, phone: null, email: null },
    properties: [], propertyChoices: [], contacts: [], agreements: [], schedule: [],
    requests: [], projects: [], notes: [], activity: [], salesOrigins: [],
  });
  await act(async () => {
    root.render(<ClientWorkspace id={clientId} tab="properties" request={request} onTab={vi.fn()} onProperty={vi.fn()} role="owner" capabilities={[]} />);
    await Promise.resolve();
  });
  const add = Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("Add property"));
  await act(async () => add?.click());
  const zip = host.querySelector<HTMLInputElement>('.account-resource-form input[autocomplete="postal-code"]');
  expect(zip).not.toBeNull();
  if (zip) {
    zip.value = "28104";
    expect(zip.validity.patternMismatch).toBe(false);
  }
});
