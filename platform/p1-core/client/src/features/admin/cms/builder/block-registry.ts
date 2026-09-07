import { BASE_BLOCK_REGISTRY } from "./base-block-registry";
import { BASE_DYNAMIC_BLOCK_TYPES } from "./dynamic-block-registry";
import {
  LEGACY_BLOCK_TYPE_ALIASES,
  withSharedSectionHeading,
  withSharedSectionStyles,
  withSharedVisibility,
} from "./block-registry.shared";
import type { BlockDef, BlockInstance } from "./block-registry.shared";

export type {
  BlockCategory,
  BlockDef,
  BlockInstance,
  BuilderContent,
  PropDef,
  PropType,
} from "./block-registry.shared";

const FULL_WIDTH_BLOCK_TYPES = new Set([
  "hero",
  "join-hero",
  "join-registration-form",
  "events-archive",
  "video-archives",
  "directory-browser",
  "portfolio-grid",
  "cta",
  "trust-bar",
  "divider",
  "slider",
  "stats-bar",
]);

export const BLOCK_REGISTRY: BlockDef[] = BASE_BLOCK_REGISTRY.map((block) => {
  const blockWithHeading = withSharedSectionHeading(block);
  if (block.type === "hero") {
    return withSharedVisibility(blockWithHeading);
  }
  return withSharedVisibility(
    withSharedSectionStyles(blockWithHeading, {
      includeImageControls: true,
      includePaddingControls: !FULL_WIDTH_BLOCK_TYPES.has(block.type),
    }),
  );
});

export const DYNAMIC_BLOCK_TYPES: BlockDef[] = BASE_DYNAMIC_BLOCK_TYPES.map((block) =>
  withSharedVisibility(
    withSharedSectionStyles(withSharedSectionHeading(block), {
      includePaddingControls: !FULL_WIDTH_BLOCK_TYPES.has(block.type),
    }),
  ),
);

export const ALL_BLOCKS: BlockDef[] = [...BLOCK_REGISTRY, ...DYNAMIC_BLOCK_TYPES];

export function normalizeBlockType(type: string): string {
  return LEGACY_BLOCK_TYPE_ALIASES[type] ?? type;
}

export function getBlockDef(type: string): BlockDef | undefined {
  const normalizedType = normalizeBlockType(type);
  return ALL_BLOCKS.find((b) => b.type === normalizedType);
}

export function isDynamicBlock(type: string): boolean {
  const def = getBlockDef(type);
  return def?.isDynamic === true;
}

export function createBlock(type: string): BlockInstance {
  const def = getBlockDef(type);
  if (!def) throw new Error(`Unknown block type: ${type}`);
  return {
    id: crypto.randomUUID(),
    type,
    props: { ...def.defaultProps },
  };
}
