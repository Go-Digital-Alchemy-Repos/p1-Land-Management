import { z } from "zod";

export const CLIENT_SITE_PREVIEW_PROTOCOL_VERSION = "1.0" as const;
export const CLIENT_SITE_PREVIEW_MESSAGE_TYPE = "core-platform:client-site-preview" as const;
export const CLIENT_SITE_PREVIEW_READY_TYPE = "core-platform:client-site-preview-ready" as const;

const identifier = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);

export const clientSitePreviewMessageSchema = z
  .object({
    type: z.literal(CLIENT_SITE_PREVIEW_MESSAGE_TYPE),
    protocolVersion: z.literal(CLIENT_SITE_PREVIEW_PROTOCOL_VERSION),
    clientStackId: identifier,
    routeId: identifier,
    componentKey: identifier,
    revision: z.number().int().nonnegative(),
    content: z.record(z.unknown()),
  })
  .strict();

export type ClientSitePreviewMessage = z.infer<typeof clientSitePreviewMessageSchema>;

export const clientSitePreviewReadySchema = z
  .object({
    type: z.literal(CLIENT_SITE_PREVIEW_READY_TYPE),
    protocolVersion: z.literal(CLIENT_SITE_PREVIEW_PROTOCOL_VERSION),
    clientStackId: identifier,
    routeId: identifier,
    componentKey: identifier,
  })
  .strict();
