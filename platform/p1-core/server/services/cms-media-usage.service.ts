import { storage } from "../storage";
import type {
  BlogPost,
  CmsMediaAsset,
  CmsMediaLibraryAsset,
  CmsMediaUsageReference,
  DirectoryProfileMedia,
  CmsPage,
  CmsGalleryWithItems,
  Event,
  SeoSettings,
  SystemSetting,
  User,
} from "@shared/schema";

function isImageMimeType(mimeType: string) {
  return mimeType.startsWith("image/");
}

function assetKind(asset: CmsMediaAsset): "image" | "document" {
  return isImageMimeType(asset.mimeType) ? "image" : "document";
}

function buildAssetNeedles(asset: CmsMediaAsset): string[] {
  const needles = new Set<string>();
  if (asset.url) {
    needles.add(asset.url);
    try {
      const parsed = new URL(asset.url);
      needles.add(parsed.toString());
      if (parsed.pathname.startsWith("/cms/media/") || parsed.pathname.startsWith("/uploads/")) {
        needles.add(parsed.pathname);
      }
    } catch {
      // Relative URLs are fine as-is.
    }
  }
  return Array.from(needles).filter(Boolean);
}

function textReferencesAsset(text: string, asset: CmsMediaAsset): boolean {
  return buildAssetNeedles(asset).some((needle) => text.includes(needle));
}

function valueReferencesAsset(value: unknown, asset: CmsMediaAsset): boolean {
  if (!value) return false;
  if (typeof value === "string") {
    return textReferencesAsset(value, asset);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => valueReferencesAsset(entry, asset));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      valueReferencesAsset(entry, asset),
    );
  }
  return false;
}

function addUsageReference(
  usageMap: Map<string, CmsMediaUsageReference[]>,
  dedupe: Set<string>,
  assetId: string,
  reference: CmsMediaUsageReference,
) {
  const dedupeKey = `${assetId}:${reference.entityType}:${reference.entityId}:${reference.field}`;
  if (dedupe.has(dedupeKey)) {
    return;
  }
  dedupe.add(dedupeKey);
  const existing = usageMap.get(assetId) ?? [];
  existing.push(reference);
  usageMap.set(assetId, existing);
}

function addAssetIdUsage<T extends { id: string }>(
  usageMap: Map<string, CmsMediaUsageReference[]>,
  dedupe: Set<string>,
  entity: T,
  entityType: CmsMediaUsageReference["entityType"],
  entityName: string,
  path: string | undefined,
  field: string,
  mediaId: string | null | undefined,
  isLive: boolean,
  statusLabel: string,
) {
  if (!mediaId) return;
  addUsageReference(usageMap, dedupe, mediaId, {
    entityType,
    entityId: entity.id,
    entityName,
    field,
    path,
    isLive,
    statusLabel,
  });
}

function addDirectFieldUsage<T extends { id: string }>(
  assets: CmsMediaAsset[],
  usageMap: Map<string, CmsMediaUsageReference[]>,
  dedupe: Set<string>,
  entity: T,
  entityType: CmsMediaUsageReference["entityType"],
  entityName: string,
  path: string | undefined,
  field: string,
  fieldValue: string | null | undefined,
  isLive: boolean,
  statusLabel: string,
) {
  if (!fieldValue) return;
  for (const asset of assets) {
    if (!textReferencesAsset(fieldValue, asset)) continue;
    addUsageReference(usageMap, dedupe, asset.id, {
      entityType,
      entityId: entity.id,
      entityName,
      field,
      path,
      isLive,
      statusLabel,
    });
  }
}

function addContentUsage<T extends { id: string }>(
  assets: CmsMediaAsset[],
  usageMap: Map<string, CmsMediaUsageReference[]>,
  dedupe: Set<string>,
  entity: T,
  entityType: CmsMediaUsageReference["entityType"],
  entityName: string,
  path: string | undefined,
  content: unknown,
  isLive: boolean,
  statusLabel: string,
) {
  for (const asset of assets) {
    if (!valueReferencesAsset(content, asset)) continue;
    addUsageReference(usageMap, dedupe, asset.id, {
      entityType,
      entityId: entity.id,
      entityName,
      field: "content",
      path,
      isLive,
      statusLabel,
    });
  }
}

function pageStatusLabel(page: CmsPage) {
  return page.status === "published"
    ? "Published page"
    : `${page.status[0].toUpperCase()}${page.status.slice(1)} page`;
}

function postStatusLabel(post: BlogPost) {
  return post.isPublished ? "Published post" : "Draft post";
}

function eventStatusLabel(event: Event) {
  if (event.status === "published" && event.visibility === "public") {
    return "Published event";
  }
  const visibility = event.visibility ? ` (${event.visibility})` : "";
  return `${event.status ?? "Draft"} event${visibility}`;
}

function organizerStatusLabel() {
  return "Event organizer";
}

function directoryProfileStatusLabel(user: User) {
  return user.isSuspended ? "Suspended directory account" : "Directory profile";
}

function brandingStatusLabel(setting: SystemSetting) {
  return setting.key === "frontend_logo_url"
    ? "Site logo"
    : setting.key === "favicon_url"
      ? "Site favicon"
      : "Branding setting";
}

function directoryGalleryStatusLabel(media: DirectoryProfileMedia) {
  return media.primary ? "Primary directory gallery image" : "Directory gallery image";
}

function cmsGalleryStatusLabel(gallery: CmsGalleryWithItems) {
  return gallery.status === "published" ? "Published gallery" : `${gallery.status} gallery`;
}

export async function buildCmsMediaLibraryAssets(
  assets: CmsMediaAsset[],
): Promise<CmsMediaLibraryAsset[]> {
  const [
    pages,
    posts,
    events,
    organizers,
    seoSettings,
    appUsers,
    settings,
    galleries,
    teamMembers,
  ] = await Promise.all([
    storage.cmsPages.getAllPages(),
    storage.blog.getAllPosts(),
    storage.events.getAllEvents(),
    storage.eventOrganizers.getAllOrganizers(),
    storage.seoSettings.get(),
    storage.users.getAllUsers(),
    storage.settings.getAllSettings(),
    (
      storage as typeof storage & {
        cmsGalleries?: { getAll: () => Promise<CmsGalleryWithItems[]> };
      }
    ).cmsGalleries?.getAll?.() ?? Promise.resolve([]),
    storage.team?.list?.() ?? Promise.resolve([]),
  ]);

  const usageMap = new Map<string, CmsMediaUsageReference[]>();
  const dedupe = new Set<string>();

  for (const page of pages) {
    const isLive = page.status === "published";
    const path = page.slug ? `/${page.slug}` : undefined;
    addDirectFieldUsage(
      assets,
      usageMap,
      dedupe,
      page,
      "page",
      page.title,
      path,
      "ogImageUrl",
      page.ogImageUrl,
      isLive,
      pageStatusLabel(page),
    );
    addContentUsage(
      assets,
      usageMap,
      dedupe,
      page,
      "page",
      page.title,
      path,
      page.content,
      isLive,
      pageStatusLabel(page),
    );
  }

  for (const member of teamMembers) {
    for (const field of ["photoUrl", "biography"] as const) {
      addDirectFieldUsage(
        assets,
        usageMap,
        dedupe,
        member,
        "team_member",
        member.name,
        "/admin/cms/team",
        field,
        member[field],
        member.status === "published",
        `${member.status} team member`,
      );
    }
  }

  for (const gallery of galleries) {
    const fullGallery = await storage.cmsGalleries.getById(gallery.id);
    if (!fullGallery) continue;
    const path = `/admin/cms/galleries/${fullGallery.id}`;
    for (const item of fullGallery.items) {
      const label = cmsGalleryStatusLabel(fullGallery);
      addAssetIdUsage(
        usageMap,
        dedupe,
        fullGallery,
        "cms_gallery",
        fullGallery.title,
        path,
        "items.mediaId",
        item.mediaId,
        fullGallery.status === "published",
        label,
      );
      addDirectFieldUsage(
        assets,
        usageMap,
        dedupe,
        fullGallery,
        "cms_gallery",
        fullGallery.title,
        path,
        "items.imageUrl",
        item.imageUrl,
        fullGallery.status === "published",
        label,
      );
    }
  }

  for (const post of posts) {
    const isLive = Boolean(post.isPublished);
    const path = post.slug ? `/insights/${post.slug}` : undefined;
    addDirectFieldUsage(
      assets,
      usageMap,
      dedupe,
      post,
      "blog_post",
      post.title,
      path,
      "coverImageUrl",
      post.coverImageUrl,
      isLive,
      postStatusLabel(post),
    );
    addDirectFieldUsage(
      assets,
      usageMap,
      dedupe,
      post,
      "blog_post",
      post.title,
      path,
      "ogImageUrl",
      post.ogImageUrl,
      isLive,
      postStatusLabel(post),
    );
    addContentUsage(
      assets,
      usageMap,
      dedupe,
      post,
      "blog_post",
      post.title,
      path,
      post.content,
      isLive,
      postStatusLabel(post),
    );
  }

  for (const event of events) {
    const isLive = event.status === "published" && event.visibility === "public";
    const path = `/events`;
    addDirectFieldUsage(
      assets,
      usageMap,
      dedupe,
      event,
      "event",
      event.title,
      path,
      "imageUrl",
      event.imageUrl,
      isLive,
      eventStatusLabel(event),
    );
    addDirectFieldUsage(
      assets,
      usageMap,
      dedupe,
      event,
      "event",
      event.title,
      path,
      "speakerImageUrl",
      event.speakerImageUrl,
      isLive,
      eventStatusLabel(event),
    );
    addContentUsage(
      assets,
      usageMap,
      dedupe,
      event,
      "event",
      event.title,
      path,
      event.description,
      isLive,
      eventStatusLabel(event),
    );
  }

  for (const organizer of organizers) {
    const path = "/events";
    addDirectFieldUsage(
      assets,
      usageMap,
      dedupe,
      organizer,
      "event",
      organizer.name,
      path,
      "imageUrl",
      organizer.imageUrl,
      true,
      organizerStatusLabel(),
    );
  }

  for (const user of appUsers) {
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
    addDirectFieldUsage(
      assets,
      usageMap,
      dedupe,
      user,
      "directory_profile",
      displayName,
      "/directory",
      "profileImageUrl",
      user.profileImageUrl,
      !user.isSuspended,
      directoryProfileStatusLabel(user),
    );
  }

  for (const setting of settings.filter((item) => item.category === "branding")) {
    addDirectFieldUsage(
      assets,
      usageMap,
      dedupe,
      setting,
      "branding",
      brandingStatusLabel(setting),
      undefined,
      setting.key,
      setting.value,
      true,
      brandingStatusLabel(setting),
    );
  }

  if (seoSettings) {
    const globalSeo = seoSettings as SeoSettings;
    const seoEntity = { id: globalSeo.id };
    addDirectFieldUsage(
      assets,
      usageMap,
      dedupe,
      seoEntity,
      "global_seo",
      "Global SEO",
      undefined,
      "defaultOgImageUrl",
      globalSeo.defaultOgImageUrl,
      true,
      "Global setting",
    );
    addDirectFieldUsage(
      assets,
      usageMap,
      dedupe,
      seoEntity,
      "global_seo",
      "Global SEO",
      undefined,
      "organizationLogoUrl",
      globalSeo.organizationLogoUrl,
      true,
      "Global setting",
    );
  }

  return assets.map((asset) => {
    const usageRefs = (usageMap.get(asset.id) ?? []).sort((a, b) => {
      if (a.isLive !== b.isLive) {
        return a.isLive ? -1 : 1;
      }
      return a.entityName.localeCompare(b.entityName);
    });
    const liveUsageCount = usageRefs.filter((ref) => ref.isLive).length;

    return {
      ...asset,
      assetKind: assetKind(asset),
      usageRefs,
      usageCount: usageRefs.length,
      liveUsageCount,
      isInUse: liveUsageCount > 0,
    };
  });
}
