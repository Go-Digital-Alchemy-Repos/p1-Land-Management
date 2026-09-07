import type { SeoSettings, BlogPost, Event, CareerJob } from "@shared/schema";
import type { TherapistWithUser } from "@shared/types/directory";
import { stripHtml } from "@/lib/html";
import { getEventPath } from "@shared/event-url";

export type JsonLdObject = Record<string, unknown>;

function compactObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ""),
  );
}

function absoluteUrl(path: string, base?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const origin = base || (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function buildOrganizationLd(globalSeo: SeoSettings): JsonLdObject | null {
  if (!globalSeo.organizationName && !globalSeo.siteName) return null;

  const name = globalSeo.organizationName || globalSeo.siteName || "Core Platform";
  const siteUrl =
    globalSeo.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  const sameAs: string[] = [
    globalSeo.facebookUrl,
    globalSeo.linkedinUrl,
    globalSeo.instagramUrl,
    globalSeo.twitterHandle ? `https://x.com/${globalSeo.twitterHandle.replace(/^@/, "")}` : null,
  ].filter((url): url is string => !!url);

  return compactObject({
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: siteUrl || undefined,
    logo: globalSeo.organizationLogoUrl
      ? {
          "@type": "ImageObject",
          url: absoluteUrl(globalSeo.organizationLogoUrl, siteUrl),
        }
      : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  });
}

export function buildWebSiteLd(globalSeo: SeoSettings): JsonLdObject | null {
  const siteUrl =
    globalSeo.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  if (!siteUrl) return null;

  return compactObject({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: globalSeo.siteName || "Core Platform",
    url: siteUrl,
  });
}

export function buildBreadcrumbLd(items: Array<{ name: string; url: string }>): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ProductLdInput {
  id?: string | null;
  name: string;
  description?: string | null;
  slug: string;
  image?: string | null;
  gallery?: string[];
  sku?: string | null;
  brandName?: string | null;
  categories?: Array<{ name: string; slug?: string | null }> | string[];
  tags?: string[];
  price: number;
  salePrice?: number | null;
  currency?: string;
  active?: boolean;
  inventoryQuantity?: number | null;
}

export function buildProductLd(
  product: ProductLdInput,
  globalSeo?: SeoSettings | null,
): JsonLdObject | null {
  if (!product.name || !product.slug) return null;

  const siteUrl =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const productUrl = `${siteUrl}/products/${product.slug}`;
  const effectivePrice = product.salePrice ?? product.price;
  const images = [product.image, ...(product.gallery ?? [])]
    .filter((src): src is string => Boolean(src))
    .map((src) => absoluteUrl(src, siteUrl));
  const categoryNames = (product.categories ?? [])
    .map((category) => (typeof category === "string" ? category : category.name))
    .filter(Boolean);
  const availability =
    product.active === false || product.inventoryQuantity === 0
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock";

  return compactObject({
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    url: productUrl,
    productID: product.id || undefined,
    name: product.name,
    description: product.description || undefined,
    image: images.length > 0 ? images : undefined,
    sku: product.sku || undefined,
    category: categoryNames.length > 0 ? categoryNames.join(" > ") : undefined,
    keywords: product.tags?.length ? product.tags.join(", ") : undefined,
    brand: compactObject({
      "@type": "Brand",
      name:
        product.brandName || globalSeo?.organizationName || globalSeo?.siteName || "Core Platform",
    }),
    offers: compactObject({
      "@type": "Offer",
      url: productUrl,
      priceCurrency: (product.currency || "USD").toUpperCase(),
      price: (effectivePrice / 100).toFixed(2),
      availability,
      itemCondition: "https://schema.org/NewCondition",
    }),
  });
}

export function buildItemListLd(
  items: Array<{ name: string; url: string; image?: string | null }>,
): JsonLdObject | null {
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) =>
      compactObject({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: item.url,
        image: item.image || undefined,
      }),
    ),
  };
}

function getProviderDisplayName(profile: TherapistWithUser): string {
  return (
    [profile.user?.firstName, profile.user?.lastName].filter(Boolean).join(" ") ||
    profile.title ||
    "Verified Provider"
  );
}

function buildProviderUrl(profile: TherapistWithUser, globalSeo?: SeoSettings | null): string {
  const siteUrl =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${siteUrl}/directory/${profile.id}`;
}

export function buildDirectoryItemListLd(
  profiles: TherapistWithUser[],
  globalSeo?: SeoSettings | null,
): JsonLdObject | null {
  return buildItemListLd(
    profiles.map((profile) => ({
      name: getProviderDisplayName(profile),
      url: buildProviderUrl(profile, globalSeo),
      image: profile.user?.profileImageUrl,
    })),
  );
}

export function buildProviderProfileLd(
  profile: TherapistWithUser,
  globalSeo?: SeoSettings | null,
): JsonLdObject | null {
  const name = getProviderDisplayName(profile);
  if (!profile.id || !name) return null;

  const siteUrl =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const url = buildProviderUrl(profile, globalSeo);
  const addressParts = [
    profile.addressLine1,
    profile.addressLine2,
    profile.city,
    profile.state,
    profile.zipCode,
    profile.country,
  ].filter(Boolean);
  const sameAs = [
    profile.website,
    profile.instagramHandle
      ? profile.instagramHandle.startsWith("http")
        ? profile.instagramHandle
        : `https://instagram.com/${profile.instagramHandle.replace(/^@/, "")}`
      : null,
    profile.facebookHandle
      ? profile.facebookHandle.startsWith("http")
        ? profile.facebookHandle
        : `https://facebook.com/${profile.facebookHandle.replace(/^@/, "")}`
      : null,
    profile.twitterHandle
      ? profile.twitterHandle.startsWith("http")
        ? profile.twitterHandle
        : `https://x.com/${profile.twitterHandle.replace(/^@/, "")}`
      : null,
    profile.linkedinHandle
      ? profile.linkedinHandle.startsWith("http")
        ? profile.linkedinHandle
        : `https://linkedin.com/in/${profile.linkedinHandle.replace(/^@/, "")}`
      : null,
    profile.youtubeHandle
      ? profile.youtubeHandle.startsWith("http")
        ? profile.youtubeHandle
        : `https://youtube.com/@${profile.youtubeHandle.replace(/^@/, "")}`
      : null,
    profile.tiktokHandle
      ? profile.tiktokHandle.startsWith("http")
        ? profile.tiktokHandle
        : `https://tiktok.com/@${profile.tiktokHandle.replace(/^@/, "")}`
      : null,
  ].filter((value): value is string => Boolean(value));

  return compactObject({
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#provider`,
    name,
    url,
    image: profile.user?.profileImageUrl
      ? absoluteUrl(profile.user.profileImageUrl, siteUrl)
      : undefined,
    jobTitle: profile.title || "Verified Provider",
    description: profile.bio ? stripHtml(profile.bio) : profile.title || undefined,
    knowsAbout: profile.specializations?.length ? profile.specializations : undefined,
    knowsLanguage: profile.languages?.length ? profile.languages : undefined,
    telephone: profile.phone || undefined,
    sameAs: sameAs.length > 0 ? sameAs.map((link) => absoluteUrl(link, siteUrl)) : undefined,
    address: addressParts.length
      ? compactObject({
          "@type": "PostalAddress",
          streetAddress:
            [profile.addressLine1, profile.addressLine2].filter(Boolean).join(", ") || undefined,
          addressLocality: profile.city || undefined,
          addressRegion: profile.state || undefined,
          postalCode: profile.zipCode || undefined,
          addressCountry: profile.country || undefined,
        })
      : undefined,
  });
}

export function buildArticleLd(
  post: BlogPost,
  globalSeo?: SeoSettings | null,
): JsonLdObject | null {
  if (!post.title) return null;

  const siteUrl =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const orgName = globalSeo?.organizationName || globalSeo?.siteName || "Core Platform";
  const postUrl = `${siteUrl}/insights/${post.slug}`;

  const image = post.ogImageUrl || post.coverImageUrl;

  return compactObject({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
    url: postUrl,
    image: image ? absoluteUrl(image, siteUrl) : undefined,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    author: compactObject({
      "@type": "Person",
      name: post.authorName,
    }),
    publisher: compactObject({
      "@type": "Organization",
      name: orgName,
      logo: globalSeo?.organizationLogoUrl
        ? {
            "@type": "ImageObject",
            url: absoluteUrl(globalSeo.organizationLogoUrl, siteUrl),
          }
        : undefined,
    }),
    mainEntityOfPage: postUrl,
  });
}

export type EventMode = "Online" | "Offline" | "Mixed";

export function buildEventLd(event: Event, globalSeo?: SeoSettings | null): JsonLdObject | null {
  if (!event.title || !event.date) return null;

  const siteUrl =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const orgName = globalSeo?.organizationName || globalSeo?.siteName || "Core Platform";
  const eventUrl = `${siteUrl}${getEventPath(event)}`;

  const isHybrid =
    event.isVirtual &&
    !!(event.latitude || event.location || event.locationName || event.locationAddress);
  const isVirtualOnly = event.isVirtual && !isHybrid;

  let eventAttendanceMode: string;
  if (isVirtualOnly) {
    eventAttendanceMode = "https://schema.org/OnlineEventAttendanceMode";
  } else if (isHybrid) {
    eventAttendanceMode = "https://schema.org/MixedEventAttendanceMode";
  } else {
    eventAttendanceMode = "https://schema.org/OfflineEventAttendanceMode";
  }

  const location: JsonLdObject[] = [];
  if (event.isVirtual) {
    const joinUrl = event.virtualJoinUrl || event.zoomLink;
    location.push(
      compactObject({
        "@type": "VirtualLocation",
        url: joinUrl || undefined,
      }),
    );
  }
  if (!isVirtualOnly) {
    const displayAddress = event.locationAddress || event.locationName || event.location;
    if (displayAddress) {
      location.push(
        compactObject({
          "@type": "Place",
          name: event.locationName || event.location || undefined,
          address: displayAddress,
        }),
      );
    }
  }

  const isPast = new Date(event.date) < new Date();
  let eventStatus: string;
  if (event.status === "canceled") {
    eventStatus = "https://schema.org/EventCancelled";
  } else if (isPast || event.status === "completed") {
    eventStatus = "https://schema.org/EventScheduled";
  } else {
    eventStatus = "https://schema.org/EventScheduled";
  }

  const offers: JsonLdObject | undefined = event.registrationEnabled
    ? compactObject({
        "@type": "Offer",
        price:
          event.registrationType === "paid" && event.registrationFee != null
            ? (event.registrationFee / 100).toFixed(2)
            : "0",
        priceCurrency: (event.registrationCurrency || "usd").toUpperCase(),
        url: eventUrl,
        availability:
          event.status === "canceled"
            ? "https://schema.org/Discontinued"
            : "https://schema.org/InStock",
        validFrom: event.registrationOpensAt
          ? new Date(event.registrationOpensAt).toISOString()
          : undefined,
      })
    : undefined;

  const performer: JsonLdObject | undefined = event.speakerName
    ? compactObject({
        "@type": "Person",
        name: event.speakerName,
        description: event.speakerBio || undefined,
        image: event.speakerImageUrl ? absoluteUrl(event.speakerImageUrl, siteUrl) : undefined,
      })
    : undefined;

  return compactObject({
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description || undefined,
    url: eventUrl,
    image: event.imageUrl ? absoluteUrl(event.imageUrl, siteUrl) : undefined,
    startDate: new Date(event.date).toISOString(),
    endDate: event.endDate ? new Date(event.endDate).toISOString() : undefined,
    eventAttendanceMode,
    eventStatus,
    location: location.length > 0 ? (location.length === 1 ? location[0] : location) : undefined,
    organizer: compactObject({
      "@type": "Organization",
      name: orgName,
      url: siteUrl || undefined,
    }),
    offers,
    performer,
  });
}

export function buildVideoObjectLd(
  event: Event,
  globalSeo?: SeoSettings | null,
): JsonLdObject | null {
  if (!event.recordingUrl) return null;
  if (!event.title) return null;

  const siteUrl =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  return compactObject({
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: event.title,
    description: event.description || undefined,
    contentUrl: event.recordingUrl,
    thumbnailUrl: event.imageUrl ? absoluteUrl(event.imageUrl, siteUrl) : undefined,
    uploadDate: event.endDate
      ? new Date(event.endDate).toISOString()
      : new Date(event.date).toISOString(),
  });
}

export function buildJobPostingLd(
  job: CareerJob,
  globalSeo?: SeoSettings | null,
): JsonLdObject | null {
  if (!job.title || !job.slug) return null;

  const siteUrl =
    globalSeo?.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const jobUrl = `${siteUrl}/careers/${job.slug}`;
  const orgName = globalSeo?.organizationName || globalSeo?.siteName || "Core Platform";
  const isRemote = job.workMode === "remote";

  const baseSalary =
    job.salaryVisible && (job.salaryMin || job.salaryMax)
      ? compactObject({
          "@type": "MonetaryAmount",
          currency: job.salaryCurrency || "USD",
          value: compactObject({
            "@type": "QuantitativeValue",
            minValue: job.salaryMin ?? undefined,
            maxValue: job.salaryMax ?? undefined,
            unitText: (job.salaryPeriod || "year").toUpperCase(),
          }),
        })
      : undefined;

  return compactObject({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.summary || undefined,
    identifier: compactObject({
      "@type": "PropertyValue",
      name: orgName,
      value: job.id,
    }),
    datePosted: job.publishedAt ? new Date(job.publishedAt).toISOString() : undefined,
    validThrough: job.closesAt ? new Date(job.closesAt).toISOString() : undefined,
    employmentType: job.employmentType?.toUpperCase(),
    directApply: true,
    hiringOrganization: compactObject({
      "@type": "Organization",
      name: orgName,
      sameAs: siteUrl || undefined,
      logo: globalSeo?.organizationLogoUrl
        ? absoluteUrl(globalSeo.organizationLogoUrl, siteUrl)
        : undefined,
    }),
    jobLocationType: isRemote ? "TELECOMMUTE" : undefined,
    applicantLocationRequirements: isRemote
      ? compactObject({ "@type": "Country", name: "United States" })
      : undefined,
    jobLocation:
      !isRemote && (job.location || job.locationAddress)
        ? compactObject({
            "@type": "Place",
            address: job.locationAddress || job.location,
          })
        : undefined,
    baseSalary,
    url: jobUrl,
  });
}

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqBlock {
  type: string;
  props: {
    items?: FaqItem[];
    title?: string;
  };
}

interface BuilderContent {
  blocks?: FaqBlock[];
}

export function extractFaqItems(pageContent: unknown): FaqItem[] {
  if (!pageContent || typeof pageContent !== "object") return [];
  const content = pageContent as BuilderContent;
  if (!Array.isArray(content.blocks)) return [];

  const items: FaqItem[] = [];
  for (const block of content.blocks) {
    if (block.type === "faq" && Array.isArray(block.props?.items)) {
      for (const item of block.props.items) {
        if (item.question && item.answer) {
          items.push({ question: stripHtml(item.question), answer: stripHtml(item.answer) });
        }
      }
    }
  }
  return items;
}

export function buildFaqPageLd(faqItems: FaqItem[]): JsonLdObject | null {
  if (faqItems.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
