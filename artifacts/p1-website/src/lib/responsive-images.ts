import type { PublicBlogResponsiveCover } from "../../../../platform/p1-core/shared/blog-cover-image-set";
import manifest from "virtual:p1-responsive-image-manifest";

const urls = import.meta.glob<string>("../assets/optimized/**/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const urlFor = (file: string) => urls[`../assets/${file}`];
const images = new Map(
  manifest.map((image) => [urlFor(`${image[2]}${image[3].at(-1)}.webp`), image]),
);

/** Props for locally managed images; unknown/CMS upload URLs retain their own behavior. */
export function responsiveImageProps(
  src: unknown,
  sizes = "(max-width: 767px) 100vw, 50vw",
) {
  const image = typeof src === "string" ? images.get(src) : undefined;
  if (!image) return {};
  return {
    srcSet: image[3]
      .map((width) => `${urlFor(`${image[2]}${width}.webp`)} ${width}w`)
      .join(", "),
    sizes,
    width: image[0],
    height: image[1],
    decoding: "async" as const,
  };
}

/** Explicit, validated public variants take precedence only for their own source. */
export function publishedResponsiveImageProps(
  cover: PublicBlogResponsiveCover | null | undefined,
  sizes = "100vw",
) {
  if (!cover) return {};
  return {
    srcSet: cover.variants
      .map((variant) => `${variant.src} ${variant.width}w`)
      .join(", "),
    sizes,
    width: cover.width,
    height: cover.height,
  };
}
