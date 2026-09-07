export type OfflineEntry = {
  origin: string;
  accountId: string;
  displayName: string;
  verifiedAt: string;
  expiresAt: string;
  sessionExpiresAt: string;
  sessionFingerprint: string;
};
export function validateOfflineEntry(
  value: unknown,
  origin: string,
  fingerprint: string,
  now = Date.now(),
): OfflineEntry {
  const entry = value as OfflineEntry;
  if (
    !entry ||
    entry.origin !== origin ||
    typeof entry.accountId !== "string" ||
    !entry.accountId.trim() ||
    typeof fingerprint !== "string" ||
    !fingerprint ||
    typeof entry.sessionFingerprint !== "string" ||
    !entry.sessionFingerprint ||
    typeof entry.displayName !== "string" ||
    entry.sessionFingerprint !== fingerprint
  )
    throw new Error(
      "Offline work is not bound to this session. Reconnect to recover it.",
    );
  if (
    typeof entry.verifiedAt !== "string" ||
    typeof entry.expiresAt !== "string" ||
    typeof entry.sessionExpiresAt !== "string"
  )
    throw new Error("Offline expiry is unavailable.");
  for (const date of [
    entry.verifiedAt,
    entry.expiresAt,
    entry.sessionExpiresAt,
  ]) {
    const parsed = Date.parse(date);
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== date)
      throw new Error("Offline expiry is unavailable.");
  }
  const verified = Date.parse(entry.verifiedAt),
    expiry = Date.parse(entry.expiresAt),
    sessionExpiry = Date.parse(entry.sessionExpiresAt);
  if (
    !Number.isFinite(verified) ||
    !Number.isFinite(expiry) ||
    !Number.isFinite(sessionExpiry) ||
    verified > now ||
    expiry <= now ||
    expiry > sessionExpiry ||
    expiry <= verified
  )
    throw new Error(
      "Offline access has expired. Reconnect to recover saved work.",
    );
  return entry;
}
