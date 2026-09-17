export function isInsertableSavedSection(
  section: {
    name: string;
    blocks: readonly unknown[];
  },
  isDynamic: (type: string) => boolean,
): boolean {
  return !(
    section.name.startsWith("Starter - ") &&
    section.blocks.some(
      (block) =>
        block !== null &&
        typeof block === "object" &&
        "type" in block &&
        typeof block.type === "string" &&
        isDynamic(block.type),
    )
  );
}

/** Saved sections are copied, not linked. Preserve unknown data while assigning
 * fresh block identities so repeated inserts never share selection keys. */
export function cloneSavedSectionBlocks<T extends object>(
  blocks: readonly T[],
  makeId: () => string = () => crypto.randomUUID(),
): Array<T & { id: string }> {
  return blocks.map((block) => ({ ...structuredClone(block), id: makeId() }));
}
