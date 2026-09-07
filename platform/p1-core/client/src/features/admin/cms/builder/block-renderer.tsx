import { TeamSection } from "@/components/shared/team-section";
import { lazy, Suspense, useState, useMemo, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FormModalButton } from "@/components/forms/form-modal-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Image,
  Loader2,
  Lock,
  Play,
  Send,
  UserCheck,
} from "lucide-react";
import { LoginDialog } from "@/components/auth/login-dialog";
import { MapView } from "@/components/directory/map-view";
import type { BlockInstance } from "./block-registry";
import type { TherapistProfile, User as AppUser } from "@shared/schema";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { CompanyInformationCard } from "@/components/shared/company-information-card";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import { getEventPath } from "@shared/event-url";
import { isDynamicBlock, getBlockDef } from "./block-registry";
import { mergeJoinHeroBlocks } from "@shared/cms-blocks";
import {
  SectionStyleWrapper,
  DEFAULT_SECTION_LINEAR_GRADIENT,
  getSectionPaddingClasses,
  getSectionStyleConfig,
  hasSectionStyleConfig,
  hexToRgba,
  normalizeHexColor,
} from "./section-style";
import { SectionHeading } from "./section-heading";
import { GalleryRenderer } from "@/components/shared/gallery-renderer";
import { LucideIcon } from "./block-icons";
import {
  CalloutBoxBlock,
  CardsGridBlock,
  CtaBlock,
  FaqBlock,
  LinkListBlock,
  RichTextBlock,
  SectionHeaderBlock,
  TestimonialsBlock,
  TextImageBlock,
  TwoColumnTextBlock,
} from "./core-content-blocks";
import {
  BeforeAfterBlock,
  BenefitStackBlock,
  ContactInfoBlock,
  DeliverySetupBlock,
  DividerBlock,
  FeatureListBlock,
  GuaranteeWarrantyBlock,
  IconGridBlock,
  ImageGridBlock,
  ObjectionBustersBlock,
  PressMentionsBlock,
  ProtocolBuilderBlock,
  RecoveryUseCasesBlock,
  SafetyChecklistBlock,
  ScienceExplainerBlock,
  SliderBlock,
  SocialProofStatsBlock,
  StatsBarBlock,
  TrustBarBlock,
} from "./conversion-blocks";
import { BlogFeaturedPostBlock, BlogPostFeedBlock, StandardBlogPageBlock } from "./blog-blocks";
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

type DirectoryProvider = TherapistProfile & {
  user?: Pick<AppUser, "firstName" | "lastName"> & { profileImageUrl?: string | null };
};

function GalleryBlock({ props }: { props: Record<string, unknown> }) {
  const galleryId = str(props.galleryId);
  const layout = str(props.layout) || "inherit";
  return (
    <div className="py-4" data-testid="block-gallery">
      <GalleryRenderer
        galleryId={galleryId}
        preview
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

interface DirectoryProvidersResponse {
  items: DirectoryProvider[];
}

const LazyManagedFormEmbedBlock = lazy(() =>
  import("@/features/public/public-dynamic-blocks").then((module) => ({
    default: module.ManagedFormEmbedBlock,
  })),
);

const LazyEventsArchiveSection = lazy(() =>
  import("@/features/public/events-page").then((module) => ({
    default: module.EventsArchiveSection,
  })),
);

const LazyRecordingArchivesSection = lazy(() =>
  import("@/features/public/recording-archives-page").then((module) => ({
    default: module.RecordingArchivesSection,
  })),
);

const LazyDirectoryBrowserSection = lazy(() =>
  import("@/features/directory/directory-page").then((module) => ({
    default: module.DirectoryBrowserSection,
  })),
);

const LazyCareerListingsSection = lazy(() =>
  import("@/features/public/careers-page").then((module) => ({
    default: module.CareerListingsSection,
  })),
);

const LazyPortfolioGridSection = lazy(() =>
  import("@/features/public/portfolio-page").then((module) => ({
    default: module.PortfolioGridSection,
  })),
);

function DynamicPreviewFallback() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function HeroBlock({ props }: { props: Record<string, unknown> }) {
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
            <p className="text-sm">Featured providers will appear here</p>
          </div>
        ) : (
          visible.map((c) => (
            <Card key={c.id} className="text-center hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="h-6 w-6 text-accent" />
                </div>
                <p className="font-semibold text-sm">
                  {c.user?.firstName} {c.user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{c.title}</p>
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
    <Link key={e.id} href={getEventPath(e)} className="w-full max-w-[13.5rem]">
      <Card
        className="mx-auto h-full w-full max-w-[13.5rem] overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
        data-testid={`event-preview-${e.id}`}
      >
        {e.imageUrl && (
          <div className="aspect-[16/10] overflow-hidden" data-testid={`img-event-preview-${e.id}`}>
            <img
              src={e.imageUrl}
              alt={e.title}
              className="h-full w-full object-cover"
              style={getImageObjectPositionStyle(e.imagePositionX, e.imagePositionY)}
            />
          </div>
        )}
        <CardContent className={e.imageUrl ? "p-3.5" : "pt-3.5"}>
          <p className="mb-1 text-xs font-medium text-accent">
            {new Date(e.date).toLocaleDateString()}
          </p>
          <p className="line-clamp-2 text-sm font-semibold">{e.title}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
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
            label={ctaText}
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
              alt={p.title}
              className="h-full w-full object-cover"
              style={getImageObjectPositionStyle(p.coverImagePositionX, p.coverImagePositionY)}
              data-blog-card-image
              data-testid={`img-blog-preview-${p.id}`}
            />
          </div>
        )}
        <CardContent className={p.coverImageUrl ? "p-3.5" : "pt-3.5"}>
          <p className="mb-1 line-clamp-2 text-sm font-semibold">{p.title}</p>
          <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
            {p.excerpt}
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

function TherapistMapBlock({ props }: { props: Record<string, unknown> }) {
  const { data: allTherapistsData, isLoading } = useQuery<DirectoryProvidersResponse>({
    queryKey: ["/api/therapists", "pageSize=500"],
    queryFn: async () => {
      const res = await fetch("/api/therapists?pageSize=500");
      if (!res.ok) throw new Error("Failed to fetch providers");
      return res.json();
    },
  });

  const mapTherapists = useMemo(
    () =>
      (allTherapistsData?.items ?? []).map((t) => ({
        profile: t,
        user: {
          firstName: t.user?.firstName ?? null,
          lastName: t.user?.lastName ?? null,
          profileImageUrl: t.user?.profileImageUrl ?? null,
        },
      })),
    [allTherapistsData],
  );
  const headingAlignment = str(props.sectionHeadingAlignment) || "center";
  const buttonJustifyClass =
    headingAlignment === "left"
      ? "justify-start"
      : headingAlignment === "right"
        ? "justify-end"
        : "justify-center";

  return (
    <section
      className="relative bg-[#ffffff4d] overflow-hidden"
      data-testid="section-professional-map"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
        <div className="mb-8 sm:mb-12 space-y-5">
          <SectionHeading props={props} defaultAlignment="center" />
          <div className={`flex ${buttonJustifyClass}`}>
            <Link href="/directory">
              <Button variant="outline" data-testid="button-view-all-therapists">
                Find a Verified Provider <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <MapView
            therapists={mapTherapists}
            height="500px"
            interactive
            zoom={2}
            center={[20, 0]}
          />
        )}
      </div>
    </section>
  );
}

function ContactFormBlock() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="dynamic-contact-form">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send a Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PublicFormRenderer slug="contact-form" showHeader={false} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <CompanyInformationCard />
        </div>
      </div>
    </div>
  );
}

function JoinRegistrationFormBlock({ props }: { props: Record<string, unknown> }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const heading = str(props.heading);
  const accentHeading = str(props.accentHeading);
  const subheading = str(props.subheading);
  const hasImageBackground = !!str(props.sectionBackgroundImageUrl);
  const headingTextStyle = colorStyle(
    props.headingColor,
    hasImageBackground ? "#ffffff" : undefined,
  );
  const accentHeadingTextStyle = colorStyle(
    props.accentHeadingColor,
    hasImageBackground ? "#ffffff" : undefined,
  );
  const subheadingTextStyle = colorStyle(
    props.subheadingColor,
    hasImageBackground ? "#ffffff" : undefined,
  );
  const applicationStatusText = str(props.applicationStatusText) || "Apply to join.";
  const loginPromptPrefix =
    str(props.loginPromptPrefix) || "If you're already a member click here to";
  const loginLinkText = str(props.loginLinkText) || "Log in";
  const loginPromptSuffix = str(props.loginPromptSuffix) || "to your profile!";
  const hasHeroCopy = !!(heading || accentHeading);

  return (
    <section
      className={`max-w-4xl mx-auto px-4 sm:px-6 text-center ${hasHeroCopy ? "py-14 sm:py-20 md:py-24" : "py-8 sm:py-10 md:py-12"}`}
      data-testid="dynamic-join-registration-form"
    >
      {hasHeroCopy && (
        <>
          <h1
            className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6"
            data-testid="text-join-title"
            style={headingTextStyle}
          >
            {heading}
            {accentHeading && (
              <>
                {" "}
                <span className="text-accent" style={accentHeadingTextStyle}>
                  {accentHeading}
                </span>
              </>
            )}
          </h1>
          {subheading && (
            <div
              className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80 [&_p]:m-0"
              data-testid="text-join-subheading"
              style={subheadingTextStyle}
              dangerouslySetInnerHTML={{ __html: subheading }}
            />
          )}
        </>
      )}
      <Button
        size="lg"
        className="bg-accent text-accent-foreground border-accent-border text-base px-8 py-6 opacity-60 cursor-not-allowed"
        disabled
        data-testid="button-apply-member"
      >
        <Clock className="mr-2 h-5 w-5" />
        {applicationStatusText}
      </Button>
      <p
        className="text-sm sm:text-base text-muted-foreground mt-6"
        data-testid="text-login-prompt"
        style={subheadingTextStyle}
      >
        {loginPromptPrefix}{" "}
        <button
          onClick={() => setLoginOpen(true)}
          className="text-accent underline underline-offset-2 hover:text-accent/80 font-medium"
          data-testid="button-member-login"
        >
          {loginLinkText}
        </button>{" "}
        {loginPromptSuffix}
      </p>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </section>
  );
}

function JoinHeroBlock({ props }: { props: Record<string, unknown> }) {
  const heading = str(props.heading) || "Are you a verified provider?";
  const accentHeading = str(props.accentHeading) || "Join the Network!";
  const subheading = str(props.subheading);
  const hasImageBackground = !!str(props.sectionBackgroundImageUrl);
  const headingTextStyle = colorStyle(
    props.headingColor,
    hasImageBackground ? "#ffffff" : undefined,
  );
  const accentHeadingTextStyle = colorStyle(
    props.accentHeadingColor,
    hasImageBackground ? "#ffffff" : undefined,
  );
  const subheadingTextStyle = colorStyle(
    props.subheadingColor,
    hasImageBackground ? "#ffffff" : undefined,
  );

  return (
    <div
      className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center"
      data-testid="dynamic-join-hero"
    >
      <h1
        className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6"
        data-testid="text-join-hero-title"
        style={headingTextStyle}
      >
        {heading}
        {accentHeading && (
          <>
            {" "}
            <span className="text-accent" style={accentHeadingTextStyle}>
              {accentHeading}
            </span>
          </>
        )}
      </h1>
      {subheading && (
        <div
          className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80 [&_p]:m-0"
          data-testid="text-join-hero-subheading"
          style={subheadingTextStyle}
          dangerouslySetInnerHTML={{ __html: subheading }}
        />
      )}
    </div>
  );
}

function DynamicPlaceholderAdmin({ block }: { block: BlockInstance }) {
  const def = getBlockDef(block.type);
  const label = def?.label ?? block.type;
  const iconName = def?.iconName ?? "Lock";

  return (
    <div
      className="rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-8 text-center"
      data-testid={`dynamic-placeholder-${block.type}`}
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <LucideIcon name={iconName} className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">{label}</p>
      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
        This section is managed automatically and displays live data on the public site.
      </p>
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

export function BlockRenderer({
  block,
  isAdminPreview,
  disableSectionStyleWrap = false,
}: {
  block: BlockInstance;
  isAdminPreview?: boolean;
  disableSectionStyleWrap?: boolean;
}) {
  let renderedBlock: ReactElement | null = null;

  if (isDynamicBlock(block.type)) {
    if (
      isAdminPreview &&
      block.type !== "directory-browser" &&
      block.type !== "career-listings" &&
      block.type !== "portfolio-grid" &&
      block.type !== "team"
    ) {
      renderedBlock = <DynamicPlaceholderAdmin block={block} />;
    }
    if (!renderedBlock && block.type === "team")
      renderedBlock = <TeamSection props={block.props} />;
    if (!renderedBlock && block.type === "therapist-map")
      renderedBlock = <TherapistMapBlock props={block.props} />;
    if (!renderedBlock && block.type === "contact-form") renderedBlock = <ContactFormBlock />;
    if (!renderedBlock && block.type === "form-embed") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyManagedFormEmbedBlock props={block.props} />
        </Suspense>
      );
    }
    if (!renderedBlock && block.type === "join-hero")
      renderedBlock = <JoinHeroBlock props={block.props} />;
    if (!renderedBlock && block.type === "join-registration-form")
      renderedBlock = <JoinRegistrationFormBlock props={block.props} />;
    if (!renderedBlock && block.type === "blog-post-feed")
      renderedBlock = <BlogPostFeedBlock props={block.props} />;
    if (!renderedBlock && block.type === "blog-featured-post")
      renderedBlock = <BlogFeaturedPostBlock props={block.props} />;
    if (!renderedBlock && block.type === "standard-blog-page")
      renderedBlock = <StandardBlogPageBlock props={block.props} />;
    if (!renderedBlock && block.type === "events-archive") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyEventsArchiveSection props={block.props} />
        </Suspense>
      );
    }
    if (!renderedBlock && block.type === "video-archives") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyRecordingArchivesSection props={block.props} />
        </Suspense>
      );
    }
    if (!renderedBlock && block.type === "directory-browser") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyDirectoryBrowserSection props={block.props} syncUrl={false} />
        </Suspense>
      );
    }
    if (!renderedBlock && block.type === "career-listings") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyCareerListingsSection props={block.props} />
        </Suspense>
      );
    }
    if (!renderedBlock && block.type === "portfolio-grid") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyPortfolioGridSection props={block.props} />
        </Suspense>
      );
    }
  }

  if (!renderedBlock) {
    const Renderer = RENDERERS[block.type];
    if (!Renderer) {
      return (
        <div className="rounded-lg border border-dashed p-4 sm:p-6 text-center text-muted-foreground text-sm">
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

/** Block types that render edge-to-edge without a max-width container.
 *  Update this set when adding new full-width block types. */
const FULL_WIDTH_BLOCKS = new Set([
  "hero",
  "join-hero",
  "join-registration-form",
  "events-archive",
  "video-archives",
  "directory-browser",
  "career-listings",
  "portfolio-grid",
  "cta",
  "trust-bar",
  "divider",
  "slider",
  "stats-bar",
]);

export function PageRenderer({ blocks }: { blocks: BlockInstance[] }) {
  const normalizedBlocks = mergeJoinHeroBlocks(blocks);

  return (
    <div>
      {normalizedBlocks.map((block) => {
        const isFullWidth = FULL_WIDTH_BLOCKS.has(block.type);
        const sectionStyleConfig = getSectionStyleConfig(block.props, {
          resolveAssetUrl: resolveCmsAssetUrl,
        });
        const hasCustomSectionStyle =
          block.type !== "hero" && hasSectionStyleConfig(sectionStyleConfig);

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
                <BlockRenderer block={block} disableSectionStyleWrap />
              ) : (
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                  <BlockRenderer block={block} disableSectionStyleWrap />
                </div>
              )}
            </SectionStyleWrapper>
          );
        }

        if (isFullWidth) {
          return <BlockRenderer key={block.id} block={block} />;
        }

        return (
          <div
            key={block.id}
            className={`max-w-7xl mx-auto px-4 sm:px-6 ${getSectionPaddingClasses(block.props)}`}
          >
            <BlockRenderer block={block} disableSectionStyleWrap />
          </div>
        );
      })}
    </div>
  );
}
