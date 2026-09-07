import manifest from "@/assets/image-manifest.json";

const urls = import.meta.glob<string>("../assets/optimized/**/*.{webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});
const urlFor = (file: string) => urls[`../assets/${file}`];
const images = new Map(Object.values(manifest).map((image) => [urlFor(image.default), image]));

/** Props for locally managed images; unknown/CMS upload URLs retain their own behavior. */
export function responsiveImageProps(src: unknown, sizes = "(max-width: 767px) 100vw, 50vw") {
  const image = typeof src === "string" ? images.get(src) : undefined;
  if (!image) return {};
  return {
    srcSet: image.variants.filter((variant) => variant.format === "webp")
      .map((variant) => `${urlFor(variant.path)} ${variant.width}w`).join(", "),
    sizes,
    width: image.width,
    height: image.height,
    decoding: "async" as const,
  };
}

/** Use on a <source type="image/avif"> inside <picture> when explicitly supported. */
export function avifImageSource(src: string, sizes = "100vw") {
  const image = images.get(src);
  if (!image) return undefined;
  return {
    type: "image/avif",
    srcSet: image.variants.filter((variant) => variant.format === "avif")
      .map((variant) => `${urlFor(variant.path)} ${variant.width}w`).join(", "),
    sizes,
  };
}
