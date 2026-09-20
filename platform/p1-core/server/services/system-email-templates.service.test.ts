import { expect, it, vi } from "vitest";
vi.mock("../db", () => ({ db: {} }));
import { SYSTEM_EMAIL_TEMPLATE_DEFAULTS } from "./system-email-templates.service";
it("brands account defaults without changing their delivery variables", () => {
  const reset = SYSTEM_EMAIL_TEMPLATE_DEFAULTS.find(row => row.slug === "password-reset")!;
  const welcome = SYSTEM_EMAIL_TEMPLATE_DEFAULTS.find(row => row.slug === "welcome-new-user")!;
  expect(reset.subject).toBe("Reset Your P1 Password");
  expect(reset.variables).toEqual(["firstName", "resetUrl"]);
  expect(welcome.subject).toBe("Welcome to P1 Land & Property Management!");
  expect(welcome.htmlBody).toContain("P1 Land &amp; Property Management");
  expect(welcome.variables).toEqual(["firstName", "loginUrl", "tempPassword"]);
  expect(welcome.htmlBody).toContain("{{loginUrl}}");
  expect([reset,welcome].some(row => /Core Platform/.test(row.subject+row.htmlBody))).toBe(false);
});
