import React from "react";
import { Play, Image } from "lucide-react";
import { Button, FormModalButton } from "./static-renderer-host";
import { getImageObjectPositionStyle } from "../../../../lib/image-focus";
import { SectionHeading } from "./section-heading";
import { LucideIcon } from "./block-icons";
import {
  SectionStyleWrapper,
  DEFAULT_SECTION_LINEAR_GRADIENT,
  getSectionPaddingClasses,
  getSectionStyleConfig,
  hasSectionStyleConfig,
  hexToRgba,
  normalizeHexColor,
} from "./section-style";
import {
  arr,
  colorStyle,
  getMobileImageStyles,
  getVimeoId,
  getYouTubeId,
  IMAGE_WIDTH_MAP,
  num,
  resolveCmsAssetUrl,
  str,
} from "./block-renderer.shared";
export function HeroBlock({ props }: { props: Record<string, unknown> }) {
  const bg = resolveCmsAssetUrl(str(props.backgroundImageUrl));
  const videoBg = str(props.videoBackgroundUrl);
  const opacity = num(props.overlayOpacity as number, 50);
  const overlayColor = normalizeHexColor(str(props.overlayColor)) || "#000000";
  const layout = str(props.layout) || "stacked";
  const badge = str(props.badge);
  const accentHeading = str(props.accentHeading);
  const minH = str(props.minHeight) || "420";
  const minHeightStyle = minH === "100vh" ? "100vh" : `${minH}px`;
  const bgPosX = Math.max(0, Math.min(100, num(props.backgroundPositionX as number, 50)));
  const bgPosY = Math.max(0, Math.min(100, num(props.backgroundPositionY as number, 50)));
  const isSplit = layout === "split";
  const overlayStrength = Math.max(0, Math.min(opacity, 100)) / 100;
  const sectionStyleConfig = getSectionStyleConfig(props, { resolveAssetUrl: resolveCmsAssetUrl });
  const overlayStyle = { backgroundColor: hexToRgba(overlayColor, overlayStrength) };
  const headingTextStyle = colorStyle(props.headingColor);
  const accentHeadingTextStyle = colorStyle(props.accentHeadingColor);
  const subheadingTextStyle = colorStyle(props.subheadingColor);

  return (
    <section
      className={`relative flex items-center overflow-hidden ${isSplit ? "justify-start text-left" : "justify-center text-center"}`}
      style={{
        minHeight: minHeightStyle,
        ...(sectionStyleConfig.backgroundColor
          ? { backgroundColor: sectionStyleConfig.backgroundColor }
          : {}),
        ...(bg && !videoBg
          ? {
              backgroundImage: `url(${bg})`,
              backgroundSize: "cover",
              backgroundPosition: `${bgPosX}% ${bgPosY}%`,
            }
          : !videoBg && !sectionStyleConfig.backgroundColor
            ? { background: DEFAULT_SECTION_LINEAR_GRADIENT }
            : {}),
      }}
    >
      {videoBg && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoBg} type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0" style={overlayStyle} />
      <div className={`relative z-10 px-8 py-16 ${isSplit ? "max-w-2xl" : "max-w-3xl mx-auto"}`}>
        {badge && (
          <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-semibold mb-4 border border-accent/30">
            {badge}
          </span>
        )}
        <h1
          className="text-4xl md:text-5xl font-heading font-bold text-white mb-4 leading-tight"
          style={headingTextStyle}
        >
          {str(props.heading) || "Hero Heading"}
          {accentHeading && (
            <>
              {" "}
              <span className="text-accent" style={accentHeadingTextStyle}>
                {accentHeading}
              </span>
            </>
          )}
        </h1>
        {str(props.subheading) && (
          <div
            className={`text-lg text-white/80 mb-8 [&_a]:text-white [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-white/80 [&_p]:m-0 ${isSplit ? "" : "max-w-xl mx-auto"}`}
            style={subheadingTextStyle}
            dangerouslySetInnerHTML={{ __html: str(props.subheading) }}
          />
        )}
        <div className={`flex flex-wrap gap-3 ${isSplit ? "justify-start" : "justify-center"}`}>
          {str(props.ctaText) && (
            <FormModalButton
              label={str(props.ctaText)}
              action={props.ctaAction}
              href={props.ctaLink}
              openInNewTab={props.ctaOpenInNewTab}
              formSlug={props.ctaFormSlug}
              modalTitle={props.ctaModalTitle}
              modalDescription={props.ctaModalDescription}
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              testId="hero-cta-primary"
            />
          )}
          {str(props.ctaSecondaryText) && (
            <FormModalButton
              label={str(props.ctaSecondaryText)}
              action={props.ctaSecondaryAction}
              href={props.ctaSecondaryLink}
              openInNewTab={props.ctaSecondaryOpenInNewTab}
              formSlug={props.ctaSecondaryFormSlug}
              modalTitle={props.ctaSecondaryModalTitle}
              modalDescription={props.ctaSecondaryModalDescription}
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              testId="hero-cta-secondary"
            />
          )}
        </div>
      </div>
      {isSplit && bg && (
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-1/3">
          <img src={bg} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </section>
  );
}

export function ButtonGroupBlock({ props }: { props: Record<string, unknown> }) {
  const align = str(props.alignment) || "center";
  const justifyClass =
    align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
  const buttons = arr<{
    text: string;
    link: string;
    variant: string;
    action?: string;
    openInNewTab?: boolean;
    formSlug?: string;
    modalTitle?: string;
    modalDescription?: string;
  }>(props.buttons);
  return (
    <div className="py-4">
      <SectionHeading
        props={props}
        defaultAlignment={align === "right" ? "right" : align === "center" ? "center" : "left"}
        className="mb-6"
      />
      <div className={`flex flex-wrap gap-3 ${justifyClass}`}>
        {buttons.length === 0 ? (
          <p className="text-muted-foreground text-sm">Add buttons to display here</p>
        ) : (
          buttons.map((btn, i) => (
            <FormModalButton
              key={i}
              label={btn.text}
              action={btn.action}
              href={btn.link}
              openInNewTab={btn.openInNewTab}
              formSlug={btn.formSlug}
              modalTitle={btn.modalTitle}
              modalDescription={btn.modalDescription}
              variant={
                btn.variant === "outline" ||
                btn.variant === "secondary" ||
                btn.variant === "ghost" ||
                btn.variant === "destructive"
                  ? btn.variant
                  : "default"
              }
              size="lg"
              testId={`button-group-${i}`}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function RawHtmlBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div
        className="prose prose-sm max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: str(props.html) || "" }}
      />
    </div>
  );
}

export function ImageBlockRenderer({ props }: { props: Record<string, unknown> }) {
  const widthClass = IMAGE_WIDTH_MAP[str(props.width)] ?? IMAGE_WIDTH_MAP.contained;
  const hasImage = !!str(props.imageUrl);
  const mobileImageStyles = getMobileImageStyles(props);
  return (
    <div className={`py-4 ${widthClass}`}>
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      {hasImage ? (
        <div>
          <img
            src={str(props.imageUrl)}
            alt={str(props.alt)}
            style={mobileImageStyles}
            className="w-full rounded-xl [height:var(--mobile-image-height)] [object-fit:var(--mobile-image-fit)] [object-position:var(--mobile-image-position)] md:h-auto md:object-cover md:object-center"
          />
          {str(props.caption) && (
            <p className="text-xs text-muted-foreground text-center mt-2">{str(props.caption)}</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Image className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Image placeholder</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function VideoEmbedBlock({ props }: { props: Record<string, unknown> }) {
  const url = str(props.url);
  const ytId = url ? getYouTubeId(url) : null;
  const vimeoId = url ? getVimeoId(url) : null;
  const aspect = str(props.aspectRatio) || "16/9";
  const paddingMap: Record<string, string> = { "16/9": "56.25%", "4/3": "75%", "1/1": "100%" };
  const paddingBottom = paddingMap[aspect] ?? "56.25%";
  return (
    <div className="py-4">
      <SectionHeading
        props={props}
        defaultAlignment="left"
        className="mb-4"
        titleClassName="font-medium text-base"
      />
      {!url ? (
        <div className="rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Play className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Enter a YouTube or Vimeo URL</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden" style={{ paddingBottom }}>
          {ytId && (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {vimeoId && (
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}`}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
            />
          )}
          {!ytId && !vimeoId && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
              <p className="text-sm text-muted-foreground">Enter a valid YouTube or Vimeo URL</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
