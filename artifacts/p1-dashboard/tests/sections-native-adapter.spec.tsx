import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import SectionManager, {
  editableSectionBlocks,
} from "../src/marketing/SectionManager";
const state = vi.hoisted(() => ({
  owned: true,
  verify: vi.fn(async () => {}),
  builder: vi.fn(),
  api: Object.fromEntries(
    [
      "listMarketingSections",
      "getMarketingSection",
      "createMarketingSection",
      "updateMarketingSection",
      "deleteMarketingSection",
      "getMarketingSectionBuilder",
      "refreshMarketingSectionStarters",
    ].map((k) => [k, vi.fn()]),
  ),
}));
vi.mock("@workspace/api-client-react/dashboard", () => state.api);
vi.mock("../src/marketing/NativePageBuilder", () => ({
  NativePageBuilder: (props: any) => {
    state.builder(props);
    return (
      <button
        data-testid="test-add-block"
        disabled={props.disabled}
        onClick={() =>
          props.onChange([
            ...props.blocks,
            { id: "added", type: "hero", props: { title: "new" } },
          ])
        }
      >
        Add test block
      </button>
    );
  },
}));
vi.mock("../src/marketing/builder-primitives", () => {
  const Box = ({ children, className, ...props }: any) => (
    <div {...props} className={className}>
      {children}
    </div>
  );
  const Button = ({ children, variant, size, ...props }: any) => (
    <button {...props}>{children}</button>
  );
  const Select = ({ children, value, onValueChange, ...props }: any) => (
    <select
      {...props}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  );
  return {
    builderPrimitives: {
      Button,
      Card: Box,
      CardContent: Box,
      CardHeader: Box,
      CardTitle: Box,
      Badge: Box,
      Input: (props: any) => <input {...props} />,
      Select,
      SelectTrigger: () => null,
      SelectValue: () => null,
      SelectContent: ({ children }: any) => <>{children}</>,
      SelectItem: ({ children, value }: any) => (
        <option value={value}>{children}</option>
      ),
    },
  };
});
vi.mock("../src/marketing/useSectionReservation", () => ({
  useSectionReservation: () => ({
    owned: state.owned,
    verify: state.verify,
    preconditions: async (version: number) => {
      await state.verify();
      return {
        expectedVersion: version,
        editorInstanceId: "fixture-instance",
        leaseId: "fixture-lease",
      };
    },
    acquire: vi.fn(),
    error: "",
    holder: "Another editor",
  }),
}));
vi.mock("../src/marketing/useCmsUnsavedChanges", () => ({
  useCmsUnsavedChanges: vi.fn(),
}));
vi.mock("../src/marketing/BuilderPreview", () => ({
  BuilderPreview: () => null,
}));
let root: Root, host: HTMLDivElement;
const retained = {
  id: "s",
  version: 1,
  name: "Reusable proof",
  category: "custom",
  description: "Actual section",
  thumbnailUrl: "/image.jpg",
  blocks: [
    {
      id: "legacy",
      type: "future-block",
      props: { preserve: "retained", nested: { safe: true } },
      extra: "untouched",
    },
  ],
  createdAt: "2026-01-01",
};
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  state.owned = true;
  vi.clearAllMocks();
  state.verify.mockResolvedValue(undefined);
  state.api.listMarketingSections.mockResolvedValue([retained]);
  state.api.getMarketingSection.mockResolvedValue(structuredClone(retained));
  state.api.getMarketingSectionBuilder.mockResolvedValue({
    blocks: [],
    aliases: {},
    forms: [],
    pages: [],
    galleries: [],
    team: [],
  });
  state.api.updateMarketingSection.mockImplementation(async (_id, draft) => ({
    ...retained,
    ...draft,
    version: draft.expectedVersion + 1,
  }));
  history.replaceState({}, "", "/");
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function render() {
  await act(async () => root.render(<SectionManager canUseMedia={false} />));
}
async function click(selector: string) {
  await act(async () => {
    (host.querySelector(selector) as HTMLButtonElement).click();
  });
}
async function edit() {
  await render();
  await click('[data-testid="button-edit-section-s"]');
}
it("retains original cards, custom categories, search, and editor structure", async () => {
  await render();
  expect(host.textContent).toContain("Reusable Sections");
  expect(host.querySelector('[data-testid="section-card-s"]')).not.toBeNull();
  expect(host.querySelector('option[value="custom"]')).not.toBeNull();
  await click('[data-testid="button-edit-section-s"]');
  expect(host.textContent).toContain("Section Details");
  expect(host.textContent).toContain("Blocks");
  expect(state.builder.mock.lastCall?.[0]).toMatchObject({
    canUseSections: true,
    canUseMedia: false,
    disabled: false,
  });
  expect(state.builder.mock.lastCall?.[0].canPreviewData).toBeUndefined();
});
it("preserves unknown blocks and thumbnail values through verified saves", async () => {
  await edit();
  await click('[data-testid="button-save-section"]');
  expect(state.verify).toHaveBeenCalled();
  expect(state.api.updateMarketingSection).toHaveBeenCalledWith(
    "s",
    expect.objectContaining({
      expectedVersion: 1,
      editorInstanceId: "fixture-instance",
      leaseId: "fixture-lease",
      thumbnailUrl: "/image.jpg",
      blocks: retained.blocks,
    }),
  );
});
it("retains an edited draft after failed reservation verification and never writes", async () => {
  await edit();
  await click('[data-testid="test-add-block"]');
  state.verify.mockRejectedValueOnce(new Error("Reservation lost"));
  await click('[data-testid="button-save-section"]');
  expect(state.api.updateMarketingSection).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Reservation lost");
  expect(state.builder.mock.lastCall?.[0].blocks).toHaveLength(2);
  expect(state.builder.mock.lastCall?.[0].blocks[0]).toEqual(
    retained.blocks[0],
  );
});
it("makes read-only details and builder inert without losing back navigation", async () => {
  state.owned = false;
  await edit();
  expect((host.querySelector("fieldset") as HTMLElement).inert).toBe(true);
  expect(
    (
      host.querySelector(
        '[data-testid="button-save-section"]',
      ) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(state.builder.mock.lastCall?.[0].disabled).toBe(true);
  expect(
    Array.from(host.querySelectorAll("button")).find(
      (b) => b.textContent === "Sections",
    )?.disabled,
  ).toBe(false);
});
it("guards list deletion with the existing section reservation", async () => {
  await render();
  await click('[data-testid="button-delete-section-s"]');
  state.verify.mockRejectedValueOnce(new Error("Reservation lost"));
  await click('[data-testid="button-confirm-delete-section"]');
  expect(state.api.deleteMarketingSection).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Reservation lost");
  expect(host.querySelector("dialog")).not.toBeNull();
});
it("rejects malformed editor shapes without changing valid unknown-block metadata", () => {
  expect(editableSectionBlocks([{}])).toBe(false);
  expect(editableSectionBlocks([retained.blocks[0], retained.blocks[0]])).toBe(
    false,
  );
  expect(editableSectionBlocks(retained.blocks)).toBe(true);
});

it("advances the saved version only on success and retains it after a stale failure", async () => {
  await edit();
  await click('[data-testid="button-save-section"]');
  await click('[data-testid="test-add-block"]');
  state.api.updateMarketingSection.mockRejectedValueOnce(
    new Error("This section changed. Reload before saving"),
  );
  await click('[data-testid="button-save-section"]');
  expect(
    state.api.updateMarketingSection.mock.lastCall?.[1].expectedVersion,
  ).toBe(2);
  expect(state.builder.mock.lastCall?.[0].blocks).toHaveLength(2);
  expect(host.textContent).toContain("This section changed");
  await click('[data-testid="button-save-section"]');
  expect(
    state.api.updateMarketingSection.mock.lastCall?.[1].expectedVersion,
  ).toBe(2);
});
it("sends list-selected section version and exact lease proof on delete", async () => {
  await render();
  await click('[data-testid="button-delete-section-s"]');
  await click('[data-testid="button-confirm-delete-section"]');
  expect(state.api.deleteMarketingSection).toHaveBeenCalledWith("s", {
    expectedVersion: 1,
    editorInstanceId: "fixture-instance",
    leaseId: "fixture-lease",
  });
});
