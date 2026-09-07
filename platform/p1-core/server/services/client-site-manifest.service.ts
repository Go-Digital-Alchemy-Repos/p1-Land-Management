import { readFile } from "node:fs/promises";
import {
  type ClientSiteManifest,
  type ClientSiteManifestError,
  validateClientSiteManifest,
} from "../../shared/client-site-manifest";

export class ClientSiteManifestLoadError extends Error {
  constructor(
    message: string,
    readonly errors: ClientSiteManifestError[] = [],
  ) {
    super(message);
    this.name = "ClientSiteManifestLoadError";
  }
}

export async function loadClientSiteManifest(
  manifestPath: string,
  corePlatformVersion: string,
): Promise<ClientSiteManifest> {
  let input: unknown;
  try {
    input = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    throw new ClientSiteManifestLoadError("Client site manifest could not be read or parsed.");
  }

  const result = validateClientSiteManifest(input);
  if (!result.success) {
    throw new ClientSiteManifestLoadError("Client site manifest failed validation.", result.errors);
  }

  const compatibility = result.data.compatibility.corePlatform;
  if (compareVersions(corePlatformVersion, compatibility.minimum) < 0) {
    throw new ClientSiteManifestLoadError(
      `Core Platform ${corePlatformVersion} is below the manifest minimum ${compatibility.minimum}.`,
    );
  }
  if (
    compatibility.maximumExclusive &&
    compareVersions(corePlatformVersion, compatibility.maximumExclusive) >= 0
  ) {
    throw new ClientSiteManifestLoadError(
      `Core Platform ${corePlatformVersion} is outside the manifest compatibility range.`,
    );
  }

  return result.data;
}

function compareVersions(left: string, right: string): number {
  const parse = (value: string) => value.split("-", 1)[0].split(".").map(Number);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
