import manifest from "@/assets/image-manifest.json";

const urls = import.meta.glob<string>("../assets/optimized/**/*.webp", {
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
