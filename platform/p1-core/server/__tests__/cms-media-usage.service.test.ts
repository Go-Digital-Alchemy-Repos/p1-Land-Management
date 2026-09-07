import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CmsMediaAsset } from "@shared/schema";

const mockStorage = vi.hoisted(() => ({
  cmsPages: { getAllPages: vi.fn() },
  team: { list: vi.fn() },
  blog: { getAllPosts: vi.fn() },
  events: { getAllEvents: vi.fn() },
  eventOrganizers: { getAllOrganizers: vi.fn() },
  seoSettings: { get: vi.fn() },
  users: { getAllUsers: vi.fn() },
  therapists: { getProfileMediaUsage: vi.fn() },
  settings: { getAllSettings: vi.fn() },
  ecommerce: {
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    getProductMedia: vi.fn(),
  },
}));

vi.mock("../storage", () => ({
  storage: mockStorage,
}));

import { buildCmsMediaLibraryAssets } from "../services/cms-media-usage.service";

function asset(overrides: Partial<CmsMediaAsset> = {}): CmsMediaAsset {
  return {
    id: "media-1",
    filename: "profile.webp",
    originalName: "profile.webp",
    title: "Profile",
    url: "/uploads/cms/avatars/profile.webp",
    mimeType: "image/webp",
    fileSize: 1024,
    r2Key: null,
    alt: "",
    caption: null,
    description: null,
    seoTitle: null,
    seoDescription: null,
    ogTitle: null,
    ogDescription: null,
    uploadedBy: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("cms media usage service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.team.list.mockResolvedValue([]);
    mockStorage.cmsPages.getAllPages.mockResolvedValue([]);
    mockStorage.blog.getAllPosts.mockResolvedValue([]);
    mockStorage.events.getAllEvents.mockResolvedValue([]);
    mockStorage.eventOrganizers.getAllOrganizers.mockResolvedValue([]);
    mockStorage.seoSettings.get.mockResolvedValue(null);
    mockStorage.users.getAllUsers.mockResolvedValue([]);
    mockStorage.therapists.getProfileMediaUsage.mockResolvedValue([]);
    mockStorage.settings.getAllSettings.mockResolvedValue([]);
    mockStorage.ecommerce.getProducts.mockResolvedValue([]);
    mockStorage.ecommerce.getCategories.mockResolvedValue([]);
    mockStorage.ecommerce.getProductMedia.mockResolvedValue([]);
  });

  it("tracks published and draft Team portraits", async () => {
    const media = asset();
    mockStorage.team.list.mockResolvedValue([
      { id: "team-live", name: "Live member", photoUrl: media.url, status: "published" },
      { id: "team-draft", name: "Draft member", photoUrl: media.url, status: "draft" },
    ]);
    const [result] = await buildCmsMediaLibraryAssets([media]);
    expect(result.isInUse).toBe(true);
    expect(result.usageRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "team_member",
          entityId: "team-live",
          isLive: true,
          path: "/admin/cms/team",
        }),
        expect.objectContaining({
          entityType: "team_member",
          entityId: "team-draft",
          isLive: false,
        }),
      ]),
    );
  });

  it("tracks images embedded in Team biographies", async () => {
    const media = asset();
    mockStorage.team.list.mockResolvedValue([
      {
        id: "team-bio",
        name: "Member",
        photoUrl: "",
        biography: `<p><img src="${media.url}"></p>`,
        status: "published",
      },
    ]);
    const [result] = await buildCmsMediaLibraryAssets([media]);
    expect(result.usageRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: "team_member", field: "biography", isLive: true }),
      ]),
    );
  });

  it("tracks shared media references from bolt-on apps", async () => {
    const media = asset();
    mockStorage.users.getAllUsers.mockResolvedValue([
      {
        id: "user-1",
        email: "pro@example.com",
        firstName: "Avery",
        lastName: "Stone",
        role: "therapist",
        adminPermissions: [],
        formNotificationFormIds: [],
        profileImageUrl: media.url,
        isSuspended: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockStorage.settings.getAllSettings.mockResolvedValue([
      {
        id: "setting-1",
        key: "frontend_logo_url",
        value: media.url,
        category: "branding",
        isSecret: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockStorage.ecommerce.getProducts.mockResolvedValue([
      {
        id: "product-1",
        name: "Workbook",
        urlSlug: "workbook",
        active: true,
        status: "published",
        visibility: "online",
        archivedAt: null,
        mediaId: media.id,
        primaryImage: media.url,
        ogImage: null,
        secondaryImages: [],
      },
    ]);
    mockStorage.ecommerce.getProductMedia.mockResolvedValue([
      {
        id: "product-media-1",
        productId: "product-1",
        variantId: null,
        mediaId: media.id,
        url: media.url,
        type: "image",
        altText: "Workbook cover",
        sortOrder: 0,
        primary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockStorage.therapists.getProfileMediaUsage.mockResolvedValue([
      {
        media: {
          id: "directory-media-1",
          profileId: "profile-1",
          mediaId: media.id,
          url: media.url,
          type: "image",
          altText: "Professional office",
          caption: "Office photo",
          sortOrder: 0,
          primary: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        profile: {
          id: "profile-1",
          userId: "user-1",
          isActive: true,
          isApproved: true,
        },
        user: {
          id: "user-1",
          email: "pro@example.com",
          firstName: "Avery",
          lastName: "Stone",
          isSuspended: false,
        },
      },
    ]);

    const [result] = await buildCmsMediaLibraryAssets([media]);

    expect(result.assetKind).toBe("image");
    expect(result.isInUse).toBe(true);
    expect(result.usageRefs).toEqual(expect.arrayContaining([
      expect.objectContaining({entityId:"user-1",field:"profileImageUrl"}),
      expect.objectContaining({entityType:"branding",field:"frontend_logo_url"}),
    ]));
    expect(result.usageRefs.some(ref => ref.entityType === "ecommerce_product")).toBe(false);

  });
});
