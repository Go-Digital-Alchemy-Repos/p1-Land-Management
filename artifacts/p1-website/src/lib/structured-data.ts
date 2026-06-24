import {
  SITE_URL,
  BUSINESS_NAME,
  BUSINESS_DESCRIPTION,
  PHONE_E164,
  EMAIL,
  LOGO_URL,
  ADDRESS,
  AREAS_SERVED,
  OPENING_HOURS,
} from "./site";

type JsonLd = Record<string, unknown>;

// Stable @id for the business node so other schema nodes can reference it.
const BUSINESS_ID = `${SITE_URL}/#business`;

function areaServed() {
  return AREAS_SERVED.map((a) => ({ "@type": a.type, name: a.name }));
}

function openingHoursSpecification() {
  return OPENING_HOURS.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: h.days,
    opens: h.opens,
    closes: h.closes,
  }));
}

/**
 * LocalBusiness schema describing the company (NAP, hours, service areas).
 * Used on the home and contact pages.
 */
export function localBusinessSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "LandscapingBusiness",
    "@id": BUSINESS_ID,
    name: BUSINESS_NAME,
    description: BUSINESS_DESCRIPTION,
    url: SITE_URL,
    telephone: PHONE_E164,
    email: EMAIL,
    image: LOGO_URL,
    logo: LOGO_URL,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressRegion: ADDRESS.addressRegion,
      addressCountry: ADDRESS.addressCountry,
    },
    areaServed: areaServed(),
    openingHoursSpecification: openingHoursSpecification(),
  };
}

/**
 * Service schema for an individual service page. Links back to the business as
 * the provider and lists the markets served.
 */
export function serviceSchema(opts: {
  name: string;
  description: string;
  path: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    url: SITE_URL + opts.path,
    serviceType: opts.name,
    provider: {
      "@type": "LandscapingBusiness",
      "@id": BUSINESS_ID,
      name: BUSINESS_NAME,
      telephone: PHONE_E164,
      url: SITE_URL,
    },
    areaServed: areaServed(),
  };
}

/**
 * LocalBusiness-style schema focused on a single market, for service-area pages.
 */
export function serviceAreaSchema(opts: {
  areaName: string;
  description: string;
  path: string;
  areaType?: "AdministrativeArea" | "City";
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "LandscapingBusiness",
    "@id": BUSINESS_ID,
    name: BUSINESS_NAME,
    description: opts.description,
    url: SITE_URL + opts.path,
    telephone: PHONE_E164,
    email: EMAIL,
    image: LOGO_URL,
    logo: LOGO_URL,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressRegion: ADDRESS.addressRegion,
      addressCountry: ADDRESS.addressCountry,
    },
    areaServed: { "@type": opts.areaType ?? "AdministrativeArea", name: opts.areaName },
    openingHoursSpecification: openingHoursSpecification(),
  };
}

/**
 * BreadcrumbList schema from an ordered list of crumbs. Paths are made absolute.
 */
export function breadcrumbSchema(items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: SITE_URL + item.path,
    })),
  };
}
