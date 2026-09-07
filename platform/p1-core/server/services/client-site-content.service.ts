import { createHash } from "node:crypto";
import path from "node:path";
import { validateClientSiteComponentContent } from "@shared/client-site-content-contract";
import type { ClientSiteManifest } from "@shared/client-site-manifest";
import type { ClientSiteContent } from "@shared/schema";
import { loadClientSiteManifest } from "./client-site-manifest.service";

export const DEFAULT_CLIENT_SITE_MANIFEST_PATH = path.resolve(
  process.cwd(),
  "config/p1-client-site-manifest.json",
);

export async function loadConfiguredClientSiteManifest(): Promise<ClientSiteManifest> {
  if (process.env.NODE_ENV === "production" && !process.env.CLIENT_SITE_MANIFEST_PATH) {
    throw new Error("Configured manifest path is required in production");
  }
  return loadClientSiteManifest(
    process.env.CLIENT_SITE_MANIFEST_PATH || DEFAULT_CLIENT_SITE_MANIFEST_PATH,
    process.env.CLIENT_SITE_CORE_VERSION || "1.0.0",
  );
}

export function resolveClientSiteComponent(
  manifest: ClientSiteManifest,
  routeId: string,
  componentKey: string,
) {
  const route = manifest.routes.find((candidate) => candidate.id === routeId);
  if (!route) throw new Error("Client site route is not declared");
  if (componentKey === "site-chrome" && routeId !== "home") throw new Error("Client site shared content belongs to home");
  const component = manifest.puck.editableComponents.find(
    (candidate) => candidate.key === componentKey,
  );
  if (
    !component ||
    !route.editableRegions.some((region) => component.allowedRegions.includes(region))
  ) {
    throw new Error("Client site component is not editable on this route");
  }
  return { route, component };
}

export function contentIdentity(
  manifest: ClientSiteManifest,
  routeId: string,
  componentKey: string,
) {
  resolveClientSiteComponent(manifest, routeId, componentKey);
  return { stackId: manifest.client.stackId, routeId, componentKey };
}

export function serializeAdminContent(
  manifest: ClientSiteManifest,
  routeId: string,
  componentKey: string,
  record?: ClientSiteContent,
) {
  const { route, component } = resolveClientSiteComponent(manifest, routeId, componentKey);
  return {
    stackId: manifest.client.stackId,
    route,
    component,
    previewUrl: `${manifest.origins.publicSite}${route.path}?cmsPreview=1&cmsComponent=${encodeURIComponent(componentKey)}`,
    draftContent: record?.draftContent ?? component.defaultContent,
    draftRevision: record?.draftRevision ?? 0,
    publishedRevision: record?.publishedRevision ?? null,
    publishedAt: record?.publishedAt ?? null,
  };
}

export function parseComponentContent(
  manifest: ClientSiteManifest,
  routeId: string,
  componentKey: string,
  input: unknown,
) {
  const { component } = resolveClientSiteComponent(manifest, routeId, componentKey);
  return validateClientSiteComponentContent(component, input);
}

export function publishedContentEtag(record: ClientSiteContent): string {
  const digest = createHash("sha256")
    .update(
      `${record.stackId}:${record.routeId}:${record.componentKey}:${record.publishedRevision}:`,
    )
    .update(JSON.stringify(record.publishedContent))
    .digest("base64url");
  return `"${digest}"`;
}
