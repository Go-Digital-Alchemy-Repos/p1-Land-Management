import type { ReactNode } from "react";
import { ContourField } from "@/components/layout/ContourField";
import { IndexOfWork } from "@/components/layout/IndexOfWork";
import { responsiveImageProps } from "@/lib/responsive-images";

const TAN = "hsl(32 42% 62%)";

interface PageHeroProps {
  /** Small uppercase kicker shown above the headline. */
  eyebrow: string;
  /** Main headline. Pass a string, or a node with an <em className="text-tan"> accent. */
  title: ReactNode;
  /** Optional supporting paragraph under the headline. */
  subtitle?: ReactNode;
  /** Optional background image (rendered at low opacity behind the editorial wash). */
  image?: string;
  imageAlt?: string;
  /** Optional extra content (badges, CTAs) rendered below the subtitle. */
  children?: ReactNode;
  /** Show the "Index of Work" side panel (desktop only). */
  indexOfWork?: boolean;
}

/**
 * Editorial page hero — the topographic / navy treatment used across the site.
 * Mirrors the home hero: low-opacity image, diagonal navy wash, contour-line
 * texture, kicker eyebrow and a left-aligned Fraunces display headline.
 */
export function PageHero({ eyebrow, title, subtitle, image, imageAlt = "", children, indexOfWork }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-navy-deep">
      {image && (
        <div className="absolute inset-0">
          <img src={image} alt={imageAlt} fetchPriority="high" decoding="async" {...responsiveImageProps(image, "100vw")} className="h-full w-full object-cover" style={{ opacity: 0.5 }} />
        </div>
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, hsl(215 50% 11%) 8%, hsl(215 50% 11% / 0.86) 38%, hsl(215 50% 11% / 0.4) 72%, hsl(215 50% 11% / 0.2) 100%)",
        }}
      />
      <div className="absolute inset-0" style={{ mixBlendMode: "soft-light" }}>
        <ContourField stroke={TAN} opacity={0.5} />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-24"
        style={{ background: "linear-gradient(to bottom, transparent, hsl(40 20% 98%))" }}
      />

      <div className="site-shell relative grid grid-cols-12 gap-8 pb-24 pt-24 lg:pb-28 lg:pt-28">
        <div className={indexOfWork ? "col-span-12 lg:col-span-8" : "col-span-12"}>
          <span
            className="inline-flex items-center gap-2 font-sans text-[11px] font-bold uppercase text-clay"
            style={{ letterSpacing: "0.28em" }}
          >
            <span className="inline-block h-px w-7 bg-clay" />
            {eyebrow}
          </span>
          <h1 className="mt-6 max-w-4xl font-display text-[clamp(2.3rem,5vw,4.2rem)] font-light leading-[1.02] tracking-[-0.02em] text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: "hsl(40 20% 92% / 0.82)" }}>
              {subtitle}
            </p>
          )}
          {children && <div className="mt-9">{children}</div>}
        </div>
        {indexOfWork && (
          <div className="col-span-12 hidden lg:col-span-4 lg:flex lg:items-end lg:justify-end">
            <IndexOfWork />
          </div>
        )}
      </div>
    </section>
  );
}
