// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listManagedUsers: vi.fn(),
  listManagedInvitations: vi.fn(),
  updateManagedUser: vi.fn(),
  createManagedInvitation: vi.fn(),
  revokeManagedUserSessions: vi.fn(),
  retireManagedUser: vi.fn(),
  listManagedUserHistory: vi.fn(),
  resendManagedInvitation: vi.fn(),
  revokeManagedInvitation: vi.fn(),
  updateAccountMfaPolicy: vi.fn(),
  requestManagedPasswordRecovery: vi.fn(),
}));
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("../src/OwnerNotificationEditor", () => ({ OwnerNotificationEditor: () => null }));
import { UserManager } from "../src/UserManager";

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  api.listManagedInvitations.mockResolvedValue({ items: [], nextCursor: null });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("does not show an empty account directory when the initial load fails", async () => {
  api.listManagedUsers.mockRejectedValueOnce(Error("Network unavailable"))
    .mockResolvedValue({ items: [{ id: "owner-1", name: "Test Owner", email: "owner@example.test", role: "owner", active: true, capabilities: [] }] });
  await act(async () => {
    root.render(<UserManager currentUserId="owner-1" clients={[]} onSessionChanged={async () => {}} />);
    await Promise.resolve();
  });
  expect(host.textContent).toContain("Could not load users and invitations");
  expect(host.textContent).not.toContain("No invitations found.");
  expect(host.querySelector<HTMLButtonElement>(".panel-heading button")?.disabled).toBe(true);
  const retry = Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Retry directory");
  expect(retry).toBeTruthy();
  await act(async () => { retry?.click(); await Promise.resolve(); });
  expect(host.textContent).toContain("Test Owner");
  expect(host.querySelector<HTMLButtonElement>(".panel-heading button")?.disabled).toBe(false);
  expect(host.querySelector("dialog[aria-labelledby='user-editor-title']")).not.toBeNull();
});
