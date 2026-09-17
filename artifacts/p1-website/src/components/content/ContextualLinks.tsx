import { toTitleCase } from "@/lib/title-case";
import locationLinks from "@/lib/location-inbound-links.json";
import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";

type RelatedLink = {
  href: string;
  label: string;
  description: string;
};

type RelatedLinksConfig = {
  heading: string;
  intro: string;
  links: RelatedLink[];
};

const SERVICES = {
  commercial: { href: "/services/commercial-landscaping", label: "Commercial landscaping", description: "Regular mowing, seasonal grounds care, and maintenance around your operations." },
  industrial: { href: "/services/industrial-agricultural", label: "Industrial and agricultural land care", description: "Large-acreage vegetation, access, and property management for working sites." },
  clearing: { href: "/services/land-clearing", label: "Land clearing", description: "Selective clearing, forestry mulching, and site access preparation." },
  grading: { href: "/services/grading-site-preparation", label: "Grading and site preparation", description: "Shape grades, improve access, and prepare ground for its next use." },
  drainage: { href: "/services/drainage", label: "Drainage solutions", description: "Find the cause of standing water, runoff, and erosion." },
  turf: { href: "/services/turf-installation-seeding", label: "Turf installation and seeding", description: "Plant sod or seed on properly prepared ground." },
  trees: { href: "/services/tree-services", label: "Tree services", description: "Manage trees, overgrowth, and selective clearing across large properties." },
  ponds: { href: "/services/pond-waterway-management", label: "Pond and waterway management", description: "Maintain pond edges, waterways, shoreline areas, and visible water flow." },
  reconstruction: { href: "/services/property-reconstruction", label: "Property reconstruction", description: "Repair drainage, reshape damaged ground, and restore turf." },
  snow: { href: "/services/commercial-snow-ice-management", label: "Commercial snow and ice management", description: "Plan snow clearing and ice treatment for your commercial site." },
  secureFacilities: { href: "/commercial/data-centers-secure-facilities", label: "Data center and secure facility grounds", description: "Grounds care planned around facility access and site rules." },
} satisfies Record<string, RelatedLink>;

const AREAS = {
  all: { href: "/service-areas", label: "All P1 service areas", description: "Review coverage across Upstate South Carolina and greater Charlotte." },
  upstate: { href: "/service-areas/upstate-south-carolina", label: "Upstate South Carolina", description: "Regional coverage for commercial, industrial, agricultural, municipal, and institutional properties." },
  greenville: { href: "/service-areas/greenville-sc", label: "Greenville, SC", description: "Large-property services across Greenville and the surrounding Upstate market." },
  spartanburg: { href: "/service-areas/spartanburg-sc", label: "Spartanburg, SC", description: "Commercial-scale land and grounds care in Spartanburg County." },
  anderson: { href: "/service-areas/anderson-sc", label: "Anderson, SC", description: "Property management for Anderson-area working land and active sites." },
  lancaster: { href: "/service-areas/lancaster-county-sc", label: "Lancaster County, SC", description: "Land and grounds services along the Charlotte and Upstate growth corridor." },
  york: { href: "/service-areas/york-county-sc", label: "York County, SC", description: "Commercial, industrial, institutional, and large-acreage property care." },
  charlotte: { href: "/service-areas/charlotte-north-carolina", label: "Charlotte, NC", description: "Commercial-scale property management throughout Charlotte and Mecklenburg County." },
  concord: { href: "/service-areas/concord-nc", label: "Concord, NC", description: "Land and grounds services across Concord and Cabarrus County." },
  lakeNorman: { href: "/service-areas/mooresville-lake-norman-nc", label: "Mooresville and Lake Norman, NC", description: "Property care for sloped, waterfront, commercial, and institutional sites." },
  gastonia: { href: "/service-areas/gastonia-nc", label: "Gastonia, NC", description: "Large-property services across Gastonia and Gaston County." },
  union: { href: "/service-areas/union-county-nc", label: "Union County, NC", description: "Commercial, agricultural, municipal, and institutional property care." },
} satisfies Record<string, RelatedLink>;

const RESOURCES = {
  blog: { href: "/blog", label: "Land and property resources", description: "Read practical guidance for planning work across large Carolinas properties." },
  clearingCost: { href: "/blog/land-clearing-cost-per-acre-south-carolina", label: "Land clearing cost factors", description: "Understand the site conditions that influence a clearing estimate." },
  pondGuide: { href: "/blog/how-to-manage-retention-pond-south-carolina", label: "Retention pond management guide", description: "Review common pond maintenance and warning signs." },
  grassGuide: { href: "/blog/best-grass-large-acreage-carolinas", label: "Grass choices for large acreage", description: "Compare grass choices, planting methods, and early care." },
  drainageGuide: { href: "/blog/signs-property-drainage-problem", label: "Signs of a property drainage problem", description: "Learn what standing water, washouts, and bare patches can tell you." },
  agGuide: { href: "/blog/preparing-land-agricultural-use-carolinas", label: "Preparing land for agricultural use", description: "See how clearing, grading, drainage, and access fit into a working-land plan." },
} satisfies Record<string, RelatedLink>;

const related = (heading: string, intro: string, links: RelatedLink[]): RelatedLinksConfig => ({ heading, intro, links });

const relatedByPath: Record<string, RelatedLinksConfig> = {
  "/about": related("Explore P1's work", "Learn about our services and where we work.", [SERVICES.commercial, SERVICES.reconstruction, AREAS.all]),
  "/gallery": related("Plan the work behind the photos", "Find the service that fits your property and see where we work.", [SERVICES.clearing, SERVICES.grading, SERVICES.ponds, AREAS.all]),
  "/blog": related("Connect guidance to your property", "Explore the services covered in this guide and our nearby service areas.", [SERVICES.clearing, SERVICES.drainage, SERVICES.commercial, AREAS.all]),

  "/blog/land-clearing-cost-per-acre-south-carolina": related("Continue planning a clearing project", "Learn about the work that may come before or after clearing.", [SERVICES.clearing, SERVICES.grading, AREAS.upstate, AREAS.lancaster]),
  "/blog/how-to-manage-retention-pond-south-carolina": related("Continue planning pond and drainage work", "Explore drainage and erosion work that can help protect your pond.", [SERVICES.ponds, SERVICES.drainage, AREAS.upstate, AREAS.lakeNorman]),
  "/blog/best-grass-large-acreage-carolinas": related("Continue planning turf establishment", "Successful turf work starts with the condition of the soil, grades, and drainage.", [SERVICES.turf, SERVICES.grading, AREAS.charlotte, AREAS.upstate]),
  "/blog/signs-property-drainage-problem": related("Continue planning drainage corrections", "See how grading, drainage, and pond care can address water problems.", [SERVICES.drainage, SERVICES.grading, SERVICES.ponds, AREAS.all]),
  "/blog/preparing-land-agricultural-use-carolinas": related("Continue planning working land", "Find help with clearing, grading, drainage, and planting.", [SERVICES.industrial, SERVICES.clearing, SERVICES.grading, AREAS.union]),

  "/commercial": related("Commercial property resources", "Explore more ways we can help care for your commercial property.", [{ ...SERVICES.commercial, label: "recurring grounds care" }, SERVICES.snow, SERVICES.secureFacilities, AREAS.charlotte]),
  "/services/commercial-snow-ice-management": related("Build a year-round exterior plan", "Plan winter work alongside year-round grounds care.", [SERVICES.commercial, SERVICES.secureFacilities, AREAS.charlotte, AREAS.york]),
  "/commercial/data-centers-secure-facilities": related("Connected secure-facility services", "Explore grounds care and repairs around your facility's access rules.", [SERVICES.commercial, SERVICES.drainage, SERVICES.snow, AREAS.charlotte]),

  "/services": related("Find service coverage", "Find the services you need across Upstate SC and greater Charlotte.", [AREAS.upstate, AREAS.charlotte, AREAS.all]),
  "/services/commercial-landscaping": related("Related commercial property services", "Plan tree care and winter work alongside regular grounds maintenance.", [SERVICES.snow, SERVICES.trees, SERVICES.secureFacilities, AREAS.charlotte, AREAS.greenville]),
  "/services/industrial-agricultural": related("Related working-land services", "Explore clearing, drainage, and pond care for your working property.", [SERVICES.clearing, SERVICES.drainage, SERVICES.ponds, AREAS.union]),
  "/services/land-clearing": related("Services connected to land clearing", "Plan what happens before, during, and after vegetation removal.", [SERVICES.trees, SERVICES.grading, SERVICES.turf, RESOURCES.clearingCost]),
  "/services/grading-site-preparation": related("Services connected to grading", "Plan access, drainage, and new turf alongside grading.", [SERVICES.drainage, SERVICES.turf, SERVICES.reconstruction, AREAS.all]),
  "/services/drainage": related("Services connected to drainage", "Find help with the slopes, ponds, and damaged ground around a drainage problem.", [SERVICES.grading, SERVICES.ponds, SERVICES.reconstruction, RESOURCES.drainageGuide]),
  "/services/turf-installation-seeding": related("Services connected to turf establishment", "Get the grade and drainage ready before planting.", [SERVICES.grading, SERVICES.drainage, SERVICES.commercial, RESOURCES.grassGuide]),
  "/services/tree-services": related("Services connected to tree work", "Plan tree work alongside clearing and regular grounds care.", [SERVICES.clearing, SERVICES.commercial, SERVICES.reconstruction, AREAS.all]),
  "/services/pond-waterway-management": related("Services connected to ponds and waterways", "Explore drainage and grading work around ponds and waterways.", [SERVICES.drainage, SERVICES.grading, SERVICES.secureFacilities, AREAS.lakeNorman, RESOURCES.pondGuide]),
  "/services/property-reconstruction": related("Services connected to property reconstruction", "Clearing, drainage repairs, and planting can be part of restoring your property.", [SERVICES.clearing, SERVICES.grading, SERVICES.drainage, SERVICES.turf]),

  "/service-areas": related("Compare services across the region", "Start with the work your property needs.", [SERVICES.commercial, SERVICES.clearing, SERVICES.drainage, SERVICES.reconstruction]),
  "/service-areas/upstate-south-carolina": related("Explore Upstate services and markets", "Find nearby service areas and learn about the work we do.", [AREAS.greenville, AREAS.spartanburg, AREAS.anderson, SERVICES.commercial]),
  "/service-areas/greenville-sc": related("Related Greenville services and areas", "Explore our services and nearby Upstate communities.", [SERVICES.commercial, SERVICES.drainage, AREAS.upstate, AREAS.spartanburg]),
  "/service-areas/spartanburg-sc": related("Related Spartanburg services and areas", "Find help with commercial grounds and working acreage across the Upstate.", [SERVICES.commercial, SERVICES.clearing, AREAS.upstate, AREAS.greenville]),
  "/service-areas/anderson-sc": related("Related Anderson services and areas", "Explore farm and pond care in Anderson and the surrounding Upstate.", [SERVICES.industrial, SERVICES.ponds, AREAS.upstate, AREAS.greenville]),
  "/service-areas/lancaster-county-sc": related("Related Lancaster County services and areas", "Find services and nearby communities along the Charlotte and Upstate corridor.", [SERVICES.clearing, SERVICES.commercial, AREAS.charlotte, AREAS.york]),
  "/service-areas/york-county-sc": related("Related York County services and areas", "Explore grounds care, drainage, and nearby service areas.", [SERVICES.commercial, SERVICES.drainage, AREAS.charlotte, AREAS.lancaster]),
  "/service-areas/charlotte-north-carolina": related("Related Charlotte services and areas", "Find commercial property services throughout greater Charlotte.", [SERVICES.commercial, SERVICES.drainage, AREAS.concord, AREAS.union]),
  "/service-areas/concord-nc": related("Related Concord services and areas", "Explore grounds care, site preparation, and nearby communities.", [SERVICES.commercial, SERVICES.grading, AREAS.charlotte, AREAS.lakeNorman]),
  "/service-areas/mooresville-lake-norman-nc": related("Related Lake Norman services and areas", "Find pond and drainage services around Lake Norman.", [SERVICES.ponds, SERVICES.drainage, AREAS.charlotte, AREAS.concord]),
  "/service-areas/gastonia-nc": related("Related Gastonia services and areas", "Explore clearing, drainage, and nearby service areas.", [SERVICES.clearing, SERVICES.drainage, AREAS.charlotte, AREAS.york]),
  "/service-areas/union-county-nc": related("Related Union County services and areas", "Find grounds and farm care across the southeast Charlotte area.", [SERVICES.commercial, SERVICES.industrial, AREAS.charlotte, AREAS.lancaster]),
};

export function ContextualLinks() {
  const [path] = useLocation();
  const route = path.replace(/\/$/, "") || "/";
  const extra = (locationLinks as Record<string, RelatedLink[]>)[route] || [];
  const base = relatedByPath[route];
  const config = base ? { ...base, links: [...base.links, ...extra] } : extra.length ? related("Nearby property services", "Find services near your property.", extra) : undefined;

  if (!config) return null;

  const links = [...new Map(config.links.map(item => [item.href, item])).values()];
  const areas = links.filter(item => item.href.startsWith("/service-areas"));
  const services = links.filter(item => !item.href.startsWith("/service-areas"));
  const heading = toTitleCase(config.heading);

  return (
    <section className="border-y border-secondary/10 bg-secondary/[0.035]" aria-labelledby="related-pages-heading">
      <div className="site-shell py-12 md:py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-[0.16em] text-primary">Explore More With P1</p>
          <h2 id="related-pages-heading" className="mt-3 font-display text-3xl font-semibold text-secondary md:text-4xl">{heading}</h2>
          <p className="mt-3 leading-relaxed text-secondary/75">{config.intro}</p>
        </div>
        {services.length > 0 && <nav aria-label="Related Services and Resources" className="mt-8">
          <ul className={`grid gap-4 ${services.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            {services.map(item => <li key={item.href}>
              <Link href={item.href} className="group flex h-full flex-col rounded-xl border border-secondary/10 bg-background p-6 transition-colors hover:border-primary/50 hover:bg-primary/[0.035] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                <span className="flex items-start justify-between gap-4 text-lg font-bold leading-snug text-secondary">
                  <span>{toTitleCase(item.label)}</span>
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-primary transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
                </span>
                <span className="mt-3 text-sm leading-relaxed text-secondary/70">{item.description}</span>
              </Link>
            </li>)}
          </ul>
        </nav>}
        {areas.length > 0 && <nav aria-labelledby="related-areas-heading" className="mt-9 border-t border-secondary/15 pt-7 md:flex md:gap-10">
          <div className="mb-5 shrink-0 md:mb-0 md:w-48">
            <h3 id="related-areas-heading" className="font-display text-xl font-semibold text-secondary">Explore Service Areas</h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary/70">Local coverage across the Carolinas.</p>
          </div>
          <ul className="grid flex-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map(item => <li key={item.href}>
              <Link href={item.href} className="group flex min-h-12 items-center justify-between gap-3 rounded-md px-3 py-3 text-sm font-semibold leading-snug text-primary transition-colors hover:bg-primary/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                {toTitleCase(item.label)}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>)}
          </ul>
        </nav>}
      </div>
    </section>
  );
}
