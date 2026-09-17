import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ enabled: vi.fn(), resolve: vi.fn(), send: vi.fn() }));
vi.mock("./federation-client", () => ({
  federationEnabled: mocks.enabled,
  federationConfig: () => ({ issuer: "https://dashboard.example.test" }),
  createFederationClient: () => ({ formNotificationRecipient: mocks.resolve }),
}));
vi.mock("./email.service", () => ({ deliverManagedFormNotification: mocks.send }));
import { deliverDashboardFormNotification } from "./dashboard-form-notification.service";
const payload = {
  kind: "dashboard_form_notification" as const,
  formId: "form",
  subject: "account",
  formName: "Inquiry",
  summary: "Submitted text",
  contact: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.enabled.mockReturnValue(true);
  mocks.send.mockResolvedValue("completed");
});
it("uses the current account email and canonical dashboard link", async () => {
  mocks.resolve.mockResolvedValue({ subject: "account", email: "new-address@example.test" });
  expect(await deliverDashboardFormNotification(payload)).toBe("completed");
  expect(mocks.resolve).toHaveBeenCalledWith("form", "account");
  expect(mocks.send).toHaveBeenCalledWith({
    recipient: "new-address@example.test",
    formName: "Inquiry",
    summary: "Submitted text",
    contact: null,
    dashboardUrl: "https://dashboard.example.test/marketing/content/forms",
  });
  expect(payload).not.toHaveProperty("recipient");
});
it("skips revoked recipients and retries lookup or provider failures without fallback", async () => {
  mocks.resolve.mockResolvedValue(null);
  expect(await deliverDashboardFormNotification(payload)).toBe("skipped");
  expect(mocks.send).not.toHaveBeenCalled();
  mocks.resolve.mockRejectedValue(new Error("unavailable"));
  await expect(deliverDashboardFormNotification(payload)).rejects.toThrow("unavailable");
  expect(mocks.send).not.toHaveBeenCalled();
  mocks.resolve.mockResolvedValue({ subject: "account", email: "new-address@example.test" });
  mocks.send.mockRejectedValue(new Error("transport unavailable"));
  await expect(deliverDashboardFormNotification(payload)).rejects.toThrow("transport unavailable");
  mocks.enabled.mockReturnValue(false);
  await expect(deliverDashboardFormNotification(payload)).rejects.toThrow(
    "dashboard_form_notifications_unavailable",
  );
});
