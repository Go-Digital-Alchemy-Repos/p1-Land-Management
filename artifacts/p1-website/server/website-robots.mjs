import { createHash } from "node:crypto";
import path from "node:path";
import { createPublicSettingsStore } from "./public-settings.mjs";
const hash = content => createHash("sha256").update(content).digest("hex");
export const fallbackRobots = 'User-agent: *\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://www.p1landmanagement.com/sitemap.xml\n';
export function parseWebsiteRobots(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'content,schemaVersion,stackId,version' || data.schemaVersion !== 1 || data.stackId !== 'p1-land-management' || typeof data.content !== 'string' || Buffer.byteLength(data.content, 'utf8') > 32768 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ud800-\udfff]/u.test(data.content) || data.version !== hash(data.content)) throw Error('Invalid robots projection');
  return data;
}
export function createWebsiteRobotsStore({ cacheDir, ...options }) {
  return createPublicSettingsStore({ ...options, path: '/api/p1/website-robots', parse: parseWebsiteRobots,
    fallback: () => ({ schemaVersion: 1, stackId: 'p1-land-management', version: hash(fallbackRobots), content: fallbackRobots }),
    maxBytes: 200000, preserveLastValid: true, cacheFile: cacheDir ? path.join(cacheDir, 'website-robots.json') : undefined });
}
export async function publicRobotsContent(indexableDeployment, store) {
  return indexableDeployment ? (await store.snapshot()).content : 'User-agent: *\nDisallow: /\n';
}
