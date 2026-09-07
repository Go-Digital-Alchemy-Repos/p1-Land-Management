export type BackupRestoreIdentityKind = "exact-match" | "legacy-explicit";

export type BackupRestoreIdentityDecision =
  | { allowed: true; kind: BackupRestoreIdentityKind }
  | { allowed: false; reason: string };

interface BackupIdentityManifest {
  clientStackId?: string | null;
}

interface BackupRestoreIdentityOptions {
  targetStackId?: string | null;
  allowLegacyBackup?: boolean;
}

function normalizeStackId(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

export function evaluateBackupRestoreIdentity(
  manifest: BackupIdentityManifest,
  options: BackupRestoreIdentityOptions = {},
): BackupRestoreIdentityDecision {
  const targetStackId = normalizeStackId(options.targetStackId);
  if (!targetStackId) {
    return {
      allowed: false,
      reason: "Restore requires CLIENT_STACK_ID for the target stack.",
    };
  }

  const backupStackId = normalizeStackId(manifest.clientStackId);
  if (!backupStackId) {
    if (options.allowLegacyBackup) {
      return { allowed: true, kind: "legacy-explicit" };
    }

    return {
      allowed: false,
      reason:
        "Backup has no clientStackId. Refuse legacy backups by default; use --allow-legacy-backup only after duplicate-environment review.",
    };
  }

  if (backupStackId !== targetStackId) {
    return {
      allowed: false,
      reason: `Backup clientStackId ${backupStackId} does not match target CLIENT_STACK_ID ${targetStackId}.`,
    };
  }

  return { allowed: true, kind: "exact-match" };
}

export function assertBackupRestoreIdentity(
  manifest: BackupIdentityManifest,
  options: BackupRestoreIdentityOptions = {},
) {
  const decision = evaluateBackupRestoreIdentity(manifest, options);
  if (!decision.allowed) {
    throw new Error(decision.reason);
  }
  return decision;
}
