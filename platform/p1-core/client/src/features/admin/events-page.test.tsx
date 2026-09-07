// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import AdminEventsPage, {
  centsToDollarInput,
  dollarInputToCents,
} from "@/features/admin/events-page";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const lockGuardMock = vi.fn();
const editorLockState = {
  hasLocking: true,
  hasLoaded: true,
  isReadOnly: true,
  isLoading: false,
  acquire: vi.fn(),
  summary: {
    variant: "warning" as const,
    title: "Event already checked out",
    description: "Jamie Editor is already editing this event.",
  },
};
let mutationStates: Array<{
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
}> = [];

const mockEvents = [
  {
    id: "event-1",
    title: "Counselor Training",
    slug: "counselor-training",
    description: "Upcoming training event",
    date: "2026-05-01T14:00:00.000Z",
    endDate: "2026-05-01T15:00:00.000Z",
    timezone: "America/New_York",
    location: "Zoom",
    locationName: "",
    locationAddress: "",
    isVirtual: true,
    imageUrl: "",
    status: "published",
    visibility: "public",
    eventType: "training",
    category: "professional_development",
    deliveryMode: "virtual",
    speakerName: "Jamie Trainer",
    tags: ["clinical", "training"],
    memberOnly: false,
    registrationEnabled: true,
    registrationType: "paid",
    registrationFee: 40000,
    registrationCurrency: "usd",
    showInArchives: false,
    isRecurring: false,
  },
  {
    id: "event-2",
    title: "Global Families Welcome Circle",
    slug: "global-families-welcome-circle",
    description: "A community circle for globally mobile families.",
    date: "2026-06-16T18:00:00.000Z",
    endDate: "2026-06-16T19:30:00.000Z",
    timezone: "America/New_York",
    location: "Core Platform Community Room",
    locationName: "Core Platform Studio",
    locationAddress: "120 Monroe Center St NW, Grand Rapids, MI 49503",
    isVirtual: false,
    imageUrl: "",
    status: "draft",
    visibility: "public",
    eventType: "community_event",
    category: "support",
    deliveryMode: "in_person",
    speakerName: "Sarah Chen",
    tags: ["families", "welcome"],
    memberOnly: false,
    registrationEnabled: false,
    showInArchives: false,
    isRecurring: false,
  },
  {
    id: "event-3",
    title: "Provider Office Hours",
    slug: "provider-office-hours",
    description: "Open office hours for clinicians and coaches.",
    date: "2026-06-20T15:00:00.000Z",
    endDate: "2026-06-20T16:00:00.000Z",
    timezone: "America/New_York",
    location: "Hybrid",
    locationName: "Core Platform Studio",
    locationAddress: "120 Monroe Center St NW, Grand Rapids, MI 49503",
    isVirtual: true,
    imageUrl: "",
    status: "completed",
    visibility: "public",
    eventType: "consultation",
    category: "education",
    deliveryMode: "hybrid",
    speakerName: "Morgan Lee",
    tags: ["clinicians"],
    memberOnly: false,
    registrationEnabled: false,
    showInArchives: false,
    isRecurring: false,
  },
];

const mockForms = [
  {
    id: "form-1",
    name: "Training Intake",
    slug: "training-intake",
    kind: "custom",
    isActive: true,
    fields: [],
    settings: {},
  },
];

const mockVenues = [
  {
    id: "venue-1",
    name: "Existing Studio",
    slug: "existing-studio",
    description: "",
    address: "10 Market Ave",
    city: "Grand Rapids",
    region: "MI",
    postalCode: "49503",
    country: "US",
    phone: "",
    email: "",
    websiteUrl: "",
    latitude: "42.9634",
    longitude: "-85.6681",
    parkingInfo: "",
    accessibilityInfo: "",
    transitInfo: "",
    arrivalNotes: "",
    isVirtual: false,
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

vi.mock("@/components/shared/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "protected-route" }, children),
}));

vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "admin-sidebar" }, children),
}));

vi.mock("@/components/shared/editor-lock-banner", () => ({
  EditorLockBanner: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "editor-lock-banner" }, title),
}));

vi.mock("@/components/shared/loading-spinner", () => ({
  LoadingSpinner: () => React.createElement("div", { "data-testid": "loading-spinner" }, "Loading"),
}));

vi.mock("@/features/admin/cms/components/cms-image-upload", () => ({
  CmsImageUpload: () => React.createElement("div", { "data-testid": "cms-image-upload" }),
}));

vi.mock("@/features/admin/cms/builder/cms-rich-text-editor", () => ({
  CmsRichTextEditor: ({
    value = "",
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (value: string) => void;
  }) =>
    React.createElement("textarea", {
      ...props,
      value,
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => onChange?.(event.target.value),
    }),
}));

vi.mock("@/features/admin/cms/components/image-position-picker", () => ({
  ImagePositionPicker: () => React.createElement("div", { "data-testid": "image-position-picker" }),
}));

vi.mock("@/components/shared/structured-data-status", () => ({
  StructuredDataStatus: () =>
    React.createElement("div", { "data-testid": "structured-data-status" }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-editor-lock", () => ({
  useEditorLock: () => editorLockState,
}));

vi.mock("@/hooks/use-lock-conflict-guard", () => ({
  useLockConflictGuard: (args: unknown) => lockGuardMock(args),
}));

describe("AdminEventsPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    lockGuardMock.mockReset();
    editorLockState.isReadOnly = true;
    mutationStates = [];
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/events") {
        return { data: mockEvents, isLoading: false };
      }

      if (queryKey[0] === "/api/admin/forms") {
        return { data: mockForms, isLoading: false };
      }

      if (queryKey[0] === "/api/admin/events/venues") {
        return { data: mockVenues, isLoading: false };
      }

      if (queryKey[0] === "/api/admin/events" && queryKey[2] === "registrations") {
        return { data: [], isLoading: false };
      }

      return { data: [], isLoading: false };
    });
    useMutationMock.mockImplementation(() => {
      const state = {
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      };
      mutationStates.push(state);
      return state;
    });
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    (
      globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).React = React;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.pushState({}, "", "/admin/events");
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.unstubAllGlobals();
    container.remove();
    document.body.innerHTML = "";
  });

  function setControlValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const valueSetter = Object.getOwnPropertyDescriptor(input.constructor.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("filters the admin events list by search text", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    expect(document.body.querySelector('[data-testid="card-event-event-1"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="card-event-event-2"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="card-event-event-3"]')).not.toBeNull();

    const searchInput = document.body.querySelector(
      '[data-testid="input-admin-event-search"]',
    ) as HTMLInputElement | null;
    expect(searchInput).not.toBeNull();

    await act(async () => {
      setControlValue(searchInput!, "Sarah Chen");
    });

    expect(document.body.querySelector('[data-testid="card-event-event-1"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="card-event-event-2"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="card-event-event-3"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="text-admin-event-count"]')?.textContent).toBe(
      "Showing 1 of 3 events",
    );
  });

  it("shows a no-match state and clears active event filters", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    const searchInput = document.body.querySelector(
      '[data-testid="input-admin-event-search"]',
    ) as HTMLInputElement | null;
    expect(searchInput).not.toBeNull();

    await act(async () => {
      setControlValue(searchInput!, "no matching event");
    });

    expect(document.body.querySelector('[data-testid="text-no-event-matches"]')).not.toBeNull();
    expect(
      document.body.querySelector('[data-testid="button-clear-admin-event-filters"]'),
    ).not.toBeNull();

    const clearButton = document.body.querySelector(
      '[data-testid="button-clear-admin-event-filters"]',
    ) as HTMLButtonElement | null;

    await act(async () => {
      clearButton?.click();
    });

    expect(document.body.querySelector('[data-testid="text-no-event-matches"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="card-event-event-1"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="card-event-event-2"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="card-event-event-3"]')).not.toBeNull();
    expect(searchInput?.value).toBe("");
  });

  it("renders event type, category, status, and delivery filters", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    expect(
      document.body.querySelector('[data-testid="select-admin-event-type-filter"]'),
    ).not.toBeNull();
    expect(
      document.body.querySelector('[data-testid="select-admin-event-category-filter"]'),
    ).not.toBeNull();
    expect(
      document.body.querySelector('[data-testid="select-admin-event-status-filter"]'),
    ).not.toBeNull();
    expect(
      document.body.querySelector('[data-testid="select-admin-event-delivery-filter"]'),
    ).not.toBeNull();
  });

  it("closes the event editor sheet when a lock conflict is detected", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    const editButton = document.body.querySelector(
      '[data-testid="button-edit-event-event-1"]',
    ) as HTMLButtonElement | null;
    expect(editButton).not.toBeNull();

    await act(async () => {
      editButton?.click();
    });

    expect(document.body.querySelector('[data-testid="input-event-title"]')).not.toBeNull();
    expect(lockGuardMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        resourceId: "event-1",
        resourceLabel: "event",
        editorLock: editorLockState,
      }),
    );

    const guardArgs = lockGuardMock.mock.calls.at(-1)?.[0] as { onConflict: () => void };

    await act(async () => {
      guardArgs.onConflict();
    });

    expect(document.body.querySelector('[data-testid="input-event-title"]')).toBeNull();
  });

  it("submits the edited event through the update mutation", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    const editButton = document.body.querySelector(
      '[data-testid="button-edit-event-event-1"]',
    ) as HTMLButtonElement | null;
    expect(editButton).not.toBeNull();

    await act(async () => {
      editButton?.click();
    });

    const submitButton = document.body.querySelector(
      '[data-testid="button-submit-event"]',
    ) as HTMLButtonElement | null;
    expect(submitButton).not.toBeNull();

    await act(async () => {
      submitButton?.click();
    });

    const calledPayload = mutationStates.flatMap((state) => state.mutate.mock.calls).at(-1)?.[0];
    expect(calledPayload).toEqual(
      expect.objectContaining({
        id: "event-1",
        data: expect.objectContaining({
          title: "Counselor Training",
          location: "Zoom",
        }),
      }),
    );
  });

  it("opens an event editor from an edit query parameter", async () => {
    editorLockState.isReadOnly = false;
    window.history.pushState(
      {},
      "",
      "/admin/events?edit=event-2&returnTo=%2Fevents%2Fglobal-families-welcome-circle",
    );
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    expect(
      document.body.querySelector('[data-testid="text-event-dialog-title"]')?.textContent,
    ).toBe("Edit Event");
    expect(
      (document.body.querySelector('[data-testid="input-event-title"]') as HTMLInputElement | null)
        ?.value,
    ).toBe("Global Families Welcome Circle");
  });

  it("converts paid event fees between stored cents and admin-entered dollars", () => {
    expect(centsToDollarInput(40000)).toBe("400.00");
    expect(centsToDollarInput(undefined)).toBe("");
    expect(dollarInputToCents("400")).toBe(40000);
    expect(dollarInputToCents("125.50")).toBe(12550);
    expect(dollarInputToCents("")).toBeUndefined();
  });

  it("shows guided event preset and custom intake form controls", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    const createButton = document.body.querySelector(
      '[data-testid="button-create-event"]',
    ) as HTMLButtonElement | null;
    expect(createButton).not.toBeNull();

    await act(async () => {
      createButton?.click();
    });

    expect(document.body.querySelector('[data-testid="select-event-type"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="select-event-category"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="input-event-tags"]')).not.toBeNull();
  });

  it("opens the inline venue creation dialog and requires a venue name", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    const createButton = document.body.querySelector(
      '[data-testid="button-create-event"]',
    ) as HTMLButtonElement | null;
    expect(createButton).not.toBeNull();

    await act(async () => {
      createButton?.click();
    });

    const createVenueButton = document.body.querySelector(
      '[data-testid="button-create-venue"]',
    ) as HTMLButtonElement | null;
    expect(createVenueButton).not.toBeNull();

    await act(async () => {
      createVenueButton?.click();
    });

    expect(document.body.querySelector('[data-testid="input-venue-name"]')).not.toBeNull();

    const submitVenueButton = document.body.querySelector(
      '[data-testid="button-submit-venue"]',
    ) as HTMLButtonElement | null;
    await act(async () => {
      submitVenueButton?.click();
    });

    expect(document.body.textContent).toContain("Venue name is required");
    expect(mutationStates.at(-1)?.mutate).not.toHaveBeenCalled();
  });

  it("creates a saved venue and applies returned location data to the event", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminEventsPage));
    });

    const createButton = document.body.querySelector(
      '[data-testid="button-create-event"]',
    ) as HTMLButtonElement | null;
    expect(createButton).not.toBeNull();

    await act(async () => {
      createButton?.click();
    });

    const createVenueButton = document.body.querySelector(
      '[data-testid="button-create-venue"]',
    ) as HTMLButtonElement | null;
    await act(async () => {
      createVenueButton?.click();
    });

    await act(async () => {
      setControlValue(
        document.body.querySelector('[data-testid="input-venue-name"]') as HTMLInputElement,
        "Core Platform Studio",
      );
      setControlValue(
        document.body.querySelector('[data-testid="input-venue-address"]') as HTMLInputElement,
        "120 Monroe Center St NW",
      );
      setControlValue(
        document.body.querySelector('[data-testid="input-venue-city"]') as HTMLInputElement,
        "Grand Rapids",
      );
      setControlValue(
        document.body.querySelector('[data-testid="input-venue-region"]') as HTMLInputElement,
        "MI",
      );
      setControlValue(
        document.body.querySelector('[data-testid="input-venue-postal-code"]') as HTMLInputElement,
        "49503",
      );
      setControlValue(
        document.body.querySelector('[data-testid="input-venue-phone"]') as HTMLInputElement,
        "+1 (616) 555-0100",
      );
      setControlValue(
        document.body.querySelector('[data-testid="input-venue-email"]') as HTMLInputElement,
        "events@example.com",
      );
      setControlValue(
        document.body.querySelector(
          '[data-testid="textarea-venue-parking"]',
        ) as HTMLTextAreaElement,
        "Validated garage parking is available next door.",
      );
    });

    const submitVenueButton = document.body.querySelector(
      '[data-testid="button-submit-venue"]',
    ) as HTMLButtonElement | null;
    await act(async () => {
      submitVenueButton?.click();
    });

    const createVenueCall = mutationStates
      .flatMap((state) => state.mutate.mock.calls)
      .find((call) => call[0]?.name === "Core Platform Studio");
    expect(createVenueCall).toEqual([
      expect.objectContaining({
        name: "Core Platform Studio",
        address: "120 Monroe Center St NW",
        city: "Grand Rapids",
        region: "MI",
        postalCode: "49503",
        phone: "+1 (616) 555-0100",
        email: "events@example.com",
        parkingInfo: "Validated garage parking is available next door.",
      }),
      expect.any(Object),
    ]);

    const onSuccess = createVenueCall?.[1]?.onSuccess as
      | ((venue: (typeof mockVenues)[number]) => void)
      | undefined;

    await act(async () => {
      onSuccess?.({
        ...mockVenues[0],
        id: "venue-2",
        name: "Core Platform Studio",
        slug: "core-platform-studio",
        address: "120 Monroe Center St NW",
        city: "Grand Rapids",
        region: "MI",
        postalCode: "49503",
        latitude: "42.9634",
        longitude: "-85.6681",
      });
    });

    expect(
      (
        document.body.querySelector(
          '[data-testid="input-event-location"]',
        ) as HTMLInputElement | null
      )?.value,
    ).toBe("Core Platform Studio");
    expect(
      (
        document.body.querySelector(
          '[data-testid="input-event-location-name"]',
        ) as HTMLInputElement | null
      )?.value,
    ).toBe("Core Platform Studio");
    expect(
      (
        document.body.querySelector(
          '[data-testid="input-event-location-address"]',
        ) as HTMLInputElement | null
      )?.value,
    ).toBe("120 Monroe Center St NW, Grand Rapids, MI, 49503, US");
    expect(
      (
        document.body.querySelector(
          '[data-testid="input-event-latitude"]',
        ) as HTMLInputElement | null
      )?.value,
    ).toBe("42.9634");
    expect(
      (
        document.body.querySelector(
          '[data-testid="input-event-longitude"]',
        ) as HTMLInputElement | null
      )?.value,
    ).toBe("-85.6681");
    expect(document.body.querySelector('[data-testid="input-venue-name"]')).toBeNull();
  });
});
