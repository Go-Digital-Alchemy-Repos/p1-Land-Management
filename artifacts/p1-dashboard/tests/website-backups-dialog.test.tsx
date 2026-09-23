// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getWebsiteBackupStatus: vi.fn(),
  restoreWebsiteBackup: vi.fn(),
  runWebsiteBackup: vi.fn(),
}));
vi.mock("@workspace/api-client-react/dashboard", () => api);
import WebsiteBackups from "../src/marketing/WebsiteBackups";

const archive = {
  key: "synthetic-archive",
  createdAt: "2026-09-22T12:00:00.000Z",
  reason: "test",
  tableCount: 1,
  totalRowCount: 1,
  mediaAssetCount: 0,
  clientStackId: "synthetic-stack",
  gitCommitSha: "synthetic-revision",
  appVersion: "test",
  environment: "test",
  storageSource: "test",
};
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  api.getWebsiteBackupStatus.mockResolvedValue({
    configured: true,
    enabled: true,
    intervalHours: 24,
    retentionDays: 30,
    maxSnapshots: 10,
    storage: null,
    latest: archive,
    recent: [archive],
  });
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("opens restore confirmation as a native modal and preserves the exact-key safeguard", async () => {
  await act(async () => {
    root.render(<WebsiteBackups />);
    await Promise.resolve();
  });
  const trigger = Array.from(host.querySelectorAll<HTMLButtonElement>("button"))
    .find((button) => button.textContent?.includes("Restore this archive"));
  expect(trigger).toBeTruthy();
  trigger?.focus();
  await act(async () => trigger?.click());

  const dialog = host.querySelector<HTMLDialogElement>("dialog.backup-restore-dialog");
  expect(dialog?.open).toBe(true);
  expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();
  expect(dialog?.querySelector<HTMLInputElement>("input")?.matches(":focus")).toBe(true);
  expect(dialog?.querySelector<HTMLButtonElement>(".backup-toolbar button:last-child")?.disabled).toBe(true);
  expect(dialog?.textContent).toContain("RESTORE synthetic-archive");

  await act(async () => dialog?.dispatchEvent(new Event("cancel", { bubbles: false, cancelable: true })));
  expect(host.querySelector("dialog.backup-restore-dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(api.restoreWebsiteBackup).not.toHaveBeenCalled();
});
