// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ getAgreementDraft: vi.fn(), listAgreementDrafts: vi.fn() }));
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("../src/agreements/AgreementDraftEditor", () => ({ default: ({ row }: { row: { title: string } }) => <p>Editing {row.title}</p> }));
vi.mock("../src/agreements/AgreementDraftCreate", () => ({ default: () => null }));
import AgreementDraftWorkspace from "../src/agreements/AgreementDraftWorkspace";

let host: HTMLDivElement;
let root: Root;
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("shows a failed draft deep link with an explicit retry and no misleading list", async () => {
  api.getAgreementDraft.mockRejectedValueOnce(new Error("Draft unavailable"))
    .mockResolvedValueOnce({ id, title: "Synthetic draft", version: 1 });
  await act(async () => {
    root.render(<AgreementDraftWorkspace id={id} canEdit canManageTemplates opened={vi.fn()} />);
    await Promise.resolve();
  });
  expect(host.textContent).toContain("Could not load this agreement draft");
  expect(host.textContent).not.toContain("No agreement drafts yet");
  expect(host.querySelector('a[href="/agreements/drafts"]')).not.toBeNull();
  await act(async () => {
    host.querySelector<HTMLButtonElement>("button")?.click();
    await Promise.resolve();
  });
  expect(api.getAgreementDraft).toHaveBeenCalledTimes(2);
  expect(host.textContent).toContain("Editing Synthetic draft");
});
