import { describe, expect, it } from "vitest";
import { evaluateBackupRestoreIdentity } from "./backup-restore-identity";

describe("evaluateBackupRestoreIdentity", () => {
  it("accepts only an exact identified stack match", () => {
    expect(
      evaluateBackupRestoreIdentity(
        { clientStackId: "better-farms-foundation" },
        { targetStackId: "better-farms-foundation" },
      ),
    ).toEqual({ allowed: true, kind: "exact-match" });
  });

  it("rejects a missing target identity", () => {
    expect(
      evaluateBackupRestoreIdentity({ clientStackId: "better-farms-foundation" }),
    ).toMatchObject({ allowed: false, reason: expect.stringContaining("CLIENT_STACK_ID") });
  });

  it("rejects a mismatched identified backup even when legacy backups are allowed", () => {
    expect(
      evaluateBackupRestoreIdentity(
        { clientStackId: "another-client" },
        { targetStackId: "better-farms-foundation", allowLegacyBackup: true },
      ),
    ).toMatchObject({ allowed: false, reason: expect.stringContaining("does not match") });
  });

  it("requires explicit acknowledgement for a legacy backup", () => {
    expect(
      evaluateBackupRestoreIdentity({}, { targetStackId: "better-farms-foundation" }),
    ).toMatchObject({ allowed: false, reason: expect.stringContaining("--allow-legacy-backup") });
    expect(
      evaluateBackupRestoreIdentity(
        { clientStackId: " " },
        { targetStackId: "better-farms-foundation", allowLegacyBackup: true },
      ),
    ).toEqual({ allowed: true, kind: "legacy-explicit" });
  });
});
