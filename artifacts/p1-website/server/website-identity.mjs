import { createPublicSettingsStore } from "./public-settings.mjs";
import path from "node:path";
const keys = ["schemaVersion", "stackId", "version", "companyName", "companyAddress", "phoneDisplay", "phoneHref", "logoUrl", "faviconUrl", "googleBusinessUrl"];
function asset(value) {
  if (["/p1-symbol.svg", "/favicon.svg", "/favicon.ico", "/favicon-32.png", "/apple-touch-icon.png"].includes(value)) return true;
  return typeof value === "string" && value.length <= 2048 && /^\/(?:uploads\/cms\/|r2\/cms\/)[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|gif)$/.test(value) && value.slice(1).split("/").every(part => part && part !== "." && part !== "..");
}
export function parseWebsiteIdentity(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).sort().join() !== [...keys].sort().join() || data.schemaVersion !== 1 || data.stackId !== "p1-land-management" || !/^[a-f0-9]{64}$/.test(data.version)) throw Error("Invalid identity projection");
  for (const key of keys.slice(3)) if (data[key] !== null && (typeof data[key] !== "string" || data[key].length > 2048 || /[\u0000-\u001f\u007f]/.test(data[key]))) throw Error("Invalid identity field");
  if (data.companyName !== null && (!data.companyName.trim() || data.companyName.length > 255)) throw Error("Invalid company name");
  if (data.companyAddress !== null && (!data.companyAddress.trim() || data.companyAddress.length > 2000)) throw Error("Invalid address");
  if (data.phoneDisplay !== null && (data.phoneDisplay.length > 80 || !/^\+?[0-9() .-]+$/.test(data.phoneDisplay))) throw Error("Invalid phone display");
  if ((data.phoneDisplay === null) !== (data.phoneHref === null)) throw Error("Incomplete phone");
  if (data.phoneHref !== null) {
    const digits = data.phoneDisplay.replace(/\D/g, "");
    const international = data.phoneDisplay.startsWith("+") ? digits : digits.length === 10 ? `1${digits}` : digits.length === 11 && digits.startsWith("1") ? digits : "";
    if (!/^tel:\+[0-9]{7,15}$/.test(data.phoneHref) || data.phoneHref !== `tel:+${international}`) throw Error("Invalid phone");
  }
  for (const key of ["logoUrl", "faviconUrl"]) if (data[key] !== null && !asset(data[key])) throw Error("Invalid identity image");
  if (data.googleBusinessUrl !== null) {
    if (/[\s\\]/.test(data.googleBusinessUrl)) throw Error("Invalid profile URL");
    const url = new URL(data.googleBusinessUrl);
    if (url.protocol !== "https:" || url.username || url.password || !["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "g.page"].includes(url.hostname)) throw Error("Invalid business profile");
  }
  return Object.fromEntries(keys.map(key => [key, data[key]]));
}
export function createWebsiteIdentityStore({cacheDir, ...options}) {
  return createPublicSettingsStore({...options, path:"/api/p1/website-identity", parse:parseWebsiteIdentity, fallback:()=>null, preserveLastValid:true, cacheFile:cacheDir ? path.join(cacheDir,"website-identity.json") : undefined});
}
export function identityIconHead(html, identity) {
  if (!identity?.faviconUrl) return html;
  const href = `${identity.faviconUrl}?v=${identity.version}`;
  return html.replace(/<link\b[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>/gi, "")
    .replace("</head>", `<link rel="icon" href="${href}" data-p1-identity-icon><link rel="apple-touch-icon" href="${href}" data-p1-identity-icon></head>`);
}
