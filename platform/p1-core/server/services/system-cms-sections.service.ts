import {
  createBlock,
  ALL_BLOCKS,
  type BlockDef,
  type BlockInstance,
  type PropDef,
} from "../../client/src/features/admin/cms/builder/block-registry";
import { storage } from "../storage";
import { logger } from "../utils/logger";

const SYSTEM_SECTION_NAME_PREFIX = "Starter - ";

const LOREM_SHORT = "Lorem ipsum";
const LOREM_TITLE = "Lorem Ipsum Dolor";
const LOREM_SUBTITLE = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
const LOREM_BODY =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
const LOREM_LONG =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
const LOREM_RICHTEXT = `<p>${LOREM_BODY}</p><p>${LOREM_LONG}</p>`;
const STARTER_LIBRARY_BLOCKS = ALL_BLOCKS.filter((block) => !block.isDynamic);

function mapBlockToSectionCategory(block: BlockDef): string {
  if (block.type.includes("hero")) return "hero";
  if (block.type.includes("faq")) return "faq";
  if (block.type.includes("testimonial")) return "testimonials";
  if (block.type.includes("team")) return "team";
  if (
    block.type.includes("card") ||
    block.type.includes("feature") ||
    block.type.includes("benefit") ||
    block.type.includes("stat") ||
    block.type.includes("trust")
  ) {
    return "features";
  }
  if (
    block.category === "conversion" ||
    block.type.includes("cta") ||
    block.type.includes("button")
  ) {
    return "cta";
  }
  if (
    block.category === "content" ||
    block.category === "media" ||
    block.category === "data" ||
    block.category === "dynamic"
  ) {
    return "content";
  }
  return "general";
}

function placeholderTextForKey(key: string): string {
  const normalized = key.toLowerCase();

  if (normalized.includes("question")) return "Lorem ipsum dolor sit amet?";
  if (normalized.includes("quote")) return LOREM_LONG;
  if (normalized.includes("title") || normalized.includes("heading")) return LOREM_TITLE;
  if (normalized.includes("subtitle") || normalized.includes("subheading")) return LOREM_SUBTITLE;
  if (
    normalized.includes("eyebrow") ||
    normalized.includes("badge") ||
    normalized.includes("label")
  )
    return LOREM_SHORT;
  if (normalized.includes("caption")) return "Lorem ipsum dolor sit amet.";
  if (
    normalized.includes("description") ||
    normalized.includes("answer") ||
    normalized.includes("response")
  )
    return LOREM_BODY;
  if (normalized.includes("body") || normalized.includes("content")) return LOREM_BODY;
  if (normalized.includes("cta") || normalized.includes("button")) return "Lorem Ipsum";
  if (normalized.includes("name")) return "Lorem Ipsum";
  if (normalized.includes("role")) return "Dolor Sit";
  if (normalized.includes("location") || normalized.includes("address")) return "Lorem ipsum dolor";
  if (normalized.includes("milestone") || normalized.includes("step")) return "Lorem ipsum";
  if (normalized.includes("value")) return "Lorem ipsum";
  if (normalized.includes("disclaimer")) return LOREM_SUBTITLE;
  return LOREM_BODY;
}

function placeholderValueForProp(prop: PropDef, existingValue: unknown): unknown {
  switch (prop.type) {
    case "text":
      if (prop.key.toLowerCase().includes("icon")) {
        return typeof existingValue === "string" && existingValue.trim().length > 0
          ? existingValue
          : "Sparkles";
      }
      return placeholderTextForKey(prop.key);
    case "textarea":
      return placeholderTextForKey(prop.key);
    case "richtext":
      return LOREM_RICHTEXT;
    case "url":
      return prop.key.toLowerCase().includes("video") ? "" : "/";
    case "image-url":
      return "";
    case "select":
      return existingValue ?? prop.options?.[0]?.value ?? "";
    case "boolean":
      return typeof existingValue === "boolean" ? existingValue : false;
    case "number":
      return typeof existingValue === "number" ? existingValue : (prop.min ?? 0);
    case "color":
      return typeof existingValue === "string" ? existingValue : "#ffffff";
    case "array-items": {
      const schema = prop.itemSchema ?? [];
      const currentItems = Array.isArray(existingValue) ? existingValue : [];
      const sourceItems =
        currentItems.length > 0 ? currentItems : Array.from({ length: 2 }, () => ({}));
      return sourceItems.map((item) => {
        const itemRecord =
          typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
        const nextItem: Record<string, unknown> = {};
        for (const field of schema) {
          nextItem[field.key] = placeholderValueForProp(field as PropDef, itemRecord[field.key]);
        }
        return nextItem;
      });
    }
    default:
      return existingValue;
  }
}

function createPlaceholderBlock(block: BlockDef): BlockInstance {
  const instance = createBlock(block.type);
  const nextProps: Record<string, unknown> = { ...instance.props };

  for (const prop of block.propDefs) {
    nextProps[prop.key] = placeholderValueForProp(prop, nextProps[prop.key]);
  }

  return {
    ...instance,
    props: nextProps,
  };
}

function buildStarterSectionRecord(block: BlockDef) {
  return {
    name: `${SYSTEM_SECTION_NAME_PREFIX}${block.label}`,
    description: `System starter section for the ${block.label} block with placeholder Latin content.`,
    category: mapBlockToSectionCategory(block),
    blocks: [createPlaceholderBlock(block)],
  };
}

export async function ensureSystemCmsSections(options?: { refreshExisting?: boolean }) {
  const result = await storage.cmsSections.ensureSystemSections(
    {
      name: "Team",
      description:
        "Select team members and choose a portrait grid, bordered cards, or horizontal profiles.",
      category: "team",
      blocks: [createBlock("team")],
    },
    STARTER_LIBRARY_BLOCKS.map(buildStarterSectionRecord),
    options?.refreshExisting ?? false,
  );
  logger.cms.info("Ensured system CMS reusable sections", {
    ...result,
    refreshExisting: options?.refreshExisting ?? false,
  });
  return result;
}
