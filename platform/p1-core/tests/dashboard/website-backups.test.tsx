// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn(), run: vi.fn() }));
vi.mock("@workspace/api-client-react/dashboard", () => ({
  listWebsiteRestoreOperations:async()=>[],
  getWebsiteBackupStatus: api.get,
  runWebsiteBackup: api.run,
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
  return [...container.querySelectorAll("button")].find((button) => button.textContent === label)!;
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
