/** Keep the complete authored location collection available to build tools. */
export function projectLocationPage(manifest, route) {
  const page = manifest.find((item) => item.path === route);
  if (!page) throw Error(`No location-page manifest entry for ${route}`);
  return [page];
}
