import { describe, expect, it } from "vitest";
import { readP1FormNotificationRecipients } from "./p1-form-notification-recipients";

describe("private P1 form notification recipients", () => {
  it("normalizes and deduplicates no public data beyond the configured recipients", () => {
    expect(
      readP1FormNotificationRecipients({
        P1_FORM_NOTIFICATION_RECIPIENTS: " Owner-One@example.test,owner-two@example.test ",
      }),
    ).toEqual(["owner-one@example.test", "owner-two@example.test"]);
  });

  it("returns null when development has no private recipient configuration", () => {
    expect(readP1FormNotificationRecipients({})).toBeNull();
  });

  it("rejects invalid or non-two-recipient configuration without echoing its value", () => {
    expect(() =>
      readP1FormNotificationRecipients({ P1_FORM_NOTIFICATION_RECIPIENTS: "invalid" }),
    ).toThrow("must contain exactly two valid email addresses");
  });
});
