import type { BlockDef, PropDef } from "./block-registry.shared";

function humanizeBlockType(type: string) {
  return type.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferFallbackPropDef(key: string, value: unknown): PropDef | null {
  if (typeof value === "boolean") {
    return { key, label: humanizeBlockType(key), type: "boolean" };
  }

  if (typeof value === "number") {
    return { key, label: humanizeBlockType(key), type: "number" };
  }

  if (typeof value === "string") {
    const normalizedKey = key.toLowerCase();
    const label = humanizeBlockType(key);

    if (normalizedKey.includes("image") && normalizedKey.includes("url")) {
      return { key, label, type: "image-url", placeholder: "Upload or select image" };
    }

    if (
      normalizedKey.endsWith("link") ||
      normalizedKey.endsWith("url") ||
      normalizedKey.includes("link")
    ) {
      return { key, label, type: "url", placeholder: "Enter a link" };
    }

    if (value.includes("<") || value.includes("\n") || value.length > 140) {
      return { key, label, type: "textarea", placeholder: `Enter ${label.toLowerCase()}` };
    }

    return { key, label, type: "text", placeholder: `Enter ${label.toLowerCase()}` };
  }

  return null;
}

export function createFallbackBlockDef(
  blockType: string,
  values: Record<string, unknown>,
): BlockDef {
  const propDefs = Object.entries(values)
    .map(([key, value]) => inferFallbackPropDef(key, value))
    .filter((propDef): propDef is PropDef => Boolean(propDef));

  return {
    type: blockType,
    label: `${humanizeBlockType(blockType)} (Compatibility Mode)`,
    iconName: "Settings2",
    description:
      "This block is using a compatibility editor because its normal inspector fields could not be loaded.",
    category: "content",
    defaultProps: values,
    propDefs,
  };
}
