import { createPublicSettingsStore } from "./public-settings.mjs";
const platforms = new Set([
  "facebook",
  "instagram",
  "linkedin",
  "x",
  "tiktok",
  "youtube",
  "pinterest",
  "houzz",
  "yelp",
  "nextdoor",
]);
export function parseWebsiteSocial(data) {
  if (
    !data ||
    Object.keys(data).sort().join(",") !==
      "iconStyle,links,schemaVersion,stackId" ||
    data.schemaVersion !== 1 ||
    data.stackId !== "p1-land-management" ||
    !["brand", "outline", "solid"].includes(data.iconStyle) ||
    !Array.isArray(data.links) ||
    data.links.length > 10
  )
    throw Error("Invalid social projection");
  const seen = new Set();
  const links = data.links.map((link) => {
    if (
      !link ||
      Object.keys(link).sort().join(",") !== "platform,url" ||
      !platforms.has(link.platform) ||
      seen.has(link.platform) ||
      typeof link.url !== "string" ||
      link.url.length > 2048 ||
      /[\u0000-\u0020\u007f\\]/.test(link.url)
    )
      throw Error("Invalid social link");
    const url = new URL(link.url);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password
    )
      throw Error("Invalid social URL");
    seen.add(link.platform);
    return { platform: link.platform, url: link.url };
  });
  return { iconStyle: data.iconStyle, links };
}
export function createWebsiteSocialStore(options) {
  return createPublicSettingsStore({
    ...options,
    path: "/api/p1/website-social",
    parse: parseWebsiteSocial,
    fallback: () => ({ iconStyle: "brand", links: [] }),
    maxBytes: 32768,
  });
}
