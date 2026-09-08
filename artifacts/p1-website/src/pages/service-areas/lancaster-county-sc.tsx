import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import { FeatureRow } from "@/components/layout/FeatureRow";
import heroImg from "@/assets/hero-lancaster-county.png";
import featureImg from "@/assets/features/lancaster-sitework.png";
import { CheckCircle2 } from "lucide-react";

const FAQS = [
  {
    question: "What areas of Lancaster County does P1 serve?",
    answer:
      "P1 serves the entire county — Indian Land, Van Wyck, Lancaster, Kershaw, Heath Springs, and the surrounding rural areas — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 handle land clearing for new construction in Lancaster County?",
    answer:
      "Yes. P1 provides land clearing, forestry mulching, fine grading, and site preparation for commercial and residential development throughout Lancaster County, including drainage and erosion control to get sites build-ready — which matters especially in the fast-developing Indian Land panhandle.",
  },
  {
    question: "Can P1 maintain horse farms and equestrian properties?",
    answer:
      "Yes. P1 offers pasture management, field reseeding, drainage, ring and paddock grading, selective clearing, and pond maintenance for the horse farms and equestrian estates concentrated around Van Wyck and northern Lancaster County.",
  },
  {
    question: "What size properties does P1 work on?",
    answer:
      "P1 focuses on properties 1 acre and larger — commercial, industrial, agricultural, equestrian, and large residential — which lets us bring the right equipment and expertise to jobs that standard landscaping companies can't handle.",
  },
];

export default function LancasterCountySC() {
  return (
    <Layout>
      <SEO
        title="Land Clearing & Property Management Lancaster County SC | P1 | Indian Land, Van Wyck, Kershaw & Heath Springs"
        description="P1 Land & Property Management serves commercial, agricultural, equestrian, and large residential properties across Lancaster County, SC. Land clearing, grading, drainage, pasture, turf, and pond management in Indian Land, Van Wyck, Kershaw, Heath Springs, Lancaster & more. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({
            areaName: "Lancaster County, South Carolina",
            areaType: "AdministrativeArea",
            description:
              "P1 Land & Property Management serves commercial, agricultural, equestrian, and large residential properties across Lancaster County, SC. Land clearing, grading, drainage, pasture, turf, and pond management in Indian Land, Van Wyck, Kershaw, Heath Springs, Lancaster & more. Call (704) 221-8928.",
            path: "/service-areas/lancaster-county-sc",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Lancaster County, SC", path: "/service-areas/lancaster-county-sc" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        eyebrow="Service Area · SC"
        title={
          <>
            Land Clearing & Property Management in{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Lancaster County, SC
            </em>
          </>
        }
        subtitle="P1 Land & Property Management serves commercial, agricultural, equestrian, and large residential properties 1 acre and larger throughout Lancaster County, SC — from the fast-growing Indian Land panhandle and Van Wyck to the City of Lancaster, Kershaw, and Heath Springs. Full-service land management, from land clearing and grading to weekly maintenance and complete property reconstruction."
        image={heroImg}
        imageAlt="Land Clearing & Property Management in Lancaster County, SC"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">

          <FeatureRow heading="Your Lancaster County Property Partner" image={featureImg} imageAlt="Large-acreage property management in Lancaster County, SC">
            <p>
              Lancaster County is the fastest-growing county in the Charlotte region. As part of the Charlotte metro, its northern panhandle around Indian Land and Van Wyck has exploded with new residential and commercial development spilling south from Ballantyne, Fort Mill, and Waxhaw — while the central and southern reaches of the county around Lancaster, Kershaw, and Heath Springs remain defined by working farmland, pasture, timber, and large rural estates.
            </p>
            <p>
              That combination is exactly what P1 Land & Property Management is built for. Whether you own a commercial site in Indian Land, a developing tract along the U.S. 521 corridor, an equestrian property near Van Wyck, or working agricultural acreage outside Kershaw, P1 delivers the equipment, expertise, and reliability that large Lancaster County properties demand — the kind of full-scope land and property management that standard residential landscaping companies simply aren't equipped to provide.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Land & Property Management Services Throughout Lancaster County</h2>
              <ul className="space-y-3">
                {[
                  "Land clearing and forestry mulching — lot clearing, right-of-way, and rural acreage",
                  "Fine grading and site preparation for commercial and residential development",
                  "Drainage planning and scoped French-drain, retention and erosion work",
                  "Pasture and equestrian property maintenance — fields, paddocks, and riding areas",
                  "Turf installation — sod and large-acreage seeding for Piedmont soils",
                  "Tree services — trimming, removal, and selective clearing",
                  "Pond and waterway management — construction, restoration, and water quality",
                  "Commercial property management and maintenance contracts",
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
              <h2 className="text-2xl font-serif font-bold text-secondary">Communities We Serve in Lancaster County</h2>
              <p className="text-secondary/80">
                P1 provides land clearing, grading, drainage, turf, and property management services throughout Lancaster County, SC, including:
              </p>
              <ul className="space-y-3">
                {[
                  "Indian Land — the county's fastest-growing community",
                  "Van Wyck and the panhandle",
                  "Lancaster — the county seat",
                  "Kershaw and Heath Springs",
                  "Pleasant Hill and Elgin",
                  "Rich Hill and Taxahaw",
                  "The U.S. 521 and Catawba River corridors",
                  "Surrounding rural and unincorporated areas of Lancaster County",
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
            <h2 className="text-2xl font-serif font-bold text-secondary">Equestrian & Agricultural Property Management in Lancaster County</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                The Waxhaws region straddling the North Carolina line — including Van Wyck and northern Lancaster County — has a strong concentration of horse farms, barns, and equestrian estates, and agriculture remains a genuine part of the county's identity south toward Kershaw and Heath Springs. These properties need a different kind of care than a suburban lawn: pasture management and reseeding, drainage across large fenced tracts, footing and grading for rings and paddocks, selective clearing along fence lines, and pond maintenance for livestock and irrigation.
              </p>
              <p>
                From row crops and hay ground to cattle, poultry, and boarding operations, P1 works with Lancaster County farm and ranch owners on pasture renovation, land clearing, access-road grading, drainage correction, and pond construction — the earthwork and ongoing maintenance that keep working land productive. Our combined expertise in earthmoving and land maintenance makes us a natural fit for the county's agricultural and equestrian landowners.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Commercial & Development Site Work in Lancaster County</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                Few markets in the Carolinas are developing faster than Lancaster County's panhandle, where builders and commercial developers are racing to keep pace along the U.S. 521 corridor through Indian Land and Van Wyck. That growth demands land clearing, forestry mulching, fine grading, site preparation, stormwater and drainage installation, and turf establishment — handling large, complex sites that require the scale of equipment and crew most contractors can't bring. As the county tightens its development standards and infrastructure requirements, getting sites properly cleared, graded, and drained the first time matters more than ever.
              </p>
              <p>
                For property managers, developers, HOAs, and facility owners, P1 also offers ongoing commercial grounds maintenance programs that keep sites presentable and compliant year-round, long after the initial site work is complete.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">Why Lancaster County Landowners Choose P1</h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none space-y-4">
              <p>
                We're not a regional franchise or a national chain applying a one-size-fits-all approach to your property. P1 is built for the Carolinas — we understand the red clay soils of the Lancaster County Piedmont, the drainage challenges of the area's rolling terrain and the creek- and river-fed bottomland along the Catawba, the grass and pasture species that thrive here, and the seasonal patterns that drive maintenance needs throughout the year.
              </p>
              <p>
                From single land-clearing and grading projects to full-service maintenance contracts, P1 gives Lancaster County property owners one contractor for the entire life of their land — from initial clearing and reconstruction through ongoing weekly and seasonal care. If your property is 1 acre or larger and needs professional management, P1 is the call to make.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Lancaster County, SC Land & Property Management FAQs</h2>
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-2">
                  <h3 className="text-lg font-serif font-bold text-secondary">{f.question}</h3>
                  <p className="text-secondary/80 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
            <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
              Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
            </p>
          </div>

        </div>
      </section>

      <aside className="site-shell pb-12 text-lg">
        <p><Link href="/services" className="text-primary underline">Compare land management services</Link> or <Link href="/contact" className="text-primary underline">tell us about your property</Link> to discuss scope and availability.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
