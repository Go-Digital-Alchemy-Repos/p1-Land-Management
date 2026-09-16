export const SITE_URL = "https://www.p1landmanagement.com";
export const BUSINESS_NAME = "P1 Land & Property Management";
export const PHONE_DISPLAY = "(704) 221-8928";
export const PHONE_HREF = "tel:+17042218928";
export const PHONE_E164 = "+17042218928";
export const GOOGLE_BUSINESS_URL =
  "https://www.google.com/maps/place/P1+Land+Management/@34.8311425,-80.622017,17z/data=!3m1!4b1!4m6!3m5!1s0x8855cd2b88976525:0x49c378cdfdecac9a!8m2!3d34.8311381!4d-80.6194367!16s%2Fg%2F11nw0vxpb_?entry=ttu&g_ep=EgoyMDI2MDkxMy4wIKXMDSoASAFQAw%3D%3D";

export const BUSINESS_DESCRIPTION =
  "Full-service land and property management — commercial landscaping and grounds maintenance, land clearing, grading, drainage, turf, tree, and pond services — for commercial, industrial, and agricultural properties 1 acre and larger across Upstate South Carolina and the greater Charlotte, North Carolina region.";

// Social cards need a broad photographic image, while structured data needs
// the actual P1 mark supplied for the company's icon and favicon.
export const BUSINESS_IMAGE_URL = `${SITE_URL}/opengraph.jpg`;
export const LOGO_URL = `${SITE_URL}/p1-symbol.svg`;

// Days/hours of operation, used for LocalBusiness openingHoursSpecification.
export const OPENING_HOURS = [
  {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "07:00",
    closes: "18:00",
  },
];

// NAP — this is a service-area business without a public storefront, so the
// address is modeled at the regional level and the markets are expressed via
// areaServed below.
export const ADDRESS = {
  addressRegion: "NC",
  addressCountry: "US",
};

// Geographic markets served, used for LocalBusiness/Service areaServed.
export const AREAS_SERVED: { name: string; type: "AdministrativeArea" | "City" }[] = [
  { name: "Upstate South Carolina", type: "AdministrativeArea" },
  { name: "Greenville, South Carolina", type: "City" },
  { name: "Spartanburg, South Carolina", type: "City" },
  { name: "Anderson, South Carolina", type: "City" },
  { name: "Charlotte, North Carolina", type: "City" },
  { name: "Concord, North Carolina", type: "City" },
  { name: "Mooresville, North Carolina", type: "City" },
  { name: "Gastonia, North Carolina", type: "City" },
  { name: "Union County, North Carolina", type: "AdministrativeArea" },
  { name: "Lancaster County, South Carolina", type: "AdministrativeArea" },
  { name: "York County, South Carolina", type: "AdministrativeArea" },
];

export const COMPANY_ICON_URL = `${SITE_URL}/p1-symbol.svg`;
