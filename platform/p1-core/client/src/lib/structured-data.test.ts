import { describe, expect, it } from "vitest";
import {
  buildDirectoryItemListLd,
  buildItemListLd,
  buildProductLd,
  buildProviderProfileLd,
} from "./structured-data";

describe("ecommerce structured data", () => {
  it("builds rich product JSON-LD for ecommerce product pages", () => {
    const schema = buildProductLd(
      {
        id: "product-1",
        name: "Identity Workbook",
        description: "Guided workbook",
        slug: "identity-workbook",
        image: "/media/workbook.jpg",
        gallery: ["/media/workbook-2.jpg"],
        sku: "WORKBOOK-1",
        categories: [{ name: "Guides", slug: "guides" }],
        tags: ["Workbook", "Featured"],
        price: 4900,
        salePrice: 3900,
        inventoryQuantity: 12,
      },
      {
        siteUrl: "https://example.com",
        siteName: "Core Platform",
        organizationName: "Digital Alchemy",
      } as never,
    );

    expect(schema).toMatchObject({
      "@type": "Product",
      "@id": "https://example.com/products/identity-workbook#product",
      url: "https://example.com/products/identity-workbook",
      productID: "product-1",
      category: "Guides",
      keywords: "Workbook, Featured",
      offers: {
        price: "39.00",
        availability: "https://schema.org/InStock",
      },
    });
  });

  it("builds shop ItemList JSON-LD for product index pages", () => {
    const schema = buildItemListLd([
      {
        name: "Product A",
        url: "https://example.com/products/a",
        image: "https://example.com/a.jpg",
      },
      { name: "Product B", url: "https://example.com/products/b" },
    ]);

    expect(schema).toMatchObject({
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Product A",
          url: "https://example.com/products/a",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Product B",
          url: "https://example.com/products/b",
        },
      ],
    });
  });
});

describe("directory structured data", () => {
  it("builds ItemList JSON-LD for public provider directory results", () => {
    const schema = buildDirectoryItemListLd(
      [
        {
          id: "provider-1",
          title: "Business Advisor",
          bio: "Advisory services",
          userId: "user-1",
          directoryMode: "service_provider",
          specializations: ["Strategy"],
          languages: ["English"],
          credentials: null,
          licenseNumber: null,
          practiceMode: "virtual",
          addressLine1: null,
          addressLine2: null,
          city: "Seattle",
          state: "WA",
          country: "United States",
          zipCode: null,
          latitude: null,
          longitude: null,
          phone: null,
          website: null,
          instagramHandle: null,
          facebookHandle: null,
          twitterHandle: null,
          linkedinHandle: null,
          youtubeHandle: null,
          tiktokHandle: null,
          acceptingClients: true,
          willingToTravel: false,
          isFeatured: false,
          featuredUntil: null,
          isApproved: true,
          isActive: true,
          rejectionReason: null,
          searchVector: null,
          createdAt: null,
          updatedAt: null,
          user: {
            firstName: "Avery",
            lastName: "Stone",
            email: "avery@example.com",
            profileImageUrl: "/uploads/avery.jpg",
          },
        },
      ],
      { siteUrl: "https://example.com" } as never,
    );

    expect(schema).toMatchObject({
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Avery Stone",
          url: "https://example.com/directory/provider-1",
          image: "/uploads/avery.jpg",
        },
      ],
    });
  });

  it("builds profile JSON-LD with neutral provider details", () => {
    const schema = buildProviderProfileLd(
      {
        id: "provider-2",
        userId: "user-2",
        directoryMode: "service_provider",
        title: "Implementation Consultant",
        bio: "<p>Helps teams launch complex programs.</p>",
        specializations: ["Operations", "Training"],
        languages: ["English", "Spanish"],
        credentials: null,
        licenseNumber: null,
        practiceMode: "both",
        addressLine1: "123 Main St",
        addressLine2: null,
        city: "Austin",
        state: "TX",
        country: "US",
        zipCode: "78701",
        latitude: null,
        longitude: null,
        phone: "555-1212",
        website: "example.org",
        instagramHandle: "@avery",
        facebookHandle: null,
        twitterHandle: null,
        linkedinHandle: null,
        youtubeHandle: null,
        tiktokHandle: null,
        acceptingClients: true,
        willingToTravel: true,
        isFeatured: false,
        featuredUntil: null,
        isApproved: true,
        isActive: true,
        rejectionReason: null,
        searchVector: null,
        createdAt: null,
        updatedAt: null,
        user: {
          firstName: "Avery",
          lastName: "Stone",
          email: "avery@example.com",
          profileImageUrl: "/uploads/avery.jpg",
        },
      },
      { siteUrl: "https://platform.example" } as never,
    );

    expect(schema).toMatchObject({
      "@type": "Person",
      "@id": "https://platform.example/directory/provider-2#provider",
      name: "Avery Stone",
      url: "https://platform.example/directory/provider-2",
      image: "https://platform.example/uploads/avery.jpg",
      jobTitle: "Implementation Consultant",
      description: "Helps teams launch complex programs.",
      knowsAbout: ["Operations", "Training"],
      knowsLanguage: ["English", "Spanish"],
      telephone: "555-1212",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Austin",
        addressRegion: "TX",
      },
    });
  });
});
