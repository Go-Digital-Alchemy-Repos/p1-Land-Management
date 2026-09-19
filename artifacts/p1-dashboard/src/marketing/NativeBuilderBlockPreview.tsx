import { SocialMediaLinks } from "../../../../platform/p1-core/client/src/components/shared/social-media-links";
import { CompanyInformationPresentation } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/company-information-presentation";
import { ContactFormPresentation } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/contact-form-presentation";
import { galleryBlockSettings } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/gallery-block-settings";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RecordingArchivesPresentation } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/recording-archives-presentation";
import { getBlockDef } from "../../../../platform/p1-core/shared/cms-builder/block-registry";
import { sanitizePublicRichHtml } from "../../../../platform/p1-core/shared/sanitize-rich-html";
import { ArchivePresentationHostProvider } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/archive-presentation-host";
import { EventsArchivePresentation } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/events-archive-presentation";
import { CareerListingsPresentation } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/career-listings-presentation";
import type { PreviewResource } from "./builder-preview-data";
import { GalleryPresentation } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/gallery-presentation";
import {
  TeamPresentation,
  TeamUiProvider,
} from "../../../../platform/p1-core/client/src/features/admin/cms/builder/team-presentation";
import { FormPresentation } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/form-presentation";
import { FormPresentationHostProvider } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/form-presentation-host";
import {
  EventsPreviewBlockPresentation,
  BlogPreviewBlockPresentation,
} from "../../../../platform/p1-core/client/src/features/admin/cms/builder/feed-presentations";
import {
  BlogPostFeedBlock,
  BlogFeaturedPostBlock,
  StandardBlogPageBlock,
} from "../../../../platform/p1-core/client/src/features/admin/cms/builder/blog-blocks";
import { BlogDataProvider } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/blog-data-host";
import React, { useMemo } from "react";
import { sanitizeBuilderPreviewBlocks } from "../../../../platform/p1-core/shared/cms-builder/sanitize-preview";
import type { BlockInstance } from "../../../../platform/p1-core/shared/cms-builder/block-registry";
import { StaticRendererHostProvider } from "../../../../platform/p1-core/client/src/features/admin/cms/builder/static-renderer-host";
import * as content from "../../../../platform/p1-core/client/src/features/admin/cms/builder/core-content-blocks";
import * as conversion from "../../../../platform/p1-core/client/src/features/admin/cms/builder/conversion-blocks";
import * as basic from "../../../../platform/p1-core/client/src/features/admin/cms/builder/static-blocks";
import { builderPrimitives } from "./builder-primitives";
const div = ({ children, className = "" }: any) => (
  <div className={className}>{children}</div>
);
const card = ({ children, className = "" }: any) => (
  <div className={`rounded-xl border bg-card ${className}`}>{children}</div>
);
export const previewUi = {
  Link: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
  Input: builderPrimitives.Input,
  Button: builderPrimitives.Button,
  Card: card,
  CardHeader: ({ children, className = "" }: any) => (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className = "" }: any) => (
    <h3
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
    >
      {children}
    </h3>
  ),
  CardContent: ({ children, className = "" }: any) => (
    <div className={`p-6 ${className}`}>{children}</div>
  ),
  FormModalButton: ({
    label,
    children,
    className = "",
    variant,
    size,
  }: any) => (
    <builderPrimitives.Button
      type="button"
      tabIndex={-1}
      className={className}
      variant={variant}
      size={size}
    >
      {typeof label === "string" ? label.replace(/<[^>]*>/g, "") : children}
    </builderPrimitives.Button>
  ),
  Accordion: div,
  AccordionItem: ({ children, className }: any) => (
    <details className={className}>{children}</details>
  ),
  AccordionTrigger: ({ children, className }: any) => (
    <summary className={className}>{children}</summary>
  ),
  AccordionContent: div,
  Carousel: div,
  CarouselContent: ({ children, className = "" }: any) => (
    <div className={`flex overflow-hidden ${className}`}>{children}</div>
  ),
  CarouselItem: ({ children, className = "" }: any) => (
    <div className={`shrink-0 grow-0 basis-full ${className}`}>{children}</div>
  ),
  CarouselNext: ({ className = "" }: any) => (
    <button
      type="button"
      tabIndex={-1}
      aria-label="Next slide"
      className={`rounded-full border p-2 ${className}`}
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  ),
  CarouselPrevious: ({ className = "" }: any) => (
    <button
      type="button"
      tabIndex={-1}
      aria-label="Previous slide"
      className={`rounded-full border p-2 ${className}`}
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  ),
};
const renderers: Record<
  string,
  React.ComponentType<{ props: Record<string, unknown> }>
> = {
  hero: basic.HeroBlock,
  "section-header": content.SectionHeaderBlock,
  "rich-text": content.RichTextBlock,
  "text-image": content.TextImageBlock,
  "two-column-text": content.TwoColumnTextBlock,
  "callout-box": content.CalloutBoxBlock,
  "link-list": content.LinkListBlock,
  cta: content.CtaBlock,
  "cards-grid": content.CardsGridBlock,
  faq: content.FaqBlock,
  testimonials: content.TestimonialsBlock,
  "button-group": basic.ButtonGroupBlock,
  "image-block": basic.ImageBlockRenderer,
  "video-embed": basic.VideoEmbedBlock,
  "raw-html": basic.RawHtmlBlock,
  "contact-info": conversion.ContactInfoBlock,
  divider: conversion.DividerBlock,
  "feature-list": conversion.FeatureListBlock,
  "objection-busters": conversion.ObjectionBustersBlock,
  "before-after": conversion.BeforeAfterBlock,
  "trust-bar": conversion.TrustBarBlock,
  "press-mentions": conversion.PressMentionsBlock,
  "social-proof-stats": conversion.SocialProofStatsBlock,
  "image-grid": conversion.ImageGridBlock,
  slider: conversion.SliderBlock,
  "stats-bar": conversion.StatsBarBlock,
  "icon-grid": conversion.IconGridBlock,
  "benefit-stack": conversion.BenefitStackBlock,
  "science-explainer": conversion.ScienceExplainerBlock,
  "safety-checklist": conversion.SafetyChecklistBlock,
  "guarantee-warranty": conversion.GuaranteeWarrantyBlock,
  "delivery-setup": conversion.DeliverySetupBlock,
  "recovery-use-cases": conversion.RecoveryUseCasesBlock,
  "protocol-builder": conversion.ProtocolBuilderBlock,
};

function DynamicPreview({
  block,
  resource,
  brandingResource,
  socialResource,
}: {
  block: BlockInstance;
  resource?: PreviewResource;
  brandingResource?: PreviewResource;
  socialResource?: PreviewResource;
}) {
  if (!resource)
    return (
      <p role="status" className="p-6">
        {block.type === "featured-professionals" ||
        block.type === "featured-counselors"
          ? "Directory blocks are excluded from this workspace."
          : `Canvas preview for ${block.type} is unavailable. The block is preserved.`}
      </p>
    );
  if (resource.denied)
    return (
      <p role="status" className="p-6">
        This preview requires access to its content module. The block is
        preserved.
      </p>
    );
  if (resource.loading)
    return (
      <p role="status" className="p-6">
        Loading live content preview…
      </p>
    );
  if (resource.error)
    return (
      <p role="alert" className="p-6">
        Preview could not load: {resource.error}
      </p>
    );
  const rows = Array.isArray(resource.data) ? resource.data : [];
  if (block.type === "team")
    return (
      <TeamUiProvider
        value={
          {
            ...builderPrimitives,
            DialogDescription: ({ children }: any) => <p>{children}</p>,
          } as any
        }
      >
        <TeamPresentation
          props={block.props}
          members={rows.map((row) => ({
            ...row,
            biography: sanitizePublicRichHtml(row.biography ?? ""),
          }))}
        />
      </TeamUiProvider>
    );
  if (block.type === "gallery")
    return (
      <GalleryPresentation
        gallery={resource.data}
        preview
        overrides={galleryBlockSettings(block.props)}
      />
    );
  if (block.type === "events-preview")
    return (
      <EventsPreviewBlockPresentation
        props={block.props}
        events={rows.filter(
          (row) =>
            row.status === "published" &&
            row.visibility !== "private" &&
            row.visibility !== "members" &&
            !row.memberOnly,
        )}
      />
    );
  const archiveUi = {
    ...builderPrimitives,
    ...previewUi,
    CardHeader: div,
    CardFooter: div,
    CardTitle: ({ children, className }: any) => (
      <h3 className={className}>{children}</h3>
    ),
    Badge: builderPrimitives.Badge,
    Skeleton: div,
    Tooltip: div,
    TooltipTrigger: div,
    TooltipContent: () => null,
    TooltipProvider: div,
  };
  if (block.type === "events-archive")
    return (
      <ArchivePresentationHostProvider value={archiveUi as any}>
        <EventsArchivePresentation
          props={block.props}
          events={rows.filter(
            (row) =>
              row.status === "published" &&
              row.visibility !== "private" &&
              row.visibility !== "members" &&
              !row.memberOnly,
          )}
        />
      </ArchivePresentationHostProvider>
    );
  if (block.type === "video-archives")
    return (
      <ArchivePresentationHostProvider value={archiveUi as any}>
        <RecordingArchivesPresentation
          props={block.props}
          preview
          recordings={rows
            .filter(
              (row) =>
                row.status === "published" &&
                row.visibility !== "private" &&
                row.visibility !== "members" &&
                !row.memberOnly &&
                row.showInArchives &&
                row.recordingUrl &&
                new Date(row.date) < new Date(),
            )
            .map((row) => ({ ...row, recordingUrl: null }))}
        />
      </ArchivePresentationHostProvider>
    );
  if (block.type === "career-listings") {
    const jobs = rows.filter(
      (row) => row.status === "published" && row.visibility !== "internal",
    );
    return (
      <ArchivePresentationHostProvider value={archiveUi as any}>
        <CareerListingsPresentation
          props={block.props}
          useJobs={(query) => {
            const params = new URL(query, "https://preview.invalid")
              .searchParams;
            return {
              jobs: jobs.filter((job) => {
                for (const key of [
                  "department",
                  "employmentType",
                  "workMode",
                  "location",
                ]) {
                  if (params.has(key) && job[key] !== params.get(key))
                    return false;
                }
                return (
                  !params.has("q") ||
                  `${job.title} ${job.summary ?? ""} ${job.description ?? ""}`
                    .toLowerCase()
                    .includes(params.get("q")!.toLowerCase())
                );
              }),
              isLoading: false,
              filters: {
                departments: [
                  ...new Set(jobs.map((job) => job.department).filter(Boolean)),
                ],
                locations: [
                  ...new Set(jobs.map((job) => job.location).filter(Boolean)),
                ],
              },
            };
          }}
        />
      </ArchivePresentationHostProvider>
    );
  }
  if (block.type.startsWith("blog-") || block.type === "standard-blog-page") {
    const posts = rows.filter(
      (row) =>
        row.isPublished &&
        (!row.publishedAt || new Date(row.publishedAt) <= new Date()),
    );
    const View =
      block.type === "blog-preview"
        ? BlogPreviewBlockPresentation
        : block.type === "blog-featured-post"
          ? BlogFeaturedPostBlock
          : block.type === "standard-blog-page"
            ? StandardBlogPageBlock
            : BlogPostFeedBlock;
    return (
      <BlogDataProvider value={() => posts}>
        <View props={block.props} posts={posts} />
      </BlogDataProvider>
    );
  }
  if (block.type === "form-embed" || block.type === "contact-form") {
    const slug =
      block.type === "contact-form"
        ? "contact-form"
        : String(block.props.formSlug || "contact-form");
    const form = rows.find((row) => row.slug === slug);
    if (!form)
      return (
        <p className="p-6" role="status">
          Select an available form to preview its fields.
        </p>
      );
    const ui = {
      ...builderPrimitives,
      Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
        <input
          {...props}
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange?.(event.target.checked)}
        />
      ),
    };
    const formView = (
      <FormPresentationHostProvider value={{ ui: ui as any, toast: () => {} }}>
        <FormPresentation
          slug={slug}
          formOverride={{
            ...form,
            fields: (form.fields ?? []).map((field: any) => ({
              ...field,
              config: {
                ...field.config,
                htmlContent:
                  typeof field.config?.htmlContent === "string"
                    ? sanitizePublicRichHtml(field.config.htmlContent)
                    : field.config?.htmlContent,
              },
            })),
          }}
          preview
          showHeader={
            block.type !== "contact-form" && block.props.showTitle !== false
          }
          descriptionOverride={
            typeof block.props.description === "string"
              ? block.props.description
              : undefined
          }
          buttonTextOverride={
            typeof block.props.buttonText === "string"
              ? block.props.buttonText
              : undefined
          }
        />
      </FormPresentationHostProvider>
    );
    if (block.type !== "contact-form") return formView;
    const company =
      brandingResource?.data && !brandingResource.denied ? (
        <CompanyInformationPresentation
          branding={{
            ...brandingResource.data,
            socialLinks: socialResource?.denied
              ? []
              : (socialResource?.data?.socialLinks ?? []),
          }}
          social={
            socialResource?.data && !socialResource.denied ? (
              <SocialMediaLinks
                links={socialResource.data.socialLinks}
                iconStyle={socialResource.data.socialIconStyle}
                size="sm"
              />
            ) : (
              <p role="status">
                {socialResource?.denied
                  ? "Social links preview requires Social Media access."
                  : socialResource?.error || "Loading social links…"}
              </p>
            )
          }
          ui={previewUi as any}
          emptyMessage="Company information has not been configured."
        />
      ) : (
        <p role="status" className="p-6">
          {brandingResource?.denied
            ? "Company information preview requires Branding access."
            : brandingResource?.error || "Loading company information…"}
        </p>
      );
    return <ContactFormPresentation form={formView} company={company} />;
  }
  return (
    <p role="status" className="p-6">
      {block.type} data loaded; its original canvas presentation is being
      integrated.
    </p>
  );
}
export function NativeBuilderBlockPreview({
  block,
  resource,
  brandingResource,
  socialResource,
}: {
  block: BlockInstance;
  resource?: PreviewResource;
  brandingResource?: PreviewResource;
  socialResource?: PreviewResource;
}) {
  const safe = useMemo(() => sanitizeBuilderPreviewBlocks([block])[0], [block]);
  const canonical = getBlockDef(block.type)?.type ?? block.type;
  const normalized = { ...safe, type: canonical };
  const Renderer = renderers[canonical];
  return (
    <StaticRendererHostProvider value={previewUi as any}>
      {Renderer ? (
        <Renderer props={safe.props} />
      ) : (
        <DynamicPreview
          block={normalized}
          resource={resource}
          brandingResource={brandingResource}
          socialResource={socialResource}
        />
      )}
    </StaticRendererHostProvider>
  );
}
