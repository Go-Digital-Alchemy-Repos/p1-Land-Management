import type { ClientSiteManifest } from "../../shared/client-site-manifest";
import {
  CLIENT_SITE_PREVIEW_MESSAGE_TYPE,
  CLIENT_SITE_PREVIEW_PROTOCOL_VERSION,
  type ClientSitePreviewMessage,
} from "../../shared/client-site-preview";

export function buildClientSitePreviewMessage(
  manifest: ClientSiteManifest,
  input: {
    routeId: string;
    componentKey: string;
    revision: number;
    content: Record<string, unknown>;
  },
): ClientSitePreviewMessage {
  const route = manifest.routes.find((candidate) => candidate.id === input.routeId);
  if (!route) throw new Error("Preview route is not declared by the client site manifest.");

  const component = manifest.puck.editableComponents.find(
    (candidate) => candidate.key === input.componentKey,
  );
  if (!component) throw new Error("Preview component is not declared by the client site manifest.");

  if (!component.allowedRegions.some((region) => route.editableRegions.includes(region))) {
    throw new Error("Preview component is not allowed in the requested route.");
  }

  return {
    type: CLIENT_SITE_PREVIEW_MESSAGE_TYPE,
    protocolVersion: CLIENT_SITE_PREVIEW_PROTOCOL_VERSION,
    clientStackId: manifest.client.stackId,
    routeId: route.id,
    componentKey: component.key,
    revision: input.revision,
    content: input.content,
  };
}
