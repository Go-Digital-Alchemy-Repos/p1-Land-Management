import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  MarketingGalleryInput,
  MarketingGalleryItem,
} from "../../../../lib/api-client-react/src/dashboard/models";
import "./gallery-preview.css";
const url = (value: string) =>
  value.startsWith("/") && !value.startsWith("//")
    ? `https://www.p1landmanagement.com${value}`
    : value;
/** Local draft renderer: mirrors retained layout controls without fetching public content. */
export function GalleryPreview({
  gallery,
}: {
  gallery: MarketingGalleryInput;
}) {
  const settings = gallery.settings,
    items = settings.maxImages
      ? gallery.items.slice(0, settings.maxImages)
      : gallery.items;
  const [slide, setSlide] = useState(0),
    [active, setActive] = useState<number | null>(null),
    [direction, setDirection] = useState(1),
    [width, setWidth] = useState(window.innerWidth);
  const lightbox = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const resize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    setSlide((index) => Math.min(index, Math.max(0, items.length - 1)));
    setActive(null);
  }, [items.length]);
  useEffect(() => {
    if (active === null) lightbox.current?.close();
    else lightbox.current?.showModal();
  }, [active]);
  const columns =
    width >= 1024
      ? settings.columnsDesktop || 3
      : width >= 640
        ? settings.columnsTablet || 2
        : settings.columnsMobile || 1;
  const gap = { none: 0, sm: 8, md: 16, lg: 24 }[settings.spacing || "md"],
    radius = { none: 0, sm: 4, md: 6, lg: 8 }[settings.borderRadius || "md"];
  const selected = Math.min(slide, Math.max(0, items.length - 1)),
    single = gallery.layout === "slider" || gallery.layout === "featured",
    carousel = gallery.layout === "carousel";
  const visible = single
    ? [selected]
    : carousel
      ? Array.from(
          { length: Math.min(columns, items.length) },
          (_, i) => (selected + i) % items.length,
        )
      : items.map((_, i) => i);
  const ratio =
    settings.imageRatio === "auto"
      ? single || carousel
        ? gallery.layout === "featured"
          ? "16/9"
          : "4/3"
        : "auto"
      : settings.imageRatio || "4/3";
  const controls = {
    backgroundColor: settings.arrowBackgroundColor || "#6b7280",
    color: settings.arrowIconColor || "#ffffff",
  };
  function go(offset: number) {
    setDirection(offset);
    setSlide((selected + offset + items.length) % items.length);
  }
  function caption(item: MarketingGalleryItem) {
    return (
      <>
        {settings.showTitle && item.title && <strong>{item.title}</strong>}
        {settings.showTitle &&
        item.title &&
        settings.showCaptions &&
        item.caption
          ? " — "
          : ""}
        {settings.showCaptions && item.caption}
        {item.linkUrl && item.ctaText && (
          <>
            {" "}
            <span
              title={`Destination: ${item.linkUrl}`}
              className="gallery-preview-cta"
            >
              {item.ctaText}
            </span>
          </>
        )}
      </>
    );
  }
  if (!items.length) return <p>Add images to preview the gallery.</p>;
  return (
    <section
      className={`gallery-preview ${settings.customClassName || ""}`}
      aria-label="Gallery draft preview"
    >
      <p>
        Draft preview. Link labels are shown without navigating away from your
        edits.
      </p>
      <div className="gallery-preview-stage">
        <div
          key={`${selected}:${settings.transitionEffect}:${direction}`}
          data-effect={single || carousel ? settings.transitionEffect : "none"}
          data-direction={direction}
          className={`gallery-preview-images ${gallery.layout === "masonry" ? "gallery-preview-masonry" : ""}`}
          style={
            {
              "--gallery-columns": single ? 1 : columns,
              gap,
              columnGap: gap,
            } as CSSProperties
          }
        >
          {visible.map((index) => {
            const item = items[index];
            return (
              <figure
                key={item.id || index}
                style={{ marginBottom: gallery.layout === "masonry" ? gap : 0 }}
              >
                <button
                  type="button"
                  className="gallery-preview-image"
                  data-hover={settings.hoverEffect}
                  style={{ aspectRatio: ratio, borderRadius: radius }}
                  onClick={() => {
                    if (settings.lightbox) setActive(index);
                  }}
                  aria-label={`Open image ${index + 1}`}
                >
                  <img
                    src={url(item.imageUrl)}
                    alt={item.alt || item.title || gallery.title}
                    style={{ objectFit: settings.cropMode || "cover" }}
                  />
                  {settings.captionPosition === "overlay" && (
                    <span className="gallery-preview-overlay">
                      {caption(item)}
                    </span>
                  )}
                </button>
                {settings.captionPosition !== "overlay" &&
                  (settings.showTitle || settings.showCaptions) && (
                    <figcaption>{caption(item)}</figcaption>
                  )}
              </figure>
            );
          })}
        </div>
        {((single && items.length > 1) ||
          (carousel && items.length > columns)) && (
          <div className="gallery-preview-controls">
            <button
              type="button"
              style={controls}
              onClick={() => go(-1)}
              aria-label="Previous preview image"
            >
              ‹
            </button>
            <button
              type="button"
              style={controls}
              onClick={() => go(1)}
              aria-label="Next preview image"
            >
              ›
            </button>
          </div>
        )}
      </div>
      {single && items.length > 1 && (
        <div className="gallery-preview-thumbnails">
          {items.map((item, index) => (
            <button
              type="button"
              key={item.id || index}
              aria-label={`Show preview image ${index + 1}`}
              aria-current={index === selected ? "true" : undefined}
              onClick={() => {
                setDirection(index > selected ? 1 : -1);
                setSlide(index);
              }}
            >
              {gallery.layout === "featured" ? (
                <img src={url(item.imageUrl)} alt="" />
              ) : (
                index + 1
              )}
            </button>
          ))}
        </div>
      )}
      <dialog
        className="gallery-preview-lightbox"
        ref={lightbox}
        aria-label="Gallery lightbox"
        onCancel={() => setActive(null)}
        onKeyDown={(e) => {
          if (active === null) return;
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            setActive(
              (active + (e.key === "ArrowRight" ? 1 : -1) + items.length) %
                items.length,
            );
          }
        }}
      >
        {active !== null && items[active] && (
          <>
            <button type="button" onClick={() => setActive(null)}>
              Close gallery lightbox
            </button>
            <img
              src={url(items[active].imageUrl)}
              alt={items[active].alt || items[active].title || gallery.title}
            />
            {items.length > 1 && (
              <div>
                <button
                  type="button"
                  style={controls}
                  onClick={() =>
                    setActive((active - 1 + items.length) % items.length)
                  }
                >
                  Previous lightbox image
                </button>
                <button
                  type="button"
                  style={controls}
                  onClick={() => setActive((active + 1) % items.length)}
                >
                  Next lightbox image
                </button>
              </div>
            )}
          </>
        )}
      </dialog>
    </section>
  );
}
