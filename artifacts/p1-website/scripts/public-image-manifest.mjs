/**
 * The responsive-image client only needs delivery dimensions and WebP variants.
 * Keep optimization/provenance metadata in the source manifest for build tools.
 */
export function projectResponsiveImageManifest(manifest) {
  return Object.values(manifest).map((image) => {
    const [{ path: firstPath }] = image.variants;
    const pathPrefix = firstPath.replace(/\d+\.webp$/, "");
    // The optimizer's validated, width-suffixed WebP names let the browser
    // reconstruct variant paths without serializing each path three times.
    return [
      image.width,
      image.height,
      pathPrefix,
      image.variants.map(({ width }) => width),
    ];
  });
}
