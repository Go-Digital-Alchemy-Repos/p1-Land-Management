import { createPublicSettingsStore } from "./public-settings.mjs";
function font(value) {
  if (value === null) return null;
  if (
    !value ||
    Object.keys(value).sort().join(",") !== "fallback,name" ||
    typeof value.name !== "string" ||
    !/^[A-Za-z][A-Za-z0-9 ]{0,59}$/.test(value.name) ||
    !["serif", "sans-serif"].includes(value.fallback)
  )
    throw Error("Invalid font");
  return value;
}
export function fontStyles(data) {
  if (
    !data ||
    Object.keys(data).sort().join(",") !==
      "body,heading,schemaVersion,stackId" ||
    data.schemaVersion !== 1 ||
    data.stackId !== "p1-land-management"
  )
    throw Error("Invalid typography");
  const body = font(data.body),
    heading = font(data.heading),
    rules = [];
  if (body) rules.push(`--app-font-sans:'${body.name}',${body.fallback}`);
  if (heading)
    rules.push(
      `--app-font-serif:'${heading.name}',${heading.fallback}`,
      `--app-font-display:'${heading.name}',${heading.fallback}`,
    );
  if (!rules.length) return "";
  const names = [
    ...new Set([body?.name, heading?.name].filter(Boolean)),
  ].sort();
  const query = names
    .map((name) => `family=${encodeURIComponent(name)}:wght@400;700`)
    .join("&amp;");
  return `<link id="p1-website-font-source" rel="stylesheet" href="https://fonts.googleapis.com/css2?${query}&amp;display=swap"><style id="p1-website-fonts">:root:root{${rules.join(";")}}</style>`;
}
export function createWebsiteFontStore(options) {
  return createPublicSettingsStore({
    ...options,
    path: "/api/p1/website-fonts",
    parse: fontStyles,
    fallback: () => "",
  });
}
