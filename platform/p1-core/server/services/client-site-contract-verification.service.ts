import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import type { ClientSiteManifest } from "../../shared/client-site-manifest";
import { loadClientSiteManifest } from "./client-site-manifest.service";

export type ClientSiteContractVerification = {
  valid: boolean;
  stackId?: string;
  checkedFiles: string[];
  errors: Array<{ ref: string; message: string }>;
};

function sourceFileRef(reference: string): string {
  return reference.split("#", 1)[0];
}

function manifestFileRefs(manifest: ClientSiteManifest): string[] {
  return [
    ...manifest.routes.map((route) => sourceFileRef(route.componentRef)),
    ...manifest.assets.map((asset) => asset.sourceRef),
    manifest.theme.tokenSource,
    ...manifest.puck.editableComponents.flatMap((component) => [
      sourceFileRef(component.rendererRef),
      sourceFileRef(component.fieldSchemaRef),
    ]),
  ];
}

function safeSitePath(siteRoot: string, reference: string): string | undefined {
  const resolvedRoot = path.resolve(siteRoot);
  const resolved = path.resolve(resolvedRoot, reference);
  const relative = path.relative(resolvedRoot, resolved);
  if (
    !relative ||
    relative.startsWith(`..${path.sep}`) ||
    relative === ".." ||
    path.isAbsolute(relative)
  ) {
    return undefined;
  }
  return resolved;
}

export async function verifyClientSiteContract(params: {
  manifestPath: string;
  siteRoot: string;
  corePlatformVersion: string;
}): Promise<ClientSiteContractVerification> {
  const manifest = await loadClientSiteManifest(params.manifestPath, params.corePlatformVersion);
  const checkedFiles = [...new Set(manifestFileRefs(manifest))].sort();
  const errors: ClientSiteContractVerification["errors"] = [];

  const resolvedRoot = await realpath(params.siteRoot);
  for (const reference of checkedFiles) {
    const target = safeSitePath(params.siteRoot, reference);
    if (!target) {
      errors.push({ ref: reference, message: "must be a safe path inside the site root" });
      continue;
    }
    try {
      const resolvedTarget = await realpath(target);
      if (!safeSitePath(resolvedRoot, resolvedTarget)) {
        errors.push({ ref: reference, message: "resolves outside the site checkout" });
        continue;
      }
      if (!(await stat(resolvedTarget)).isFile()) {
        errors.push({ ref: reference, message: "must reference a regular file" });
      }
    } catch {
      errors.push({ ref: reference, message: "does not exist in the site checkout" });
    }
  }

  return { valid: errors.length === 0, stackId: manifest.client.stackId, checkedFiles, errors };
}
