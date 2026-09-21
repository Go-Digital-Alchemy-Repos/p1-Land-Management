type ResponsiveImageManifest = Array<[
  width: number,
  height: number,
  pathPrefix: string,
  variantWidths: number[],
]>;

declare module "virtual:p1-responsive-image-manifest" {
  const manifest: ResponsiveImageManifest;
  export default manifest;
}
