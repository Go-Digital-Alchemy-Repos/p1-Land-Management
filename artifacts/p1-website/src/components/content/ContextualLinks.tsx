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
  commercial: { href: "/services/commercial-landscaping", label: "Commercial landscaping", description: "Recurring grounds care and coordinated exterior maintenance for active properties." },
  industrial: { href: "/services/industrial-agricultural", label: "Industrial and agricultural land care", description: "Large-acreage vegetation, access, and property management for working sites." },
  clearing: { href: "/services/land-clearing", label: "Land clearing", description: "Selective clearing, forestry mulching, and site access preparation." },
  grading: { href: "/services/grading-site-preparation", label: "Grading and site preparation", description: "Shape grades, improve access, and prepare ground for its next use." },
  drainage: { href: "/services/drainage", label: "Drainage solutions", description: "Evaluate runoff, erosion, standing water, and connected site conditions." },
  turf: { href: "/services/turf-installation-seeding", label: "Turf installation and seeding", description: "Establish durable turf after grading, drainage, or corrective work." },
  trees: { href: "/services/tree-services", label: "Tree services", description: "Manage trees, overgrowth, and selective clearing across large properties." },
  ponds: { href: "/services/pond-waterway-management", label: "Pond and waterway management", description: "Maintain pond edges, waterways, shoreline areas, and visible water flow." },
  reconstruction: { href: "/services/property-reconstruction", label: "Property reconstruction", description: "Coordinate corrective earthwork, drainage, access, and finish restoration." },
  snow: { href: "/services/commercial-snow-ice-management", label: "Commercial snow and ice management", description: "Seasonal planning and response for qualifying commercial properties." },
  secureFacilities: { href: "/commercial/data-centers-secure-facilities", label: "Data center and secure facility grounds", description: "Controlled exterior maintenance for large, access-sensitive campuses." },
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
  grassGuide: { href: "/blog/best-grass-large-acreage-carolinas", label: "Grass choices for large acreage", description: "Compare establishment considerations for large Carolinas properties." },
  drainageGuide: { href: "/blog/signs-property-drainage-problem", label: "Signs of a property drainage problem", description: "Learn how recurring site symptoms may point to a larger water issue." },
  agGuide: { href: "/blog/preparing-land-agricultural-use-carolinas", label: "Preparing land for agricultural use", description: "See how clearing, grading, drainage, and access fit into a working-land plan." },
} satisfies Record<string, RelatedLink>;

const related = (heading: string, intro: string, links: RelatedLink[]): RelatedLinksConfig => ({ heading, intro, links });

const relatedByPath: Record<string, RelatedLinksConfig> = {
  "/about": related("Explore P1's work", "See how P1's operating approach translates into services and regional coverage.", [SERVICES.commercial, SERVICES.reconstruction, AREAS.all]),
  "/gallery": related("Plan the work behind the photos", "Move from examples of completed work to the service and location information for your property.", [SERVICES.clearing, SERVICES.grading, SERVICES.ponds, AREAS.all]),
  "/blog": related("Connect guidance to your property", "Use the service and regional pages to turn general planning information into a property-specific conversation.", [SERVICES.clearing, SERVICES.drainage, SERVICES.commercial, AREAS.all]),

  "/blog/land-clearing-cost-per-acre-south-carolina": related("Continue planning a clearing project", "Compare connected services and regional coverage before requesting a site-specific estimate.", [SERVICES.clearing, SERVICES.grading, AREAS.upstate, AREAS.lancaster]),
  "/blog/how-to-manage-retention-pond-south-carolina": related("Continue planning pond and drainage work", "Pond conditions often connect to drainage, erosion, and the surrounding service area.", [SERVICES.ponds, SERVICES.drainage, AREAS.upstate, AREAS.lakeNorman]),
  "/blog/best-grass-large-acreage-carolinas": related("Continue planning turf establishment", "Successful turf work starts with the condition of the soil, grades, and drainage.", [SERVICES.turf, SERVICES.grading, AREAS.charlotte, AREAS.upstate]),
  "/blog/signs-property-drainage-problem": related("Continue planning drainage corrections", "Review the services that commonly connect runoff, grades, ponds, and finish restoration.", [SERVICES.drainage, SERVICES.grading, SERVICES.ponds, AREAS.all]),
  "/blog/preparing-land-agricultural-use-carolinas": related("Continue planning working land", "Connect the preparation sequence to the services and markets that fit your acreage.", [SERVICES.industrial, SERVICES.clearing, SERVICES.grading, AREAS.union]),

  "/commercial": related("Commercial property resources", "Explore the specialty services and regional coverage available for active commercial sites.", [{ ...SERVICES.commercial, label: "recurring grounds care" }, SERVICES.snow, SERVICES.secureFacilities, AREAS.charlotte]),
  "/services/commercial-snow-ice-management": related("Build a year-round exterior plan", "Connect winter response planning with recurring grounds care and large-campus services.", [SERVICES.commercial, SERVICES.secureFacilities, AREAS.charlotte, AREAS.york]),
  "/commercial/data-centers-secure-facilities": related("Connected secure-facility services", "Review the exterior capabilities and markets that support access-sensitive campuses.", [SERVICES.commercial, SERVICES.drainage, SERVICES.snow, AREAS.charlotte]),

  "/services": related("Find service coverage", "P1 delivers these connected capabilities across two primary Carolinas markets.", [AREAS.upstate, AREAS.charlotte, AREAS.all]),
  "/services/commercial-landscaping": related("Related commercial property services", "Build recurring grounds care around seasonal planning, tree work, and the property market.", [SERVICES.snow, SERVICES.trees, AREAS.charlotte, AREAS.greenville]),
  "/services/industrial-agricultural": related("Related working-land services", "Clearing, drainage, and pond care often support the same industrial or agricultural property plan.", [SERVICES.clearing, SERVICES.drainage, SERVICES.ponds, AREAS.union]),
  "/services/land-clearing": related("Services connected to land clearing", "Plan what happens before, during, and after vegetation removal.", [SERVICES.trees, SERVICES.grading, SERVICES.turf, RESOURCES.clearingCost]),
  "/services/grading-site-preparation": related("Services connected to grading", "Grades, drainage, access, and stabilization should be planned as one sequence.", [SERVICES.drainage, SERVICES.turf, SERVICES.reconstruction, AREAS.all]),
  "/services/drainage": related("Services connected to drainage", "Visible water problems may involve grades, ponds, erosion, and finish restoration.", [SERVICES.grading, SERVICES.ponds, SERVICES.reconstruction, RESOURCES.drainageGuide]),
  "/services/turf-installation-seeding": related("Services connected to turf establishment", "Prepare grades and drainage before selecting a large-acreage turf approach.", [SERVICES.grading, SERVICES.drainage, SERVICES.commercial, RESOURCES.grassGuide]),
  "/services/tree-services": related("Services connected to tree work", "Coordinate selective tree management with clearing and recurring grounds care.", [SERVICES.clearing, SERVICES.commercial, SERVICES.reconstruction, AREAS.all]),
  "/services/pond-waterway-management": related("Services connected to ponds and waterways", "Review drainage, grading, and regional considerations around managed water.", [SERVICES.drainage, SERVICES.grading, AREAS.lakeNorman, RESOURCES.pondGuide]),
  "/services/property-reconstruction": related("Services connected to property reconstruction", "A corrective project may combine clearing, earthwork, drainage, and finish establishment.", [SERVICES.clearing, SERVICES.grading, SERVICES.drainage, SERVICES.turf]),

  "/service-areas": related("Compare services across the region", "Start with the capability that best matches the immediate condition on your property.", [SERVICES.commercial, SERVICES.clearing, SERVICES.drainage, SERVICES.reconstruction]),
  "/service-areas/upstate-south-carolina": related("Explore Upstate services and markets", "Connect the regional overview to a nearby market or a frequently requested service.", [AREAS.greenville, AREAS.spartanburg, AREAS.anderson, SERVICES.commercial]),
  "/service-areas/greenville-sc": related("Related Greenville services and areas", "Review connected property services and neighboring Upstate coverage.", [SERVICES.commercial, SERVICES.drainage, AREAS.upstate, AREAS.spartanburg]),
  "/service-areas/spartanburg-sc": related("Related Spartanburg services and areas", "Compare services that support active sites and working acreage across the Upstate.", [SERVICES.commercial, SERVICES.clearing, AREAS.upstate, AREAS.greenville]),
  "/service-areas/anderson-sc": related("Related Anderson services and areas", "Connect working-land and water management needs with nearby Upstate coverage.", [SERVICES.industrial, SERVICES.ponds, AREAS.upstate, AREAS.greenville]),
  "/service-areas/lancaster-county-sc": related("Related Lancaster County services and areas", "Review services and neighboring markets along the Charlotte and Upstate corridor.", [SERVICES.clearing, SERVICES.commercial, AREAS.charlotte, AREAS.york]),
  "/service-areas/york-county-sc": related("Related York County services and areas", "Connect commercial grounds and water management with nearby regional coverage.", [SERVICES.commercial, SERVICES.drainage, AREAS.charlotte, AREAS.lancaster]),
  "/service-areas/charlotte-north-carolina": related("Related Charlotte services and areas", "Compare core commercial services and neighboring markets across greater Charlotte.", [SERVICES.commercial, SERVICES.drainage, AREAS.concord, AREAS.union]),
  "/service-areas/concord-nc": related("Related Concord services and areas", "Connect commercial grounds, site preparation, and nearby Charlotte-region coverage.", [SERVICES.commercial, SERVICES.grading, AREAS.charlotte, AREAS.lakeNorman]),
  "/service-areas/mooresville-lake-norman-nc": related("Related Lake Norman services and areas", "Review the water, drainage, and nearby market pages most relevant to Lake Norman properties.", [SERVICES.ponds, SERVICES.drainage, AREAS.charlotte, AREAS.concord]),
  "/service-areas/gastonia-nc": related("Related Gastonia services and areas", "Connect land preparation and water management with nearby regional coverage.", [SERVICES.clearing, SERVICES.drainage, AREAS.charlotte, AREAS.york]),
  "/service-areas/union-county-nc": related("Related Union County services and areas", "Review services for working acreage and active sites across the southeast Charlotte corridor.", [SERVICES.commercial, SERVICES.industrial, AREAS.charlotte, AREAS.lancaster]),
};

export function ContextualLinks() {
  const [path] = useLocation();
  const route = path.replace(/\/$/, "") || "/";
  const extra = (locationLinks as Record<string, RelatedLink[]>)[route] || [];
  const base = relatedByPath[route];
  const config = base ? { ...base, links: [...base.links, ...extra] } : extra.length ? related("Nearby property services", "Explore connected local coverage.", extra) : undefined;

  if (!config) return null;

  return (
    <section className="bg-background" aria-labelledby="related-pages-heading">
      <div className="site-shell py-14 md:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase text-primary">Related Services & Areas</p>
          <h2 id="related-pages-heading" className="mt-2 font-display text-3xl font-semibold text-secondary">
            {config.heading}
          </h2>
          <p className="mt-3 leading-relaxed text-secondary/75">{config.intro}</p>
        </div>
        <nav aria-label={config.heading} className="mt-8">
          <ul className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {config.links.map((item) => (
              <li key={item.href} className="border-t border-border pt-4">
                <Link href={item.href} className="group inline-flex items-center gap-2 font-bold text-primary underline-offset-4 hover:underline">
                  {item.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <p className="mt-2 text-sm leading-relaxed text-secondary/70">{item.description}</p>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
