// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import AdminEventSettingsPage from "@/features/admin/event-settings-page";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const apiRequestMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const toastMock = vi.fn();

const mockVenues = [
  {
    id: "venue-b",
    name: "West Hall",
    slug: "west-hall",
    address: "44 River St",
    city: "Grand Rapids",
    region: "MI",
    postalCode: "49503",
    country: "US",
    phone: "",
    websiteUrl: "",
    latitude: "",
    longitude: "",
  },
  {
    id: "venue-a",
    name: "Core Platform Studio",
    slug: "core-platform-studio",
    address: "120 Monroe Center St NW",
    city: "Grand Rapids",
    region: "MI",
    postalCode: "49503",
    country: "US",
    phone: "+1 (616) 555-0100",
    websiteUrl: "coreplatform.test",
    latitude: "42.9634",
    longitude: "-85.6681",
  },
];

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
  };
});

vi.mock("@/lib/queryClient", () => ({
  STALE_TIMES: { OPERATIONAL: 120000 },
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  queryClient: {
    invalidateQueries: (...args: unknown[]) => invalidateQueriesMock(...args),
  },
}));

vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "admin-sidebar" }, children),
}));

vi.mock("@/components/shared/loading-spinner", () => ({
  LoadingSpinner: () => React.createElement("div", { "data-testid": "loading-spinner" }, "Loading"),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

describe("AdminEventSettingsPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    useQueryMock.mockImplementation(() => ({ data: mockVenues, isLoading: false }));
    useMutationMock.mockImplementation(
      (options: {
        mutationFn: (variables: unknown) => Promise<unknown>;
        onSuccess?: () => void;
        onError?: (error: Error) => void;
      }) => ({
        isPending: false,
        mutate: vi.fn(async (variables: unknown) => {
          try {
            await options.mutationFn(variables);
            options.onSuccess?.();
          } catch (error) {
            options.onError?.(error as Error);
          }
        }),
      }),
    );
    apiRequestMock.mockResolvedValue(new Response("{}"));
    invalidateQueriesMock.mockReset();
    toastMock.mockReset();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  function renderPage() {
    root = createRoot(container);
    return act(async () => {
      root!.render(React.createElement(AdminEventSettingsPage));
    });
  }

  function setControlValue(input: HTMLInputElement, value: string) {
    const valueSetter = Object.getOwnPropertyDescriptor(input.constructor.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("renders the Event Settings page and lists saved venues by name", async () => {
    await renderPage();

    expect(document.body.textContent).toContain("Event Settings");
    expect(document.body.querySelector('[data-testid="tab-saved-venues"]')).not.toBeNull();
    const rows = [...document.body.querySelectorAll("[data-testid^='row-saved-venue-']")];
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Core Platform Studio"),
      expect.stringContaining("West Hall"),
    ]);
  });

  it("creates a saved venue with the requested payload fields", async () => {
    await renderPage();

    await act(async () => {
      (
        document.body.querySelector(
          '[data-testid="button-create-saved-venue"]',
        ) as HTMLButtonElement
      ).click();
    });

    await act(async () => {
      setControlValue(
        document.body.querySelector('[data-testid="input-saved-venue-name"]') as HTMLInputElement,
        "North Studio",
      );
      setControlValue(
        document.body.querySelector(
          '[data-testid="input-saved-venue-address"]',
        ) as HTMLInputElement,
        "10 Market Ave",
      );
      setControlValue(
        document.body.querySelector('[data-testid="input-saved-venue-city"]') as HTMLInputElement,
        "Grand Rapids",
      );
      setControlValue(
        document.body.querySelector('[data-testid="input-saved-venue-region"]') as HTMLInputElement,
        "MI",
      );
      setControlValue(
        document.body.querySelector(
          '[data-testid="input-saved-venue-postal-code"]',
        ) as HTMLInputElement,
        "49503",
      );
      setControlValue(
        document.body.querySelector(
          '[data-testid="input-saved-venue-country"]',
        ) as HTMLInputElement,
        "US",
      );
      setControlValue(
        document.body.querySelector(
          '[data-testid="input-saved-venue-latitude"]',
        ) as HTMLInputElement,
        "42.9634",
      );
      setControlValue(
        document.body.querySelector(
          '[data-testid="input-saved-venue-longitude"]',
        ) as HTMLInputElement,
        "-85.6681",
      );
      setControlValue(
        document.body.querySelector('[data-testid="input-saved-venue-phone"]') as HTMLInputElement,
        "+1 (616) 555-0100",
      );
      setControlValue(
        document.body.querySelector(
          '[data-testid="input-saved-venue-website"]',
        ) as HTMLInputElement,
        "https://example.com",
      );
    });

    await act(async () => {
      (
        document.body.querySelector(
          '[data-testid="button-submit-saved-venue"]',
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
    });

    expect(apiRequestMock).toHaveBeenCalledWith("POST", "/api/admin/events/venues", {
      name: "North Studio",
      address: "10 Market Ave",
      city: "Grand Rapids",
      region: "MI",
      postalCode: "49503",
      country: "US",
      latitude: "42.9634",
      longitude: "-85.6681",
      phone: "+1 (616) 555-0100",
      websiteUrl: "https://example.com",
    });
  });

  it("edits a saved venue through the venue endpoint", async () => {
    await renderPage();

    await act(async () => {
      (
        document.body.querySelector(
          '[data-testid="button-edit-saved-venue-venue-a"]',
        ) as HTMLButtonElement
      ).click();
    });

    await act(async () => {
      setControlValue(
        document.body.querySelector('[data-testid="input-saved-venue-phone"]') as HTMLInputElement,
        "+1 (616) 555-0199",
      );
    });

    await act(async () => {
      (
        document.body.querySelector(
          '[data-testid="button-submit-saved-venue"]',
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
    });

    expect(apiRequestMock).toHaveBeenCalledWith(
      "PUT",
      "/api/admin/events/venues/venue-a",
      expect.objectContaining({
        name: "Core Platform Studio",
        phone: "+1 (616) 555-0199",
      }),
    );
  });

  it("deletes a saved venue after confirmation", async () => {
    await renderPage();

    await act(async () => {
      (
        document.body.querySelector(
          '[data-testid="button-delete-saved-venue-venue-a"]',
        ) as HTMLButtonElement
      ).click();
    });

    expect(document.body.textContent).toContain("will no longer be linked to this saved venue");

    await act(async () => {
      (
        document.body.querySelector(
          '[data-testid="button-confirm-delete-saved-venue"]',
        ) as HTMLButtonElement
      ).click();
      await Promise.resolve();
    });

    expect(apiRequestMock).toHaveBeenCalledWith("DELETE", "/api/admin/events/venues/venue-a");
  });
});
