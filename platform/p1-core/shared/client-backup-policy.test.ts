import { describe, expect, it } from "vitest";
import {
  DEFAULT_BACKUP_BUCKET_NAME,
  getClientBackupPrefix,
  getClientStoragePrefix,
} from "./client-backup-policy";

describe("client storage policy", () => {
  it("uses the shared template bucket name", () => {
    expect(DEFAULT_BACKUP_BUCKET_NAME).toBe("core-platform-website-backups");
  });

  it("uses the selected public domain as the default client folder", () => {
    expect(getClientStoragePrefix("better-farms-foundation", "https://www.better-farms.org")).toBe(
      "clients/better-farms.org",
    );
    expect(getClientBackupPrefix("better-farms-foundation", "https://www.better-farms.org")).toBe(
      "clients/better-farms.org/backups",
    );
  });

  it("preserves an explicit backup prefix for a controlled migration", () => {
    expect(
      getClientBackupPrefix(
        "better-farms-foundation",
        "https://better-farms.org",
        "/clients/better-farms.org/backups/",
      ),
    ).toBe("clients/better-farms.org/backups");
  });

  it("uses the stable stack ID only until a public domain is configured", () => {
    expect(getClientStoragePrefix("better-farms-foundation", undefined)).toBe(
      "clients/better-farms-foundation",
    );
  });
});
