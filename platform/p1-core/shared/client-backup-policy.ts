const CLIENT_STACK_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export const DEFAULT_BACKUP_BUCKET_NAME = "core-platform-website-backups";

function getClientFolderFromOrigin(publicSiteOrigin: string | undefined): string | null {
  try {
    const hostname = new URL(publicSiteOrigin || "").hostname.toLowerCase().replace(/^www\./, "");
    return hostname || null;
  } catch {
    return null;
  }
}

/** The shared client root for every object stored by a template installation. */
export function getClientStoragePrefix(
  clientStackId: string | undefined,
  publicSiteOrigin: string | undefined,
): string {
  const domain = getClientFolderFromOrigin(publicSiteOrigin);
  if (domain) return `clients/${domain}`;

  const stackId = clientStackId?.trim().toLowerCase();
  if (stackId && CLIENT_STACK_ID_PATTERN.test(stackId)) return `clients/${stackId}`;

  return "system-backups";
}

/** Resolves the backups folder inside the client namespace. */
export function getClientBackupPrefix(
  clientStackId: string | undefined,
  publicSiteOrigin: string | undefined,
  configuredPrefix?: string,
): string {
  const explicitPrefix = configuredPrefix?.trim().replace(/^\/+|\/+$/g, "");
  if (explicitPrefix) return explicitPrefix;
  return `${getClientStoragePrefix(clientStackId, publicSiteOrigin)}/backups`;
}
