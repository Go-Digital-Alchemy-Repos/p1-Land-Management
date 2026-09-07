import { TeamSection } from "@/components/shared/team-section";
import { useState, useEffect, lazy, Suspense, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FormModalButton } from "@/components/forms/form-modal-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SectionStyleWrapper,
  DEFAULT_SECTION_LINEAR_GRADIENT,
  getSectionPaddingClasses,
  getSectionStyleConfig,
  hasSectionStyleConfig,
  hexToRgba,
  normalizeHexColor,
} from "@/features/admin/cms/builder/section-style";
import {
  arr,
  colorStyle,
  getMobileImageStyles,
  getVimeoId,
  getYouTubeId,
  IMAGE_WIDTH_MAP,
  num,
  resolveCmsAssetUrl,
  SPACING_MAP,
  str,
} from "@/features/admin/cms/builder/block-renderer.shared";
import { SectionHeading } from "@/features/admin/cms/builder/section-heading";
import { getEventPath } from "@shared/event-url";
import {
  Globe,
  Heart,
  Users,
  MapPin,
  Mail,
  Phone,
  Star,
  CheckCircle,
  Quote,
  UserCheck,
  CalendarDays,
  BookOpen,
  Image,
  Play,
  Minus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  XCircle,
  BadgeCheck,
  ArrowRight,
  Search,
  User,
  ShieldCheck,
  Lock,
  Building2,
  Loader2,
  FolderKanban,
} from "lucide-react";
import type { BlockInstance, BuilderContent } from "@/features/admin/cms/builder/block-registry";
import { mergeJoinHeroBlocks } from "@shared/cms-blocks";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import { FULL_WIDTH_BLOCK_TYPES } from "@/features/admin/cms/builder/page-builder-constants";
import { stripHtml } from "@/lib/html";
import { GalleryRenderer } from "@/components/shared/gallery-renderer";

export type { BlockInstance, BuilderContent };

const LUCIDE_MAP: Record<string, React.ElementType> = {
  Globe,
  Heart,
  Users,
  MapPin,
  Mail,
  Phone,
  Star,
  CheckCircle,
  Quote,
  UserCheck,
  CalendarDays,
  BookOpen,
  Image,
  Play,
  Minus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  XCircle,
  BadgeCheck,
  ArrowRight,
  Search,
  User,
  ShieldCheck,
  Lock,
  Building2,
  FolderKanban,
};

function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Icon = LUCIDE_MAP[name] ?? Globe;
  return <Icon className={className} />;
}

function plainText(value: unknown): string {
  return stripHtml(str(value));
}

function GalleryBlock({ props }: { props: Record<string, unknown> }) {
  const galleryId = str(props.galleryId);
  const layout = str(props.layout) || "inherit";
  return (
    <div className="py-4" data-testid="block-gallery">
      <GalleryRenderer
        galleryId={galleryId}
        overrides={{
          layout: layout === "inherit" ? undefined : layout,
          columnsDesktop: Number(props.columnsDesktop ?? 3),
          columnsTablet: Number(props.columnsTablet ?? 2),
          columnsMobile: Number(props.columnsMobile ?? 1),
          spacing: (str(props.spacing) || "md") as "none" | "sm" | "md" | "lg",
          imageRatio: (str(props.imageRatio) || "4/3") as "auto" | "1/1" | "4/3" | "3/2" | "16/9",
          cropMode: (str(props.cropMode) || "cover") as "cover" | "contain",
          borderRadius: (str(props.borderRadius) || "md") as "none" | "sm" | "md" | "lg",
          hoverEffect: (str(props.hoverEffect) || "zoom") as "none" | "zoom" | "fade",
          maxImages: Number(props.maxImages ?? 0),
          transitionEffect: (str(props.transitionEffect) || "none") as
            | "none"
            | "fade"
            | "slide"
            | "zoom",
          arrowIconColor: str(props.arrowIconColor) || undefined,
          arrowBackgroundColor: str(props.arrowBackgroundColor) || undefined,
          showTitle: props.showTitle === false ? false : undefined,
          showCaptions: props.showCaptions === false ? false : undefined,
          lightbox: props.lightbox === false ? false : undefined,
        }}
      />
    </div>
  );
}

const LazyTherapistMapBlock = lazy(() =>
  import("./public-dynamic-blocks").then((m) => ({ default: m.TherapistMapBlock })),
);
const LazyContactFormBlock = lazy(() =>
  import("./public-dynamic-blocks").then((m) => ({ default: m.ContactFormBlock })),
);
const LazyManagedFormEmbedBlock = lazy(() =>
  import("./public-dynamic-blocks").then((m) => ({ default: m.ManagedFormEmbedBlock })),
);
const LazyJoinHeroBlock = lazy(() =>
  import("./public-dynamic-blocks").then((m) => ({ default: m.JoinHeroBlock })),
);
const LazyJoinRegistrationFormBlock = lazy(() =>
  import("./public-dynamic-blocks").then((m) => ({ default: m.JoinRegistrationFormBlock })),
);
const LazyBlogPostFeedBlock = lazy(() =>
  import("./public-dynamic-blocks").then((m) => ({ default: m.BlogPostFeedBlock })),
);
const LazyBlogFeaturedPostBlock = lazy(() =>
  import("./public-dynamic-blocks").then((m) => ({ default: m.BlogFeaturedPostBlock })),
);
const LazyStandardBlogPageBlock = lazy(() =>
  import("./public-dynamic-blocks").then((m) => ({ default: m.StandardBlogPageBlock })),
);
const LazyEventsArchiveSection = lazy(() =>
  import("@/features/public/events-page").then((m) => ({ default: m.EventsArchiveSection })),
);
const LazyRecordingArchivesSection = lazy(() =>
  import("@/features/public/recording-archives-page").then((m) => ({
    default: m.RecordingArchivesSection,
  })),
);
const LazyDirectoryBrowserSection = lazy(() =>
  import("@/features/directory/directory-page").then((m) => ({
    default: m.DirectoryBrowserSection,
  })),
);
const LazyCareerListingsSection = lazy(() =>
  import("@/features/public/careers-page").then((m) => ({ default: m.CareerListingsSection })),
);
const LazyPortfolioGridSection = lazy(() =>
  import("@/features/public/portfolio-page").then((m) => ({ default: m.PortfolioGridSection })),
);

function DynamicFallback() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function HeroBlock({ props }: { props: Record<string, unknown> }) {
  const bg = resolveCmsAssetUrl(str(props.backgroundImageUrl));
  const videoBg = str(props.videoBackgroundUrl);
  const opacity = num(props.overlayOpacity as number, 50);
  const overlayColor = normalizeHexColor(str(props.overlayColor)) || "#000000";
  const layout = str(props.layout) || "stacked";
  const badge = plainText(props.badge);
  const accentHeading = plainText(props.accentHeading);
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
          {plainText(props.heading) || "Hero Heading"}
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
              label={plainText(props.ctaText)}
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
              label={plainText(props.ctaSecondaryText)}
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

function TwoColumnTextBlock({ props }: { props: Record<string, unknown> }) {
  const leftItems = arr<{ text: string }>(props.leftItems);
  const rightItems = arr<{ text: string }>(props.rightItems);
  const columns = [
    {
      heading: plainText(props.leftHeading),
      body: str(props.leftBody),
      items: leftItems,
    },
    {
      heading: plainText(props.rightHeading),
      body: str(props.rightBody),
      items: rightItems,
    },
  ];

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="grid gap-8 md:grid-cols-2">
        {columns.map((column, index) => (
          <div key={index} className="space-y-4">
            {column.heading && (
              <h3 className="text-xl font-heading font-semibold">{column.heading}</h3>
            )}
            {column.body && (
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: column.body }}
              />
            )}
            {column.items.length > 0 && (
              <ul className="space-y-2 pl-5 list-disc text-sm text-muted-foreground">
                {column.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{plainText(item.text)}</li>
                ))}
              </ul>
            )}
            {!column.heading && !column.body && column.items.length === 0 && (
              <p className="text-sm text-muted-foreground">Add content for this column.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CalloutBoxBlock({ props }: { props: Record<string, unknown> }) {
  const variant = str(props.variant) || "accent";
  const variantClass =
    variant === "neutral"
      ? "bg-muted/40 border"
      : variant === "outline"
        ? "bg-background border-2"
        : "bg-accent/10 border border-accent/20";

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className={`rounded-2xl p-5 sm:p-8 ${variantClass}`}>
        <div
          className="prose prose-sm max-w-none break-words text-foreground"
          dangerouslySetInnerHTML={{ __html: str(props.content) || "<p>Add callout content.</p>" }}
        />
        {str(props.ctaText) && (
          <div className="mt-6">
            <FormModalButton
              label={plainText(props.ctaText)}
              action={props.ctaAction}
              href={props.ctaLink}
              openInNewTab={props.ctaOpenInNewTab}
              formSlug={props.ctaFormSlug}
              modalTitle={props.ctaModalTitle}
              modalDescription={props.ctaModalDescription}
              className="w-full sm:w-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LinkListBlock({ props }: { props: Record<string, unknown> }) {
  const links = arr<{ label: string; description: string; url: string }>(props.links);
  const gridClass = str(props.columns) === "2" ? "md:grid-cols-2" : "md:grid-cols-1";

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className={`grid grid-cols-1 gap-4 ${gridClass}`}>
        {links.length === 0 ? (
          <div className="text-sm text-muted-foreground">Add links to display here.</div>
        ) : (
          links.map((link, index) => (
            <a
              key={index}
              href={link.url || "#"}
              className="group rounded-xl border p-4 transition-shadow hover:shadow-md sm:p-5"
              data-testid={`link-list-item-${index}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold break-words transition-colors group-hover:text-accent">
                    {plainText(link.label) || "Untitled link"}
                  </h3>
                  {link.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {plainText(link.description)}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

function SectionHeaderBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <SectionHeading
      props={props}
      defaultAlignment="center"
      className="py-4"
      titleClassName="text-3xl font-heading font-bold"
      fallbackTitle="Section Title"
    />
  );
}

function RichTextBlock({ props }: { props: Record<string, unknown> }) {
  const align = str(props.alignment) || "left";
  const textAlign =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return (
    <div>
      <SectionHeading
        props={props}
        defaultAlignment={align === "right" ? "right" : align === "center" ? "center" : "left"}
        className="mb-6"
      />
      <div
        className={`prose prose-sm max-w-none ${textAlign} text-foreground`}
        dangerouslySetInnerHTML={{ __html: str(props.content) || "<p>No content.</p>" }}
      />
    </div>
  );
}

function TextImageBlock({ props }: { props: Record<string, unknown> }) {
  const imageRight = str(props.imagePosition) !== "left";
  const hasImage = !!str(props.imageUrl);
  const mobileImageStyles = getMobileImageStyles(props);
  const align = str(props.alignment) || "left";
  const bodyAlign =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <div
      className={`flex flex-col ${imageRight ? "md:flex-row" : "md:flex-row-reverse"} gap-8 py-4 md:items-stretch`}
    >
      <div className="min-w-0 flex-1 space-y-3">
        <SectionHeading
          props={props}
          defaultAlignment={align === "center" ? "center" : align === "right" ? "right" : "left"}
          className="mb-4"
        />
        {str(props.body) && (
          <div
            className={`prose prose-sm max-w-none text-foreground ${bodyAlign}`}
            dangerouslySetInnerHTML={{ __html: str(props.body) }}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 self-stretch flex-col">
        {hasImage ? (
          <div className="flex h-full flex-col">
            <div className="relative min-h-72 md:h-full md:min-h-0 md:flex-1">
              <img
                src={str(props.imageUrl)}
                alt={plainText(props.imageAlt)}
                style={mobileImageStyles}
                className="w-full rounded-xl [height:var(--mobile-image-height)] [object-fit:var(--mobile-image-fit)] [object-position:var(--mobile-image-position)] md:absolute md:inset-0 md:h-full md:w-full md:object-cover md:object-center"
              />
            </div>
            {str(props.imageCaption) && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {plainText(props.imageCaption)}
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed bg-muted/40">
            <span className="text-muted-foreground text-sm">Image placeholder</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CtaBlock({ props }: { props: Record<string, unknown> }) {
  const variant = str(props.variant) || "dark";
  const bgClass =
    variant === "dark"
      ? "bg-foreground text-background"
      : variant === "accent"
        ? "bg-accent text-accent-foreground"
        : "bg-muted/40 border";
  return (
    <div className={`px-4 py-10 text-center sm:px-8 sm:py-14 ${bgClass}`}>
      <h2 className="mb-3 text-2xl font-heading font-bold leading-tight sm:text-3xl md:text-4xl">
        {plainText(props.heading) || "Ready to Get Started?"}
      </h2>
      {str(props.subheading) && (
        <div
          className={`mb-8 mx-auto max-w-xl text-sm leading-relaxed sm:text-base [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:opacity-80 [&_p]:m-0 ${variant === "light" ? "text-muted-foreground [&_a]:text-primary" : "opacity-80 [&_a]:text-current"}`}
          dangerouslySetInnerHTML={{ __html: str(props.subheading) }}
        />
      )}
      <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
        {str(props.primaryText) && (
          <FormModalButton
            label={plainText(props.primaryText)}
            action={props.primaryAction}
            href={props.primaryLink}
            openInNewTab={props.primaryOpenInNewTab}
            formSlug={props.primaryFormSlug}
            modalTitle={props.primaryModalTitle}
            modalDescription={props.primaryModalDescription}
            size="lg"
            variant={variant === "dark" ? "secondary" : "default"}
            className="w-full sm:w-auto"
            testId="cta-primary"
          />
        )}
        {str(props.secondaryText) && (
          <FormModalButton
            label={plainText(props.secondaryText)}
            action={props.secondaryAction}
            href={props.secondaryLink}
            openInNewTab={props.secondaryOpenInNewTab}
            formSlug={props.secondaryFormSlug}
            modalTitle={props.secondaryModalTitle}
            modalDescription={props.secondaryModalDescription}
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
            testId="cta-secondary"
          />
        )}
      </div>
    </div>
  );
}

function CardsGridBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "3";
  const colsClass =
    cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-4" : "md:grid-cols-3";
  const cards = arr<{ title: string; description: string; icon: string }>(props.cards);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className={`grid grid-cols-1 ${colsClass} gap-4 sm:gap-6`}>
        {cards.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">
            Add cards to display here
          </div>
        ) : (
          cards.map((card, i) => (
            <Card
              key={i}
              className="h-full overflow-hidden text-center transition-shadow hover:shadow-md"
            >
              <CardContent className="px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <LucideIcon name={card.icon || "Globe"} className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-base font-semibold leading-snug break-words">
                  {plainText(card.title)}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {plainText(card.description)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function FaqBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ question: string; answer: string }>(props.items);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="left" className="mb-8" />
      <Accordion type="single" collapsible className="space-y-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground">Add FAQ items to display here.</p>
        ) : (
          items.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
              <AccordionTrigger className="font-medium text-left">
                {plainText(item.question)}
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className="text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80 [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </AccordionContent>
            </AccordionItem>
          ))
        )}
      </Accordion>
    </div>
  );
}

function TestimonialsBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ quote: string; name: string; role: string; location: string }>(props.items);
  const shouldCarousel = items.length > 2;

  const renderCard = (
    item: { quote: string; name: string; role: string; location: string },
    i: number,
  ) => (
    <Card key={i} className="bg-muted/30 h-full">
      <CardContent className="pt-6">
        <Quote className="h-5 w-5 text-accent mb-3" />
        <p className="text-sm leading-relaxed mb-4 italic">"{plainText(item.quote)}"</p>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-accent">{item.name?.[0] ?? "?"}</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{plainText(item.name)}</p>
            <p className="text-xs text-muted-foreground">
              {plainText(item.role)}
              {item.location ? ` · ${plainText(item.location)}` : ""}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      {items.length === 0 ? (
        <p className="text-muted-foreground">Add testimonials to display here.</p>
      ) : shouldCarousel ? (
        <div>
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-6">
              {items.map((item, i) => (
                <CarouselItem key={i} className="pl-6 basis-full md:basis-1/2">
                  {renderCard(item, i)}
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-6 flex items-center justify-center gap-3">
              <CarouselPrevious className="static h-9 w-9 translate-x-0 translate-y-0 border-border/70 bg-background/95" />
              <CarouselNext className="static h-9 w-9 translate-x-0 translate-y-0 border-border/70 bg-background/95" />
            </div>
          </Carousel>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item, i) => renderCard(item, i))}
        </div>
      )}
    </div>
  );
}

function FeaturedProfessionalsBlock({ props }: { props: Record<string, unknown> }) {
  const { data: professionals } = useQuery<
    { id: string; title: string; user?: { firstName?: string; lastName?: string } }[]
  >({
    queryKey: ["/api/therapists/featured"],
  });
  const limit = num(props.limit, 3);
  const visible = (professionals ?? []).slice(0, limit);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visible.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Featured verified providers will appear here</p>
          </div>
        ) : (
          visible.map((c) => (
            <Card key={c.id} className="text-center hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="h-6 w-6 text-accent" />
                </div>
                <p className="font-semibold text-sm">
                  {plainText(c.user?.firstName)} {plainText(c.user?.lastName)}
                </p>
                <p className="text-xs public-meta-text">{plainText(c.title)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function EventsPreviewBlock({ props }: { props: Record<string, unknown> }) {
  const { data: events } = useQuery<
    {
      id: string;
      slug?: string | null;
      title: string;
      date: string;
      isVirtual: boolean;
      imageUrl?: string | null;
      imagePositionX?: number | null;
      imagePositionY?: number | null;
    }[]
  >({
    queryKey: ["/api/events"],
  });
  const limit = num(props.limit, 4);
  const ctaText = str(props.ctaText);
  const ctaLink = str(props.ctaLink);
  const visible = (events ?? []).filter((e) => new Date(e.date) > new Date()).slice(0, limit);
  const shouldCarousel = visible.length > 4;

  const renderEventCard = (e: {
    id: string;
    slug?: string | null;
    title: string;
    date: string;
    isVirtual: boolean;
    imageUrl?: string | null;
    imagePositionX?: number | null;
    imagePositionY?: number | null;
  }) => (
    <Link key={e.id} href={getEventPath(e)} className="w-full max-w-[16.2rem]">
      <Card
        className="mx-auto h-full w-full max-w-[16.2rem] overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
        data-testid={`event-preview-${e.id}`}
      >
        {e.imageUrl && (
          <div className="aspect-[16/10] overflow-hidden" data-testid={`img-event-preview-${e.id}`}>
            <img
              src={e.imageUrl}
              alt={plainText(e.title)}
              className="h-full w-full object-cover"
              style={getImageObjectPositionStyle(e.imagePositionX, e.imagePositionY)}
            />
          </div>
        )}
        <CardContent className={e.imageUrl ? "p-4" : "pt-4"}>
          <p className="mb-1 text-xs font-medium text-accent">
            {new Date(e.date).toLocaleDateString()}
          </p>
          <p className="line-clamp-2 text-sm font-semibold public-heading-3">
            {plainText(e.title)}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed public-meta-text">
            {e.isVirtual ? "Virtual" : "In Person"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      {visible.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Upcoming events will appear here</p>
        </div>
      ) : shouldCarousel ? (
        <div>
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {visible.map((e) => (
                <CarouselItem
                  key={e.id}
                  className="pl-4 basis-[70%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  {renderEventCard(e)}
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-6 flex items-center justify-center gap-3">
              <CarouselPrevious className="static h-9 w-9 translate-x-0 translate-y-0 border-border/70 bg-background/95" />
              <CarouselNext className="static h-9 w-9 translate-x-0 translate-y-0 border-border/70 bg-background/95" />
            </div>
          </Carousel>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((e) => renderEventCard(e))}
        </div>
      )}
      {ctaText && (
        <div className="mt-6 flex justify-center">
          <FormModalButton
            label={plainText(ctaText)}
            action={props.ctaAction}
            href={ctaLink}
            openInNewTab={props.ctaOpenInNewTab}
            formSlug={props.ctaFormSlug}
            modalTitle={props.ctaModalTitle}
            modalDescription={props.ctaModalDescription}
          />
        </div>
      )}
    </div>
  );
}

function BlogPreviewBlock({ props }: { props: Record<string, unknown> }) {
  const { data: posts } = useQuery<
    {
      id: string;
      title: string;
      excerpt: string;
      slug: string;
      coverImageUrl?: string | null;
      coverImagePositionX?: number | null;
      coverImagePositionY?: number | null;
      isPublished: boolean;
    }[]
  >({
    queryKey: ["/api/blog"],
  });
  const limit = num(props.limit, 5);
  const enableHoverMotion = props.enableHoverMotion !== false;
  const visible = (posts ?? []).filter((p) => p.isPublished).slice(0, limit);
  const shouldCarousel = visible.length > 5;

  const renderBlogCard = (p: {
    id: string;
    title: string;
    excerpt: string;
    slug: string;
    coverImageUrl?: string | null;
    coverImagePositionX?: number | null;
    coverImagePositionY?: number | null;
  }) => (
    <Link key={p.id} href={`/insights/${p.slug}`} className="w-full max-w-[13.5rem]">
      <Card
        className={`mx-auto h-full w-full max-w-[13.5rem] overflow-hidden cursor-pointer ${enableHoverMotion ? "blog-card-motion" : ""}`}
        data-testid={`blog-preview-${p.id}`}
      >
        {p.coverImageUrl && (
          <div className="aspect-[16/10] overflow-hidden">
            <img
              src={p.coverImageUrl}
              alt={plainText(p.title)}
              className="h-full w-full object-cover"
              style={getImageObjectPositionStyle(p.coverImagePositionX, p.coverImagePositionY)}
              data-blog-card-image
              data-testid={`img-blog-preview-${p.id}`}
            />
          </div>
        )}
        <CardContent className={p.coverImageUrl ? "p-3.5" : "pt-3.5"}>
          <p className="mb-1 line-clamp-2 text-sm font-semibold public-heading-3">
            {plainText(p.title)}
          </p>
          <p className="line-clamp-3 text-[11px] leading-relaxed public-body-text">
            {plainText(p.excerpt)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      {visible.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm">Blog articles will appear here</p>
        </div>
      ) : shouldCarousel ? (
        <div>
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {visible.map((p) => (
                <CarouselItem
                  key={p.id}
                  className="pl-4 basis-[70%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/5"
                >
                  {renderBlogCard(p)}
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-6 flex items-center justify-center gap-3">
              <CarouselPrevious className="static h-9 w-9 translate-x-0 translate-y-0 border-border/70 bg-background/95" />
              <CarouselNext className="static h-9 w-9 translate-x-0 translate-y-0 border-border/70 bg-background/95" />
            </div>
          </Carousel>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {visible.map((p) => renderBlogCard(p))}
        </div>
      )}
      {visible.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Link href="/insights">
            <Button variant="outline" size="lg">
              Read More Articles
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function ButtonGroupBlock({ props }: { props: Record<string, unknown> }) {
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
              label={plainText(btn.text)}
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

function RawHtmlBlock({ props }: { props: Record<string, unknown> }) {
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

function ImageBlockRenderer({ props }: { props: Record<string, unknown> }) {
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
            alt={plainText(props.alt)}
            style={mobileImageStyles}
            className="w-full rounded-xl [height:var(--mobile-image-height)] [object-fit:var(--mobile-image-fit)] [object-position:var(--mobile-image-position)] md:h-auto md:object-cover md:object-center"
          />
          {str(props.caption) && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {plainText(props.caption)}
            </p>
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

function VideoEmbedBlock({ props }: { props: Record<string, unknown> }) {
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

function ContactInfoBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ icon: string; label: string; value: string }>(props.items);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="left" className="mb-6" />
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Add contact items to display here.</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <LucideIcon name={item.icon || "Globe"} className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{plainText(item.label)}</p>
                <p className="break-words font-medium text-sm">{plainText(item.value)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DividerBlock({ props }: { props: Record<string, unknown> }) {
  const style = str(props.style) || "spacer";
  const spacing = str(props.spacing) || "md";
  const heightClass = SPACING_MAP[spacing] ?? SPACING_MAP.md;
  if (style === "spacer") return <div className={heightClass} />;
  if (style === "dots")
    return (
      <div className={`flex justify-center items-center gap-2 ${heightClass}`}>
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
      </div>
    );
  return <hr className={`border-border ${heightClass} border-0 border-t-[1px] my-auto`} />;
}

function FeatureListBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "3";
  const colsClass =
    cols === "1" ? "grid-cols-1" : cols === "2" ? "md:grid-cols-2" : "md:grid-cols-3";
  const features = arr<{ icon: string; title: string; description: string }>(props.features);
  return (
    <div className="py-4" data-testid="block-feature-list">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className={`grid grid-cols-1 ${colsClass} gap-6 sm:gap-8`}>
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-4" data-testid={`feature-item-${i}`}>
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <LucideIcon name={f.icon || "CheckCircle"} className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{plainText(f.title)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {plainText(f.description)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectionBustersBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ concern: string; response: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-objection-busters">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="space-y-6 max-w-3xl mx-auto">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border p-6" data-testid={`objection-item-${i}`}>
            <div className="flex items-start gap-3 mb-3">
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="font-medium text-sm">{plainText(item.concern)}</p>
            </div>
            <div className="flex items-start gap-3 pl-8">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {plainText(item.response)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BeforeAfterBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ milestone: string; before: string; after: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-before-after">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="relative max-w-3xl mx-auto">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />
        <div className="space-y-8">
          {items.map((item, i) => (
            <div key={i} className="flex gap-4 sm:gap-6" data-testid={`milestone-item-${i}`}>
              <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs">
                {item.milestone}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                  <p className="text-xs font-medium text-destructive mb-1">Before</p>
                  <p className="text-sm text-muted-foreground">{plainText(item.before)}</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                    After
                  </p>
                  <p className="text-sm text-muted-foreground">{plainText(item.after)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustBarBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ icon: string; label: string }>(props.items);
  return (
    <div className="py-4 border-y bg-muted/20" data-testid="block-trust-bar">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-muted-foreground"
            data-testid={`trust-signal-${i}`}
          >
            <LucideIcon name={item.icon || "CheckCircle"} className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">{plainText(item.label)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PressMentionsBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ name: string; logoUrl: string; link: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-press-mentions">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
        {items.map((item, i) => {
          const content = item.logoUrl ? (
            <img
              src={item.logoUrl}
              alt={plainText(item.name)}
              className="h-8 sm:h-10 object-contain opacity-60 hover:opacity-100 transition-opacity"
            />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              {plainText(item.name)}
            </span>
          );
          return item.link ? (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
              data-testid={`press-item-${i}`}
            >
              {content}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          ) : (
            <div key={i} data-testid={`press-item-${i}`}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SocialProofStatsBlock({ props }: { props: Record<string, unknown> }) {
  const stats = arr<{ value: string; label: string }>(props.stats);
  return (
    <div className="py-4" data-testid="block-social-proof-stats">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="text-center" data-testid={`stat-item-${i}`}>
            <p className="text-3xl md:text-4xl font-bold text-accent">{plainText(stat.value)}</p>
            <p className="text-sm text-muted-foreground mt-1">{plainText(stat.label)}</p>
          </div>
        ))}
      </div>
      {str(props.disclaimer) && (
        <p className="text-xs text-muted-foreground text-center mt-6 italic">
          {plainText(props.disclaimer)}
        </p>
      )}
    </div>
  );
}

function ImageGridBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "3";
  const colsClass =
    cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-4" : "md:grid-cols-3";
  const gapSize = str(props.gap) || "md";
  const gapClass =
    gapSize === "sm" ? "gap-2" : gapSize === "lg" ? "gap-6" : gapSize === "xl" ? "gap-8" : "gap-4";
  const images = arr<{ url: string; alt: string; caption: string }>(props.images);
  return (
    <div className="py-4" data-testid="block-image-grid">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      {images.length === 0 ? (
        <div className="rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Add images to display here</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${colsClass} ${gapClass}`}>
          {images.map((img, i) => (
            <div key={i} data-testid={`grid-image-${i}`}>
              <img
                src={img.url}
                alt={plainText(img.alt)}
                className="w-full rounded-lg object-cover aspect-square"
              />
              {img.caption && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {plainText(img.caption)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SliderBlock({ props }: { props: Record<string, unknown> }) {
  const [current, setCurrent] = useState(0);
  const slides = arr<{ imageUrl: string; heading: string; description: string }>(props.slides);
  useEffect(() => {
    if (slides.length > 0 && current >= slides.length) setCurrent(Math.max(0, slides.length - 1));
  }, [slides.length, current]);
  if (slides.length === 0)
    return (
      <div className="py-4 rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Add slides to display here</p>
      </div>
    );
  const safeIdx = Math.min(current, slides.length - 1);
  const slide = slides[safeIdx];
  return (
    <div className="py-4" data-testid="block-slider">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className="relative rounded-xl overflow-hidden bg-muted/20 border">
        {slide.imageUrl && (
          <img
            src={slide.imageUrl}
            alt={plainText(slide.heading)}
            className="w-full aspect-[16/9] object-cover"
          />
        )}
        <div
          className={`${slide.imageUrl ? "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent" : ""} p-6 sm:p-8`}
        >
          {slide.heading && (
            <h3
              className={`text-xl font-heading font-bold mb-2 ${slide.imageUrl ? "text-white" : ""}`}
            >
              {plainText(slide.heading)}
            </h3>
          )}
          {slide.description && (
            <p className={`text-sm ${slide.imageUrl ? "text-white/80" : "text-muted-foreground"}`}>
              {plainText(slide.description)}
            </p>
          )}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
            data-testid="button-slider-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-accent" : "bg-muted-foreground/30"}`}
                onClick={() => setCurrent(i)}
                data-testid={`button-slider-dot-${i}`}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={() => setCurrent((c) => (c + 1) % slides.length)}
            data-testid="button-slider-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function StatsBarBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ icon: string; value: string; label: string }>(props.items);
  return (
    <div className="py-6 bg-muted/30 rounded-xl" data-testid="block-stats-bar">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6 px-4" />
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-background/70 px-4 py-4 text-center sm:justify-start"
            data-testid={`stats-bar-item-${i}`}
          >
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <LucideIcon name={item.icon || "Star"} className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold">{plainText(item.value)}</p>
              <p className="text-xs text-muted-foreground">{plainText(item.label)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconGridBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "4";
  const colsClass =
    cols === "2"
      ? "sm:grid-cols-2"
      : cols === "3"
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : cols === "5"
          ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          : "sm:grid-cols-2 lg:grid-cols-4";
  const items = arr<{ icon: string; title: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-icon-grid">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className={`grid grid-cols-1 ${colsClass} gap-4`}>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex min-w-0 flex-col items-center gap-3 rounded-xl border p-4 text-center transition-shadow hover:shadow-sm sm:p-5"
            data-testid={`icon-grid-item-${i}`}
          >
            <div className="flex h-12 w-12 rounded-xl bg-accent/10 items-center justify-center">
              <LucideIcon name={item.icon || "Globe"} className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-medium leading-snug break-words">{plainText(item.title)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenefitStackBlock({ props }: { props: Record<string, unknown> }) {
  const layout = str(props.layout) || "stack";
  const items = arr<{ icon: string; title: string; description: string }>(props.items);
  const isTimeline = layout === "timeline";
  return (
    <div className="py-4" data-testid="block-benefit-stack">
      <SectionHeading props={props} defaultAlignment="left" className="mb-8" />
      <div className={`relative ${isTimeline ? "pl-8" : ""}`}>
        {isTimeline && <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-accent/20" />}
        <div className={isTimeline ? "space-y-6" : "space-y-4"}>
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-4 ${isTimeline ? "relative" : "p-4 rounded-lg border"}`}
              data-testid={`benefit-item-${i}`}
            >
              {isTimeline && (
                <div className="absolute -left-5 top-1 h-4 w-4 rounded-full bg-accent border-2 border-background" />
              )}
              <div
                className={`h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0`}
              >
                <LucideIcon name={item.icon || "CheckCircle"} className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{plainText(item.title)}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {plainText(item.description)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScienceExplainerBlock({ props }: { props: Record<string, unknown> }) {
  const citations = arr<{ text: string; url: string }>(props.citations);
  return (
    <div className="py-4" data-testid="block-science-explainer">
      <SectionHeading props={props} defaultAlignment="left" className="mb-6" />
      {str(props.body) && (
        <div
          className="prose prose-sm max-w-none text-foreground mb-6"
          dangerouslySetInnerHTML={{ __html: str(props.body) }}
        />
      )}
      {citations.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Sources
          </p>
          <ol className="space-y-1">
            {citations.map((c, i) => (
              <li key={i} className="text-xs text-muted-foreground" data-testid={`citation-${i}`}>
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-2 hover:text-accent/80"
                  >
                    {plainText(c.text)}
                  </a>
                ) : (
                  plainText(c.text)
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function SafetyChecklistBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ text: string; required: boolean }>(props.items);
  return (
    <div className="py-4" data-testid="block-safety-checklist">
      <SectionHeading props={props} defaultAlignment="left" className="mb-6" />
      <div className="space-y-3 max-w-2xl">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3" data-testid={`checklist-item-${i}`}>
            <CheckCircle
              className={`h-5 w-5 flex-shrink-0 mt-0.5 ${item.required ? "text-accent" : "text-muted-foreground/50"}`}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm">{plainText(item.text)}</span>
              {item.required && (
                <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                  Required
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {str(props.disclaimer) && (
        <p className="text-xs text-muted-foreground mt-6 italic border-t pt-4">
          {plainText(props.disclaimer)}
        </p>
      )}
    </div>
  );
}

function GuaranteeWarrantyBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ text: string } | string>(props.items);
  return (
    <div className="py-4" data-testid="block-guarantee-warranty">
      <div className="rounded-2xl bg-accent/5 border border-accent/20 p-8 text-center">
        <BadgeCheck className="h-10 w-10 text-accent mx-auto mb-4" />
        <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
        <ul className="space-y-2 max-w-lg mx-auto text-left mb-6">
          {items.map((item, i) => {
            const text = typeof item === "string" ? item : (item as { text: string }).text;
            return (
              <li key={i} className="flex items-start gap-2" data-testid={`guarantee-item-${i}`}>
                <CheckCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm">{plainText(text)}</span>
              </li>
            );
          })}
        </ul>
        {str(props.ctaText) && (
          <FormModalButton
            label={plainText(props.ctaText)}
            action={props.ctaAction}
            href={props.ctaLink}
            openInNewTab={props.ctaOpenInNewTab}
            formSlug={props.ctaFormSlug}
            modalTitle={props.ctaModalTitle}
            modalDescription={props.ctaModalDescription}
            className="bg-accent text-accent-foreground"
          />
        )}
      </div>
    </div>
  );
}

function DeliverySetupBlock({ props }: { props: Record<string, unknown> }) {
  const steps = arr<{ step: string; title: string; description: string }>(props.steps);
  const includedItems = arr<{ text: string } | string>(props.includedItems);
  return (
    <div className="py-4" data-testid="block-delivery-setup">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="max-w-3xl mx-auto mb-8">
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 sm:gap-6" data-testid={`setup-step-${i}`}>
              <div className="relative flex w-12 flex-shrink-0 justify-center">
                {i < steps.length - 1 ? (
                  <div className="absolute left-1/2 top-12 h-[calc(100%+1.5rem)] w-0.5 -translate-x-1/2 bg-border hidden sm:block" />
                ) : null}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">
                  {plainText(step.step)}
                </div>
              </div>
              <div className="pt-2">
                <h3 className="font-semibold text-sm sm:text-base mb-1">{plainText(step.title)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {plainText(step.description)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {includedItems.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-6 max-w-3xl mx-auto">
          <h3 className="font-semibold text-sm mb-3">What's Included</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {includedItems.map((item, i) => {
              const text = typeof item === "string" ? item : (item as { text: string }).text;
              return (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                  {plainText(text)}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function RecoveryUseCasesBlock({ props }: { props: Record<string, unknown> }) {
  const personas = arr<{ icon: string; title: string; description: string }>(props.personas);
  return (
    <div className="py-4" data-testid="block-recovery-use-cases">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {personas.map((p, i) => (
          <Card
            key={i}
            className="text-center hover:shadow-md transition-shadow"
            data-testid={`persona-card-${i}`}
          >
            <CardContent className="pt-8 pb-6">
              <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <LucideIcon name={p.icon || "User"} className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{plainText(p.title)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {plainText(p.description)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProtocolBuilderBlock({ props }: { props: Record<string, unknown> }) {
  const level = str(props.level) || "beginner";
  const steps = arr<{ title: string; description: string }>(props.steps);
  const levelColors: Record<string, string> = {
    beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    intermediate: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    advanced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return (
    <div className="py-4" data-testid="block-protocol-builder">
      <div className="flex flex-wrap items-start gap-3 mb-6">
        <SectionHeading props={props} defaultAlignment="left" className="flex-1 min-w-[220px]" />
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${levelColors[level] || levelColors.beginner}`}
        >
          {plainText(level)}
        </span>
      </div>
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4 items-start" data-testid={`protocol-step-${i}`}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
              {i + 1}
            </div>
            <div className="flex-1 border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-1">{plainText(step.title)}</h3>
              <p className="text-sm text-muted-foreground">{plainText(step.description)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const RENDERERS: Record<string, React.ComponentType<{ props: Record<string, unknown> }>> = {
  hero: HeroBlock,
  "section-header": SectionHeaderBlock,
  "rich-text": RichTextBlock,
  "text-image": TextImageBlock,
  "two-column-text": TwoColumnTextBlock,
  "callout-box": CalloutBoxBlock,
  "link-list": LinkListBlock,
  cta: CtaBlock,
  "cards-grid": CardsGridBlock,
  faq: FaqBlock,
  testimonials: TestimonialsBlock,
  "featured-professionals": FeaturedProfessionalsBlock,
  "featured-counselors": FeaturedProfessionalsBlock,
  "events-preview": EventsPreviewBlock,
  "blog-preview": BlogPreviewBlock,
  "button-group": ButtonGroupBlock,
  "image-block": ImageBlockRenderer,
  "video-embed": VideoEmbedBlock,
  "raw-html": RawHtmlBlock,
  "contact-info": ContactInfoBlock,
  divider: DividerBlock,
  "feature-list": FeatureListBlock,
  "objection-busters": ObjectionBustersBlock,
  "before-after": BeforeAfterBlock,
  "trust-bar": TrustBarBlock,
  "press-mentions": PressMentionsBlock,
  "social-proof-stats": SocialProofStatsBlock,
  "image-grid": ImageGridBlock,
  gallery: GalleryBlock,
  team: TeamSection,
  slider: SliderBlock,
  "stats-bar": StatsBarBlock,
  "icon-grid": IconGridBlock,
  "benefit-stack": BenefitStackBlock,
  "science-explainer": ScienceExplainerBlock,
  "safety-checklist": SafetyChecklistBlock,
  "guarantee-warranty": GuaranteeWarrantyBlock,
  "delivery-setup": DeliverySetupBlock,
  "recovery-use-cases": RecoveryUseCasesBlock,
  "protocol-builder": ProtocolBuilderBlock,
};

const DYNAMIC_BLOCK_TYPES = new Set([
  "therapist-map",
  "contact-form",
  "form-embed",
  "join-hero",
  "join-registration-form",
  "blog-post-feed",
  "blog-featured-post",
  "standard-blog-page",
  "events-archive",
  "video-archives",
  "directory-browser",
  "career-listings",
  "portfolio-grid",
]);

export function PublicBlockRenderer({
  block,
  disableSectionStyleWrap = false,
  renderInactive = false,
}: {
  block: BlockInstance;
  disableSectionStyleWrap?: boolean;
  renderInactive?: boolean;
}) {
  if (!renderInactive && block.props.isActive === false) {
    return null;
  }

  let renderedBlock: ReactElement | null = null;

  if (DYNAMIC_BLOCK_TYPES.has(block.type)) {
    if (block.type === "blog-post-feed") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyBlogPostFeedBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "blog-featured-post") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyBlogFeaturedPostBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "standard-blog-page") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyStandardBlogPageBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "therapist-map") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyTherapistMapBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "contact-form") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyContactFormBlock />
        </Suspense>
      );
    }
    if (block.type === "form-embed") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyManagedFormEmbedBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "join-hero") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyJoinHeroBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "join-registration-form") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyJoinRegistrationFormBlock props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "events-archive") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyEventsArchiveSection props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "video-archives") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyRecordingArchivesSection props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "directory-browser") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyDirectoryBrowserSection props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "career-listings") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyCareerListingsSection props={block.props} />
        </Suspense>
      );
    }
    if (block.type === "portfolio-grid") {
      renderedBlock = (
        <Suspense fallback={<DynamicFallback />}>
          <LazyPortfolioGridSection props={block.props} />
        </Suspense>
      );
    }
  }

  if (!renderedBlock) {
    const Renderer = RENDERERS[block.type];
    if (!Renderer) {
      return (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
          Unknown block type: <code>{block.type}</code>
        </div>
      );
    }
    renderedBlock = <Renderer props={block.props} />;
  }

  if (block.type === "hero") {
    return renderedBlock;
  }

  if (disableSectionStyleWrap) {
    return renderedBlock;
  }

  return (
    <SectionStyleWrapper
      props={block.props}
      resolveAssetUrl={resolveCmsAssetUrl}
      contentClassName={getSectionPaddingClasses(block.props)}
    >
      {renderedBlock}
    </SectionStyleWrapper>
  );
}

export function PublicPageRenderer({ blocks }: { blocks: BlockInstance[] }) {
  let nonFullWidthIndex = 0;
  const normalizedBlocks = mergeJoinHeroBlocks(blocks);
  return (
    <div>
      {normalizedBlocks.map((block) => {
        if (block.props.isActive === false) {
          return null;
        }

        const isFullWidth = FULL_WIDTH_BLOCK_TYPES.has(block.type);
        const sectionStyleConfig = getSectionStyleConfig(block.props, {
          resolveAssetUrl: resolveCmsAssetUrl,
        });
        const hasCustomSectionStyle =
          block.type !== "hero" && hasSectionStyleConfig(sectionStyleConfig);
        const idx = isFullWidth ? nonFullWidthIndex : nonFullWidthIndex++;
        const isAlternate = idx % 2 === 1 && !hasCustomSectionStyle;

        if (hasCustomSectionStyle) {
          return (
            <SectionStyleWrapper
              key={block.id}
              props={block.props}
              resolveAssetUrl={resolveCmsAssetUrl}
              className="rounded-none"
              contentClassName={isFullWidth ? undefined : getSectionPaddingClasses(block.props)}
            >
              {isFullWidth ? (
                <PublicBlockRenderer block={block} disableSectionStyleWrap />
              ) : (
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
                  <PublicBlockRenderer block={block} disableSectionStyleWrap />
                </div>
              )}
            </SectionStyleWrapper>
          );
        }

        if (isFullWidth) {
          return <PublicBlockRenderer key={block.id} block={block} />;
        }

        return (
          <section
            key={block.id}
            className={`relative overflow-hidden ${isAlternate ? "bg-muted/30" : ""}`}
          >
            {isAlternate && (
              <div
                className="pointer-events-none absolute top-0 left-0 right-0 h-32"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.10) 0%, transparent 70%)",
                }}
              />
            )}
            <div
              className={`relative max-w-7xl mx-auto px-4 sm:px-6 ${getSectionPaddingClasses(block.props)}`}
            >
              <PublicBlockRenderer block={block} disableSectionStyleWrap />
            </div>
          </section>
        );
      })}
    </div>
  );
}
