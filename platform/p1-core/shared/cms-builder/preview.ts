import { z } from "zod";
import type { BlockInstance } from "./block-registry.shared";

export const CMS_BUILDER_PREVIEW_VERSION = 1;
export const CMS_BUILDER_PREVIEW_PATH = "/cms-preview/builder";
export const CMS_BUILDER_PREVIEW_LIMITS = {
  bytes: 1024 * 1024,
  blocks: 200,
  depth: 16,
  nodes: 50000,
} as const;
const envelope = z
  .object({
    type: z.literal("p1:builder-preview"),
    version: z.literal(CMS_BUILDER_PREVIEW_VERSION),
    channel: z.string().uuid(),
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    blocks: z
      .array(
        z
          .object({
            id: z.string().min(1).max(160),
            type: z.string().min(1).max(160),
            props: z.record(z.unknown()),
          })
          .passthrough(),
      )
      .max(CMS_BUILDER_PREVIEW_LIMITS.blocks),
  })
  .strict();
export type BuilderPreviewMessage = z.infer<typeof envelope>;

/** Draft-only transport validation. It neither publishes nor authorizes a storage read.
 * HTML sanitization and an interaction-disabled renderer remain separate responsibilities.
 */
export function parseBuilderPreviewMessage(value: unknown): BuilderPreviewMessage | null {
  let nodes = 0;
  const ancestors = new Set<object>();
  function bounded(current: unknown, depth: number): boolean {
    if (++nodes > CMS_BUILDER_PREVIEW_LIMITS.nodes || depth > CMS_BUILDER_PREVIEW_LIMITS.depth)
      return false;
    if (current === null || typeof current === "boolean" || typeof current === "string")
      return true;
    if (typeof current === "number") return Number.isFinite(current);
    if (typeof current !== "object" || ancestors.has(current)) return false;
    if (Array.isArray(current) && current.length > CMS_BUILDER_PREVIEW_LIMITS.nodes) return false;
    if (
      !Array.isArray(current) &&
      Object.getPrototypeOf(current) !== Object.prototype &&
      Object.getPrototypeOf(current) !== null
    )
      return false;
    ancestors.add(current);
    const valid = Object.keys(current).every((key) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") return false;
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      return Boolean(descriptor && "value" in descriptor && bounded(descriptor.value, depth + 1));
    });
    ancestors.delete(current);
    return valid;
  }
  try {
    if (!bounded(value, 0)) return null;
    if (
      new TextEncoder().encode(JSON.stringify(value)).byteLength > CMS_BUILDER_PREVIEW_LIMITS.bytes
    )
      return null;
    const result = envelope.safeParse(value);
    if (!result.success) return null;
    const ids = new Set(result.data.blocks.map((block) => block.id));
    return ids.size === result.data.blocks.length ? result.data : null;
  } catch {
    return null;
  }
}

export function isBuilderPreviewOrigin(value: string): boolean {
  try {
    const origin = new URL(value);
    return (
      origin.origin === value &&
      ["https:", "http:"].includes(origin.protocol) &&
      !origin.username &&
      !origin.password
    );
  } catch {
    return false;
  }
}

export function acceptBuilderPreviewMessage(
  event: { origin: string; source: unknown; data: unknown },
  expected: { origin: string; source: unknown; channel: string; afterRevision: number },
): BuilderPreviewMessage | null {
  // Never accept opaque origins, wildcard origins, missing windows or stale frames.
  if (!isBuilderPreviewOrigin(expected.origin)) return null;
  if (!expected.source || event.source !== expected.source || event.origin !== expected.origin)
    return null;
  const message = parseBuilderPreviewMessage(event.data);
  return message &&
    message.channel === expected.channel &&
    message.revision > expected.afterRevision
    ? message
    : null;
}

export function createBuilderPreviewMessage(
  channel: string,
  revision: number,
  blocks: BlockInstance[],
): BuilderPreviewMessage {
  const message = parseBuilderPreviewMessage({
    type: "p1:builder-preview",
    version: CMS_BUILDER_PREVIEW_VERSION,
    channel,
    revision,
    blocks,
  });
  if (!message) throw new Error("Draft is too large or invalid for the builder preview");
  return message;
}
