export interface CmsBuilderBlock {
  id: string;
  type: string;
  props?: Record<string, unknown> | null;
}

function propsOf(block: CmsBuilderBlock): Record<string, unknown> {
  return block.props && typeof block.props === "object" ? block.props : {};
}

export function mergeJoinHeroBlocks<T extends CmsBuilderBlock>(blocks: T[]): T[] {
  const merged: T[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const nextBlock = blocks[index + 1];

    if (block?.type === "join-hero" && nextBlock?.type === "join-registration-form") {
      merged.push({
        ...nextBlock,
        props: {
          ...propsOf(block),
          ...propsOf(nextBlock),
        },
      } as T);
      index += 1;
      continue;
    }

    merged.push(block);
  }

  return merged;
}
