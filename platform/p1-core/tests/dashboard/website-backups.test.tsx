// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn(), run: vi.fn(), restore: vi.fn() }));
vi.mock("@workspace/api-client-react/dashboard", () => ({
  getWebsiteBackupStatus: api.get,
  runWebsiteBackup: api.run,
  restoreWebsiteBackup: api.restore,
}));
import WebsiteBackups from "../../../../artifacts/p1-dashboard/src/marketing/WebsiteBackups";
const backup = {
  schemaVersion: 1,
  clientStackId: "p1-land-management",
  key: "clients/p1/backups/db/fixture.gz",
  createdAt: "2026-09-19T14:00:00Z",
  reason: "manual",
  appVersion: "1",
  gitCommitSha: "abc123",
  environment: "fixture",
  storageSource: "env",
  tableCount: 20,
  totalRowCount: 100,
  mediaAssetCount: 4,
};
const snapshot = {
  enabled: false,
  configured: true,
  intervalHours: 24,
  retentionDays: 30,
  maxSnapshots: 30,
  storage: { source: "env", bucketName: "fixture", prefix: "clients/p1/backups" },
  latest: backup,
  recent: [backup],
};
let container: HTMLDivElement, root: Root;
beforeEach(async () => {
  vi.resetAllMocks();
  api.get.mockResolvedValue(snapshot);
  api.run.mockResolvedValue(backup);
  api.restore.mockResolvedValue({ restored: true, manifest: backup });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<WebsiteBackups />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
function button(label: string) {
  return [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === label)!;
}
async function click(label: string) {
  await act(async () => button(label).click());
}
it("loads status only and distinguishes scheduler from storage with Eastern dates", () => {
  expect(api.run).not.toHaveBeenCalled();
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("Scheduler: Disabled");
  expect(container.textContent).toContain("Storage configuration: Configured");
  expect(container.textContent).toContain("09/19/2026 10:00am");
  expect(container.textContent).toContain("not backed-up media files");
});
it("does not run when confirmation is cancelled", async () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  await click("Create manual backup");
  expect(api.run).not.toHaveBeenCalled();
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("delete older backups"));
});
it("shows confirmed completion without stale retention history", async () => {
  await click("Create manual backup");
  expect(api.run).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("Manual backup completed");
  expect(container.textContent).not.toContain("Recent backups");
  expect(button("Create manual backup").disabled).toBe(true);
});
it("blocks duplicates while a request is pending", async () => {
  let resolve!: (value: unknown) => void;
  api.run.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  await act(async () => {
    button("Create manual backup").click();
    button("Create manual backup").click();
  });
  expect(api.run).toHaveBeenCalledTimes(1);
  await act(async () => resolve(backup));
});
it("requires successful explicit refresh and inspection after uncertain mutation", async () => {
  api.run.mockRejectedValueOnce(Error("network"));
  await click("Create manual backup");
  expect(button("Create manual backup").disabled).toBe(true);
  expect(api.run).toHaveBeenCalledTimes(1);
  api.get.mockRejectedValueOnce(Error("network"));
  await click("Refresh status");
  expect(container.querySelector<HTMLInputElement>("input[type=checkbox]")!.disabled).toBe(true);
  await click("Refresh status");
  expect(button("Create manual backup").disabled).toBe(true);
  await act(async () => container.querySelector<HTMLInputElement>("input[type=checkbox]")!.click());
  expect(button("Create manual backup").disabled).toBe(false);
  expect(api.run).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("does not cancel an in-flight backup");
});
it("shows refresh errors without claiming fresh status", async () => {
  api.get.mockRejectedValueOnce(Error("offline"));
  await click("Refresh status");
  expect(button("Create manual backup").disabled).toBe(true);
  expect(container.querySelector("[role=alert]")?.textContent).toContain(
    "Previously displayed status may be stale",
  );
  await click("Create manual backup");
  expect(api.run).not.toHaveBeenCalled();
  await click("Refresh status");
  expect(button("Create manual backup").disabled).toBe(false);
});
it("disables creation when storage is unavailable", async () => {
  api.get.mockResolvedValueOnce({
    ...snapshot,
    configured: false,
    storage: null,
    recent: [],
    latest: null,
  });
  await click("Refresh status");
  expect(button("Create manual backup").disabled).toBe(true);
  expect(container.textContent).toContain("No readable backup");
});
async function typeRestoreConfirmation(value: string) {
  const input = container.querySelector<HTMLInputElement>("#backup-restore-confirmation")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("does not restore on entry, cancellation, or a partial archive-key confirmation", async () => {
  expect(api.restore).not.toHaveBeenCalled();
  await click("Restore this archive");
  expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  expect(button("Restore database").disabled).toBe(true);
  await typeRestoreConfirmation("RESTORE other");
  expect(button("Restore database").disabled).toBe(true);
  await click("Cancel");
  expect(api.restore).not.toHaveBeenCalled();
});
it("keeps legacy archives behind a separate recovery review", async () => {
  api.get.mockResolvedValueOnce({ ...snapshot, recent: [{ ...backup, clientStackId: null }] });
  await click("Refresh status");
  expect(button("Legacy archive requires separate recovery review").disabled).toBe(true);
  expect(api.restore).not.toHaveBeenCalled();
});
it("sends one exact-key restore, then invalidates old history and prompts live verification", async () => {
  await click("Restore this archive");
  await typeRestoreConfirmation(`RESTORE ${backup.key}`);
  expect(button("Restore database").disabled).toBe(false);
  await click("Restore database");
  expect(api.restore).toHaveBeenCalledTimes(1);
  expect(api.restore.mock.calls[0][0]).toEqual({ key: backup.key, confirmation: `RESTORE ${backup.key}` });
  expect(container.textContent).toContain("Restore completed");
  expect(container.textContent).toContain("Other serving replicas");
  expect(container.textContent).not.toContain("Recent backups");
});
it("treats a timed-out restore as uncertain and blocks another operation until reviewed", async () => {
  api.restore.mockRejectedValueOnce(Error("timeout"));
  await click("Restore this archive");
  await typeRestoreConfirmation(`RESTORE ${backup.key}`);
  await click("Restore database");
  expect(api.restore).toHaveBeenCalledTimes(1);
  expect(button("Create manual backup").disabled).toBe(true);
  expect(container.textContent).toContain("Restore outcome could not be confirmed");
  await click("Refresh status");
  expect(button("Create manual backup").disabled).toBe(true);
  await act(async () => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  expect(button("Create manual backup").disabled).toBe(false);
  expect(api.restore).toHaveBeenCalledTimes(1);
});
