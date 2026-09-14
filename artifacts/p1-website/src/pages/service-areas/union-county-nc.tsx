import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import { FeatureRow } from "@/components/layout/FeatureRow";
import heroImg from "@/assets/hero-union-county.png";
import featureImg from "@/assets/features/union-county-equestrian.png";
import { CheckCircle2 } from "lucide-react";

import { FaqAccordion } from "@/components/content/FaqAccordion";

const FAQS = [
  {
    question: "What areas of Union County does P1 serve?",
    answer:
      "P1 serves the entire county — Monroe, Indian Trail, Stallings, Waxhaw, Marvin, Weddington, Wesley Chapel, Mineral Springs, Wingate, Unionville, Fairview, Marshville, and the surrounding rural areas — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 handle land clearing for new construction in Union County?",
    answer:
      "Yes. P1 provides land clearing, forestry mulching, fine grading, and site preparation for commercial, industrial, municipal, and institutional development throughout Union County, including drainage and erosion control to get sites build-ready.",
  },
  {
    question: "Can P1 maintain horse farms and equestrian properties?",
    answer:
      "Yes. P1 offers pasture management, field reseeding, drainage, ring and paddock grading, selective clearing, and pond maintenance for horse farms and equestrian operations around Waxhaw, Marvin, and Weddington.",
  },
  {
    question: "What size properties does P1 work on?",
    answer:
      "P1 focuses on commercial, industrial, agricultural, equestrian, municipal, and institutional properties 1 acre and larger, which lets us bring the right equipment and expertise to large-scale jobs. P1 does not provide residential services.",
  },
];

export default function UnionCountyNC() {
  return (
    <Layout>
      <SEO
        title="Land Clearing & Property Management Union County NC | P1 | Monroe, Waxhaw, Indian Trail & Weddington"
        description="P1 Land & Property Management serves commercial, industrial, agricultural, equestrian, municipal, and institutional properties across Union County, NC. Land clearing, grading, drainage, pasture, turf, and pond management in Monroe, Waxhaw, Indian Trail, Weddington & more. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({
            areaName: "Union County, North Carolina",
            areaType: "AdministrativeArea",
            description:
              "P1 Land & Property Management serves commercial, industrial, agricultural, equestrian, municipal, and institutional properties across Union County, NC. Land clearing, grading, drainage, pasture, turf, and pond management in Monroe, Waxhaw, Indian Trail, Weddington & more. Call (704) 221-8928.",
            path: "/service-areas/union-county-nc",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Union County, NC", path: "/service-areas/union-county-nc" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        eyebrow="Service Area · NC"
        title={
          <>
            Land Clearing & Property Management in{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Union County, NC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management serves commercial, industrial, agricultural, equestrian, municipal, and institutional properties 1 acre and larger throughout Union County, NC — from Monroe and Indian Trail to Waxhaw, Weddington, and the agricultural acreage in between. Full-service land management, from land clearing and grading to weekly maintenance and complete property reconstruction."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Union County, NC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">

          <FeatureRow heading="Your Union County Property Partner" image={featureImg} imageAlt="Large-acreage property management in Union County, NC">
            <p>
              Union County is one of the fastest-growing counties in North Carolina. Growth is reshaping the land through new commercial corridors, industrial sites, public facilities, and institutional campuses around Indian Trail, Stallings, and Monroe, while the county's western and southern reaches around Waxhaw, Marvin, and Weddington remain defined by horse farms and working pasture.
            </p>
            <p>
              That combination is exactly what P1 Land & Property Management is built for. Whether you manage a commercial site in Monroe, a developing tract in Indian Trail, an equestrian operation in Waxhaw, or working agricultural acreage in Unionville, P1 delivers the equipment, expertise, and reliability that large Union County properties demand.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Land & Property Management Services Throughout Union County</h2>
              <ul className="space-y-3">
                {[
                  "Land clearing and forestry mulching — lot clearing, right-of-way, and rural acreage",
                  "Fine grading and site preparation for commercial, industrial, municipal, and institutional development",
                  "Drainage planning and scoped French-drain, retention and erosion work",
                  "Pasture and equestrian property maintenance — fields, paddocks, and riding areas",
                  "Turf installation — sod and large-acreage seeding for Piedmont soils",
                  "Tree services — trimming, removal, and selective clearing",
                  "Pond and waterway management — construction, restoration, and water quality",
                  "Commercial landscaping and exterior grounds maintenance contracts",
                  "Full property reconstruction",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-secondary/80 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Communities We Serve in Union County</h2>
              <p className="text-secondary/80">
                P1 provides land clearing, grading, drainage, turf, and property management services throughout Union County, NC, including:
              </p>
              <ul className="space-y-3">
                {[
                  "Monroe — the county seat and commercial hub",
                  "Indian Trail and Stallings",
                  "Waxhaw and Marvin",
                  "Weddington and Wesley Chapel",
                  "Mineral Springs and Wingate",
                  "Unionville, Fairview, and Hemby Bridge",
                  "Marshville, Lake Park, and New Salem",
                  "Surrounding rural and unincorporated areas of Union County",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-secondary/80 font-medium">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-muted p-8 rounded-xl border border-border shadow-sm space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Equestrian & Agricultural Property Management in Union County</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                Union County has one of the strongest concentrations of horse farms and equestrian operations in the greater Charlotte region — especially around Waxhaw, Marvin, Weddington, and Mineral Springs. These properties need commercial-scale care: pasture management and reseeding, drainage across large fenced tracts, footing and grading for rings and paddocks, selective clearing along fence lines, and pond maintenance for livestock and irrigation.
              </p>
              <p>
                Agriculture also remains a genuine part of Union County's economy, from row crops like soybeans, grains, and cotton to poultry, cattle, and hay operations. P1 works with farm and ranch owners on pasture renovation, land clearing, access-road grading, drainage correction, and pond construction — the earthwork and ongoing maintenance that keep working land productive. Our combined expertise in earthmoving and land maintenance makes us a natural fit for Union County's agricultural and equestrian landowners.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Commercial & Development Site Work in Union County</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                The growth spreading south and east out of Charlotte has made Union County one of the most active development markets in the region, with Indian Trail, Monroe, and Waxhaw each managing significant new commercial, industrial, municipal, and institutional construction. P1 supports that growth with land clearing, forestry mulching, fine grading, site preparation, stormwater and drainage installation, and turf establishment — handling large, complex sites that require the scale of equipment and crew most contractors can't bring.
              </p>
              <p>
                For commercial property managers, developers, industrial facilities, municipalities, and institutions, P1 also offers ongoing grounds maintenance programs that keep sites presentable and compliant year-round, long after the initial site work is complete.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Why Union County Property Teams Choose P1</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                We're not a regional franchise or a national chain applying a one-size-fits-all approach to your property. P1 is built for the Carolinas — we understand the red clay soils of the Union County Piedmont, the drainage challenges of the area's rolling terrain and creek-fed bottomland, the grass and pasture species that thrive here, and the seasonal patterns that drive maintenance needs throughout the year.
              </p>
              <p>
                From single land-clearing and grading projects to full-service maintenance contracts, P1 gives Union County commercial, industrial, agricultural, equestrian, municipal, and institutional property teams one contractor for the entire life of their land — from initial clearing and reconstruction through ongoing weekly and seasonal care.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Union County, NC Land & Property Management FAQs</h2>
            <FaqAccordion items={FAQS} />
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
            </p>
          </div>

        </div>
      </section>

      <aside className="site-shell pb-12 text-lg">
        <p><Link href="/services" className="text-primary underline">Compare land management services</Link>, review <Link href="/commercial-snow-ice-management" className="text-primary underline">commercial snow and ice management</Link>, or <Link href="/contact" className="text-primary underline">tell us about your property</Link>.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
