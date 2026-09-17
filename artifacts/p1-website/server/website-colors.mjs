import { createPublicSettingsStore } from "./public-settings.mjs";
const variables = {
  brand_primary_color: ["primary"],
  brand_secondary_color: ["secondary"],
  brand_tertiary_color: ["accent", "ring"],
  brand_quaternary_color: ["quaternary", "clay"],
  text_h1_color: ["public-text-h1"],
  text_h2_color: ["public-text-h2"],
  text_h3_h6_color: ["public-text-h3"],
  text_body_color: [
    "foreground",
    "card-foreground",
    "popover-foreground",
    "public-text-body",
  ],
  text_heading_subtext_color: ["public-text-heading-subtext"],
  text_supporting_copy_color: ["public-text-supporting-copy"],
  text_helper_text_color: ["muted-foreground", "public-text-helper"],
  text_meta_color: ["public-text-meta"],
  text_link_color: ["public-text-link"],
  text_link_hover_color: ["public-text-link-hover"],
  text_inverse_color: ["public-text-inverse"],
  text_primary_foreground_color: ["primary-foreground"],
  text_secondary_foreground_color: ["secondary-foreground"],
  text_tertiary_foreground_color: ["accent-foreground"],
};
const selectors = {
  text_h1_color: "h1",
  text_h2_color: "h2",
  text_h3_h6_color: "h3,h4,h5,h6",
  text_heading_subtext_color: ".public-heading-subtext",
  text_supporting_copy_color: ".public-supporting-copy",
  text_helper_text_color: ".public-helper-text",
  text_meta_color: ".public-meta",
  text_link_color: ".public-link",
  text_link_hover_color: ".public-link:hover",
  text_inverse_color: ".public-inverse",
};
function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map(
    (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min,
    l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let h =
    delta === 0
      ? 0
      : max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
export function colorStyles(data) {
  if (
    !data ||
    Object.keys(data).sort().join(",") !== "colors,schemaVersion,stackId" ||
    data.schemaVersion !== 1 ||
    data.stackId !== "p1-land-management" ||
    !data.colors ||
    Array.isArray(data.colors) ||
    typeof data.colors !== "object"
  )
    throw Error("Invalid palette");
  const declarations = [],
    rules = [];
  for (const [key, value] of Object.entries(data.colors)) {
    if (
      !Object.hasOwn(variables, key) ||
      typeof value !== "string" ||
      !/^#[0-9a-fA-F]{6}$/.test(value)
    )
      throw Error("Invalid color");
    for (const variable of variables[key])
      declarations.push(`--${variable}:${hsl(value)}`);
    if (selectors[key]) rules.push(`${selectors[key]}{color:${value}}`);
  }
  return declarations.length
    ? `<style id="p1-website-colors">:root:root{${declarations.join(";")}}${rules.join("")}</style>`
    : "";
}
export function createWebsiteColorStore(options) {
  return createPublicSettingsStore({
    ...options,
    path: "/api/p1/website-colors",
    parse: colorStyles,
    fallback: () => "",
  });
}
