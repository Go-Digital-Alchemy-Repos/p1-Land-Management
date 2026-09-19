import { ContactFormPresentation } from "./contact-form-presentation";
import { galleryBlockSettings } from "./gallery-block-settings";
import { EventsPreviewBlockPresentation, BlogPreviewBlockPresentation } from "./feed-presentations";
import { CoreStaticRendererHost } from "./core-static-renderer-host";
import {
  HeroBlock,
  ButtonGroupBlock,
  RawHtmlBlock,
  ImageBlockRenderer,
  VideoEmbedBlock,
} from "./static-blocks";
import { TeamSection } from "@/components/shared/team-section";
import { lazy, Suspense, type ReactElement } from "react";
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
import { BookOpen, CalendarDays, Image, Loader2, Lock, Play, Send, UserCheck } from "lucide-react";
import type { BlockInstance } from "./block-registry";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { CompanyInformationCard } from "@/components/shared/company-information-card";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import { getEventPath } from "@shared/event-url";
import { isDynamicBlock, getBlockDef } from "./block-registry";
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

function GalleryBlock({ props }: { props: Record<string, unknown> }) {
  const galleryId = str(props.galleryId);
  return (
    <div className="py-4" data-testid="block-gallery">
      <GalleryRenderer galleryId={galleryId} preview overrides={galleryBlockSettings(props)} />
    </div>
  );
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

const LazyCareerListingsSection = lazy(() =>
  import("@/features/public/careers-page").then((module) => ({
    default: module.CareerListingsSection,
  })),
);

function DynamicPreviewFallback() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
  return <EventsPreviewBlockPresentation props={props} events={events ?? []} />;
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
  return <BlogPreviewBlockPresentation props={props} posts={posts ?? []} />;
}
function ContactFormBlock() {
  return (
    <ContactFormPresentation
      form={<PublicFormRenderer slug="contact-form" showHeader={false} />}
      company={<CompanyInformationCard />}
    />
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

function BlockRendererContent({
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
    if (isAdminPreview && block.type !== "career-listings" && block.type !== "team") {
      renderedBlock = <DynamicPlaceholderAdmin block={block} />;
    }
    if (!renderedBlock && block.type === "team")
      renderedBlock = <TeamSection props={block.props} />;
    if (!renderedBlock && block.type === "contact-form") renderedBlock = <ContactFormBlock />;
    if (!renderedBlock && block.type === "form-embed") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyManagedFormEmbedBlock props={block.props} />
        </Suspense>
      );
    }
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
    if (!renderedBlock && block.type === "career-listings") {
      renderedBlock = (
        <Suspense fallback={<DynamicPreviewFallback />}>
          <LazyCareerListingsSection props={block.props} />
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
  "events-archive",
  "video-archives",
  "career-listings",
  "cta",
  "trust-bar",
  "divider",
  "slider",
  "stats-bar",
]);

export function PageRenderer({ blocks }: { blocks: BlockInstance[] }) {
  const normalizedBlocks = blocks;

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

export function BlockRenderer(props: React.ComponentProps<typeof BlockRendererContent>) {
  return (
    <CoreStaticRendererHost>
      <BlockRendererContent {...props} />
    </CoreStaticRendererHost>
  );
}
