import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { serviceAreaSchema, breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { Link } from "wouter";
import { FeatureRow } from "@/components/layout/FeatureRow";
import heroImg from "@/assets/hero-upstate-sc.png";
import upstateImg from "@/assets/features/upstate-partner.png";
import lancasterCountyImg from "@/assets/features/lancaster-sitework.png";
import { CheckCircle2, ArrowRight } from "lucide-react";

const FAQS = [
  {
    question: "Which parts of Upstate South Carolina does P1 serve?",
    answer:
      "P1 serves the entire Greenville-Spartanburg corridor and surrounding Upstate counties — including Greenville, Spartanburg, Anderson, Greer, Simpsonville, Easley, Gaffney, Laurens, and the rural communities in between — for properties 1 acre and larger.",
  },
  {
    question: "Does P1 work with farms and agricultural land in the Upstate?",
    answer:
      "Yes. P1 works with farm operators and rural landowners across the Upstate on pasture maintenance, land clearing, access-road grading, drainage correction, and pond construction and management.",
  },
  {
    question: "Does P1 offer both project work and ongoing maintenance in Upstate SC?",
    answer:
      "Yes. P1 handles one-time projects like land clearing, grading, and drainage installation as well as weekly and seasonal maintenance contracts for commercial campuses, industrial facilities, HOAs, and large estates.",
  },
  {
    question: "What size properties does P1 work on in Upstate South Carolina?",
    answer:
      "P1 focuses on properties 1 acre and larger — commercial, industrial, agricultural, and large residential — bringing the equipment and expertise that standard landscaping companies can't provide.",
  },
];

export default function UpstateSC() {
  return (
    <Layout>
      <SEO 
        title="Land & Property Management Upstate South Carolina | P1 | Greenville, Spartanburg & Surrounding Areas"
        description="P1 Land & Property Management serves commercial, agricultural, and large residential properties throughout Upstate South Carolina. Land clearing, grading, drainage, turf, ponds, and more. Call (704) 221-8928."
        jsonLd={[
          serviceAreaSchema({ areaName: "Upstate South Carolina", areaType: "AdministrativeArea", description: "P1 Land & Property Management serves commercial, agricultural, and large residential properties throughout Upstate South Carolina. Land clearing, grading, drainage, turf, ponds, and more. Call (704) 221-8928.", path: "/service-areas/upstate-south-carolina" }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Service Areas", path: "/service-areas" },
            { name: "Upstate South Carolina", path: "/service-areas/upstate-south-carolina" },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        eyebrow="Service Area · SC"
        title={
          <>
            Land & Property Management in{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Upstate South Carolina
            </em>
          </>
        }
        subtitle="P1 serves commercial, agricultural, and large residential properties 1 acre and larger throughout the Greenville-Spartanburg corridor and surrounding Upstate South Carolina counties. Full-service land management — from weekly maintenance to complete property reconstruction."
        image={heroImg}
        imageAlt="Land & Property Management in Upstate South Carolina"
      />

      <section className="py-24 bg-background">
        <div className="site-shell space-y-16">
          
          <FeatureRow heading="Your Upstate SC Property Partner" image={upstateImg} imageAlt="Rolling Upstate South Carolina countryside with large properties">
            <p>
              Upstate South Carolina is one of the fastest-growing regions in the Southeast — and with that growth comes increasing demand for professional land and property management at commercial, industrial, and agricultural scale. P1 Land & Property Management has built its operations around serving this market with the full range of services that large properties actually need.
            </p>
            <p>
              Whether you manage a commercial campus in Greenville, farm acreage in Anderson County, an industrial facility near Spartanburg, or a rural estate in the foothills, P1 delivers the expertise, equipment, and reliability your property demands.
            </p>
          </FeatureRow>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Services Available Throughout Upstate SC</h2>
              <ul className="space-y-3">
                {[
                  "Commercial property management and maintenance contracts",
                  "Industrial and agricultural land maintenance",
                  "Land clearing and forestry mulching",
                  "Fine grading and site preparation",
                  "Drainage design and installation",
                  "Turf installation — sod and large-acreage seeding",
                  "Tree services — trimming, removal, and selective clearing",
                  "Pond and waterway management",
                  "Full property reconstruction"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-secondary/80 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-secondary">Communities We Serve in Upstate SC</h2>
              <p className="text-secondary/80">P1 provides land and property management services throughout Upstate South Carolina, including:</p>
              <ul className="space-y-3">
                {[
                  "Greenville and Greenville County",
                  "Spartanburg and Spartanburg County",
                  "Anderson and Anderson County",
                  "Gaffney and Cherokee County",
                  "Greer, Taylors, and Travelers Rest",
                  "Simpsonville, Fountain Inn, and Mauldin",
                  "Duncan, Inman, and Boiling Springs",
                  "Easley, Piedmont, and Pelzer",
                  "Laurens and Laurens County",
                  "Union and surrounding areas"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-secondary/80 font-medium">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-muted p-8 rounded-xl border border-border shadow-sm space-y-4">
            <h2 className="text-2xl font-serif font-bold text-secondary">
              Why Upstate SC Landowners Choose P1
            </h2>
            <div className="prose prose-lg prose-p:text-secondary/80 max-w-none">
              <p>
                We're not a regional franchise or a national chain applying a one-size-fits-all approach to your property. P1 is built for the Carolinas — we understand the red clay soils of the Piedmont, the drainage challenges of the region's rolling terrain, the grass species that thrive here, and the seasonal patterns that drive maintenance needs throughout the year.
              </p>
              <p>
                We work with local commercial developers, regional farm operators, rural estate owners, industrial facility managers, and HOAs managing significant acreage. If your property is 1 acre or larger and needs professional management, P1 is the call to make.
              </p>
              <p className="font-bold text-secondary mt-6 border-l-4 border-primary pl-4">
                Call <a href="tel:7042218928" className="text-primary hover:underline">+1 (704) 221-8928</a> or <Link href="/contact" className="text-primary hover:underline">request a free estimate online</Link> to discuss your property.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">County Spotlight</h2>
            <Link
              href="/service-areas/lancaster-county-sc"
              className="bg-card border border-card-border rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row group hover-elevate"
              data-testid="link-lancaster-county-card"
            >
              <div className="md:w-2/5 aspect-[16/9] md:aspect-auto overflow-hidden">
                <img
                  src={lancasterCountyImg}
                  alt="Heavy equipment performing sitework on a development site in Lancaster County, SC"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <p className="text-primary font-bold uppercase tracking-wider text-xs mb-2">Upstate & Midlands · SC</p>
                <h3 className="text-2xl font-serif font-bold text-secondary mb-3">Lancaster County, SC</h3>
                <p className="text-secondary/80 leading-relaxed mb-6 flex-1">
                  From the booming Indian Land panhandle to rural acreage around Kershaw and Heath Springs — clearing, grading, and full property management across Lancaster County.
                </p>
                <span className="flex items-center gap-2 text-primary font-bold">
                  Explore Lancaster County <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-serif font-bold text-secondary border-b border-border pb-4">Upstate South Carolina Land & Property Management FAQs</h2>
            <div className="space-y-6">
              {FAQS.map((f) => (
                <div key={f.question} className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-2">
                  <h3 className="text-lg font-serif font-bold text-secondary">{f.question}</h3>
                  <p className="text-secondary/80 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
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
