export type ProtectedStorageStatus = Readonly<{
  queuedPhotoCount: number;
  queuedPhotoBytes: number;
  availableBytes: number | null;
  totalBytes: number | null;
  severity: "normal" | "low" | "critical" | "unavailable";
}>;

const MiB = 1024 * 1024;
const LOW_FREE_BYTES = 500 * MiB;
const CRITICAL_FREE_BYTES = 100 * MiB;
const STAGING_RESERVE_BYTES = 25 * MiB;

const validSize = (value: number) => Number.isFinite(value) && value >= 0;

function displayedSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MiB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MiB).toFixed(1)} MB`;
}

export function protectedStorageStatus(input: {
  queuedPhotoCount: number;
  queuedPhotoBytes: number;
  availableBytes: number;
  totalBytes: number;
}): ProtectedStorageStatus {
  const availableBytes = validSize(input.availableBytes)
    ? Math.floor(input.availableBytes)
    : null;
  const totalBytes = validSize(input.totalBytes) ? Math.floor(input.totalBytes) : null;
  const queuedPhotoBytes = Math.max(0, Math.floor(input.queuedPhotoBytes));
  const queuedPhotoCount = Math.max(0, Math.floor(input.queuedPhotoCount));
  if (availableBytes === null)
    return {
      queuedPhotoCount,
      queuedPhotoBytes,
      availableBytes: null,
      totalBytes,
      severity: "unavailable",
    };
  const lowThreshold = totalBytes === null ? LOW_FREE_BYTES : Math.min(LOW_FREE_BYTES, totalBytes * 0.05);
  const criticalThreshold = totalBytes === null ? CRITICAL_FREE_BYTES : Math.min(CRITICAL_FREE_BYTES, totalBytes * 0.01);
  return {
    queuedPhotoCount,
    queuedPhotoBytes,
    availableBytes,
    totalBytes,
    severity:
      availableBytes <= criticalThreshold
        ? "critical"
        : availableBytes <= lowThreshold
          ? "low"
          : "normal",
  };
}

/** This only blocks a newly captured cache image before its encrypted BLOB write. */
export function photoStagingCapacityError(
  status: ProtectedStorageStatus,
  photoBytes: number,
) {
  if (status.availableBytes === null || !validSize(photoBytes) || photoBytes === 0)
    return null;
  const required = Math.ceil(photoBytes) + STAGING_RESERVE_BYTES;
  if (status.availableBytes >= required) return null;
  return `Device storage is too low to securely save this photo. Keep saved work in place, free device space, then try again. This photo was not added to the protected queue.`;
}

export function protectedStorageMessage(status: ProtectedStorageStatus) {
  const queued = `${status.queuedPhotoCount} protected queued photo${status.queuedPhotoCount === 1 ? "" : "s"} (${displayedSize(status.queuedPhotoBytes)}).`;
  if (status.availableBytes === null)
    return `${queued} Device free space could not be read. Pending work is unchanged.`;
  const free = `Device free space: ${displayedSize(status.availableBytes)}.`;
  if (status.severity === "critical")
    return `${queued} ${free} Storage is critically low. Sync when connected or free device space; pending work will not be removed automatically.`;
  if (status.severity === "low")
    return `${queued} ${free} Storage is low. Sync when connected or free device space before taking more photos; pending work will not be removed automatically.`;
  return `${queued} ${free}`;
}
