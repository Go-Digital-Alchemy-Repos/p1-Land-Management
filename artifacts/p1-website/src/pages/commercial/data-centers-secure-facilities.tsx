import { FaqAccordion } from "@/components/content/FaqAccordion";
import { ContextualLinks } from "@/components/content/ContextualLinks";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-data-center-secure-facility.png";
import stormwaterImg from "@/assets/features/data-center-stormwater-maintenance.png";
import perimeterImg from "@/assets/features/data-center-perimeter-management.png";
import {
  breadcrumbSchema,
  faqSchema,
  serviceSchema,
} from "@/lib/structured-data";
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  Fence,
  MapPin,
  Phone,
  Route,
  ShieldCheck,
  Shovel,
  Sprout,
  Truck,
  Warehouse,
  Waves,
} from "lucide-react";
import { Link } from "wouter";

const PATH = "/commercial/data-centers-secure-facilities";
const description =
  "Exterior grounds, stormwater ponds, buffers & land management for data centers, secure facilities & distribution campuses in Upstate SC & Charlotte NC.";

const CAMPUS_TYPES = [
  {
    icon: Building2,
    title: "Data centers & mission-critical campuses",
    body: "Perimeter buffers, stormwater ponds, security setbacks, utility-yard surrounds, and extensive maintained or undeveloped acreage.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & regulated facilities",
    body: "Utility, biopharmaceutical, manufacturing, and controlled-access sites where exterior work must follow defined access and documentation protocols.",
  },
  {
    icon: Warehouse,
    title: "Distribution, logistics & fulfillment campuses",
    body: "Truck-court surrounds, retention basins, swales, service roads, and graded acreage kept clear, draining, and stable.",
  },
  {
    icon: Factory,
    title: "Corporate & industrial parks",
    body: "Grounds, drainage, and land care for multi-building properties, with one team to call.",
  },
] as const;

const SERVICES = [
  {
    icon: Fence,
    title: "Perimeter & security-aware vegetation",
    body: "Buffer areas, tree lines, fence lines, and setbacks kept controlled so vegetation does not obstruct cameras, lighting, fencing, or patrol sightlines.",
    href: "/services/commercial-landscaping",
    label: "Commercial grounds management",
  },
  {
    icon: Waves,
    title: "Stormwater ponds & SCM maintenance",
    body: "Detention and retention ponds, basins, swales, embankments, and inlet or outlet areas maintained to support function and inspection readiness.",
    href: "/services/pond-waterway-management",
    label: "Stormwater pond maintenance",
  },
  {
    icon: Shovel,
    title: "Grading, erosion & slope stabilization",
    body: "Washouts corrected, grades re-established, and slopes or pond embankments stabilized to protect pavement, drainage systems, and structures.",
    href: "/services/grading-site-preparation",
    label: "Grading and site preparation",
  },
  {
    icon: Sprout,
    title: "Land clearing, buffers & overgrowth",
    body: "Selective clearing and forestry mulching to manage encroachment, preserve useful buffers, and keep undeveloped acreage controlled.",
    href: "/services/land-clearing",
    label: "Land clearing services",
  },
  {
    icon: Route,
    title: "Service roads & exterior access",
    body: "Gravel access roads, service drives, drainage crossings, and exterior graded areas maintained so operational teams can reach the site.",
    href: "/services/drainage",
    label: "Drainage solutions",
  },
  {
    icon: Truck,
    title: "Storm & corrective response",
    body: "Storm debris removal and repairs to washed-out ground, with timing and availability confirmed in your service plan.",
    href: "/services/property-reconstruction",
    label: "Corrective property work",
  },
  {
    icon: ClipboardCheck,
    title: "Recurring site management",
    body: "Regular exterior maintenance with clear priorities, site checks, and updates for your team.",
    href: "/commercial",
    label: "Commercial site management",
  },
] as const;

const REASONS = [
  [
    "Heavy-equipment land capability",
    "We match the equipment to the acreage, slopes, pond banks, and overgrowth that need attention.",
  ],
  [
    "One team for exterior care",
    "Plan grounds care, drainage, ponds, access roads, and repairs with one point of contact.",
  ],
  [
    "Regional land knowledge",
    "P1 works across Upstate South Carolina and the Charlotte region, with practical experience of local terrain, vegetation, water, and seasonal conditions.",
  ],
  [
    "Your protocols shape the plan",
    "Access, work windows, safety expectations, communication, and documentation are agreed with your facility team before work begins.",
  ],
] as const;

const FAQS = [
  {
    question: "What exactly does P1 manage at a data center or secure facility?",
    answer:
      "We look after the land outside the building: perimeter vegetation, ponds, slopes, undeveloped acreage, trees, and service roads. We plan the work together so drainage repairs and regular grounds care fit around each other.",
  },
  {
    question: "Do you need security clearance or access to secure areas?",
    answer:
      "We follow your facility's access, safety, and documentation rules. Before scheduling, we'll confirm where the crew can go, when work can happen, and whether any clearance is required. We don't claim clearances we haven't obtained.",
  },
  {
    question: "Can you maintain our stormwater detention or retention ponds?",
    answer:
      "Yes. P1 can clear, mow, and maintain detention and retention ponds, basins, swales, embankments, and accessible inlet and outlet areas. Inspection requirements, engineering decisions, regulatory responsibility, and specialist work remain with the property owner and the appropriate professionals.",
  },
  {
    question: "How does grounds work relate to site security?",
    answer:
      "We keep vegetation from blocking cameras, lighting, fencing, and patrol sightlines. Your security team tells us which areas need to stay clear and which buffers need to remain.",
  },
  {
    question: "Do you guarantee an emergency response time?",
    answer:
      "Storm cleanup depends on crew availability and the response arrangements in your service agreement. We'll confirm those details in advance; we don't promise a guaranteed response time for every site.",
  },
  {
    question: "What size and type of properties do you take on?",
    answer:
      "P1 serves commercial and industrial properties of roughly one acre and larger, including data centers, secure and regulated facilities, distribution and logistics parks, manufacturing and utility sites, and corporate campuses. We do not provide residential services.",
  },
  {
    question: "Can you handle the whole exterior instead of just one task?",
    answer:
      "Yes. We can bring regular grounds care, drainage, clearing, grading, and access-road maintenance into one plan. We'll walk the site with you and spell out what's included, with one point of contact for the work.",
  },
];

export default function DataCentersSecureFacilities() {
  const serviceJsonLd = {
    ...serviceSchema({
      name: "Data Center, Secure Facility & Distribution Campus Grounds and Land Management",
      description,
      path: PATH,
    }),
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Commercial and industrial property owners and facility managers",
    },
  };

  return (
    <Layout>
      <SEO
        title="Data Center & Secure Facility Grounds | P1 Land Mgmt"
        description={description}
        jsonLd={[
          serviceJsonLd,
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Commercial", path: "/commercial" },
            { name: "Data Centers & Secure Facilities", path: PATH },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        indexOfWork
        compactMobile
        eyebrow="Data Centers · Secure Facilities · Distribution Campuses"
        title={
          <>
            <span className="tracking-normal">Exterior Grounds & Land Management for <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>Data Centers, Secure Facilities & Distribution Campuses</em></span>
          </>
        }
        subtitle="P1 manages perimeter vegetation, stormwater ponds, buffers, service roads, and undeveloped acreage around large commercial and industrial campuses across Upstate South Carolina and the Charlotte region."
        image={heroImg}
        imageAlt="Managed stormwater pond, service road, and perimeter grounds surrounding a modern data center campus"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full bg-primary px-7 font-bold text-primary-foreground hover:bg-primary/90">
            <Link href="/contact">Request a Site Assessment</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-white/10 px-7 font-bold text-white hover:bg-white/20 hover:text-white">
            <a href="tel:7042218928"><Phone className="mr-2 h-4 w-4" />Call (704) 221-8928</a>
          </Button>
        </div>
      </PageHero>

      <section className="border-b border-border bg-white py-7" aria-label="Service commitments">
        <div className="site-shell grid gap-4 text-sm font-bold text-secondary sm:grid-cols-2 lg:grid-cols-4">
          {["Heavy-Equipment Land Management", "One Team for Exterior Care", "Works Within Your Site Protocols", "Commercial & Industrial Only"].map((item) => (
            <div key={item} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />{item}</div>
          ))}
        </div>
      </section>

      <section className="bg-background py-24">
        <div className="site-shell space-y-20">
          <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Outside the building envelope</p><h2 className="mt-3 text-3xl font-serif font-bold text-secondary md:text-4xl">Care for the Land Around Your Facility</h2></div>
            <div className="space-y-5 text-lg leading-relaxed text-secondary/80"><p>A data center, controlled-access plant, or large distribution hub may have acres of perimeter buffer, stormwater ponds, graded slopes, service roads, tree lines, and undeveloped land beyond the building itself.</p><p>That ground needs to drain, remain accessible, and give your security team clear sightlines. Mowing is part of the job; so are the ponds, slopes, trees, and roads around it.</p><p className="border-l-4 border-primary pl-5 font-bold text-secondary">We bring the equipment and experience to handle that work, with a written plan for what needs doing and who will handle it.</p></div>
          </div>

          <div className="space-y-8">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Who we serve</p><h2 className="mt-3 text-3xl font-serif font-bold text-secondary">Equipped for Large Commercial Campuses</h2><p className="mt-4 text-lg leading-relaxed text-secondary/80">For large, complex sites, the property outside the building is an operation in itself.</p></div>
            <div className="grid gap-5 md:grid-cols-2">
              {CAMPUS_TYPES.map(({ icon: Icon, title, body }) => <article key={title} className="rounded-lg border border-border bg-card p-7 shadow-sm"><Icon className="h-7 w-7 text-primary" /><h3 className="mt-4 text-xl font-serif font-bold text-secondary">{title}</h3><p className="mt-3 leading-relaxed text-secondary/75">{body}</p></article>)}
            </div>
            <p className="border-l-4 border-primary pl-5 text-lg font-bold italic text-secondary">We work with facility teams that need reliable grounds care around deliveries, staff access, and daily operations.</p>
          </div>

          <div className="space-y-8">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">One Property Plan</p><h2 className="mt-3 text-3xl font-serif font-bold text-secondary">Care for the Grounds Around Your Building</h2><p className="mt-4 text-lg leading-relaxed text-secondary/80">Plan grounds care, drainage, access, and repairs together, so one job supports the next.</p></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map(({ icon: Icon, title, body, href, label }) => <article key={title} className="flex flex-col rounded-lg border border-border bg-white p-6"><Icon className="h-6 w-6 text-primary" /><h3 className="mt-4 text-lg font-bold text-secondary">{title}</h3><p className="my-3 flex-1 leading-relaxed text-secondary/75">{body}</p><Link href={href} className="font-bold text-primary underline underline-offset-4">{label}</Link></article>)}
            </div>
          </div>

          <FeatureRow heading="Keeping Ponds and Drainage Working" image={stormwaterImg} imageAlt="Compact excavator maintaining vegetation beside a commercial stormwater pond and outlet structure">
            <p>Detention and retention ponds, swales, embankments, and outlet areas need ongoing attention to stay functional and ready for required inspections. Sediment, overgrowth, eroded banks, and blocked drainage paths can become both operational and compliance concerns.</p>
            <p>P1 maintains accessible stormwater features, corrects exterior erosion, and documents the land and grounds work performed so it can support your site's own records.</p>
            <p className="text-sm italic">P1 is a land and grounds contractor, not the facility's compliance authority. Inspection, engineering, and regulatory responsibilities are confirmed with the owner and appropriate professionals.</p>
          </FeatureRow>

          <FeatureRow heading="Grounds Care Around Your Site Rules" image={perimeterImg} imageAlt="Compact land-management equipment controlling vegetation along a fenced commercial service road" reverse>
            <p>We'll work with your site team on access, work hours, safety rules, and the records you need before the crew arrives.</p>
            <p>We handle exterior land and grounds. Security clearances, uptime requirements, and emergency response need to be addressed separately in writing before we make a commitment.</p>
            <Button asChild className="mt-2 rounded-full bg-primary font-bold"><Link href="/contact">Discuss Your Property</Link></Button>
          </FeatureRow>

          <div className="space-y-8">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Built for the land around the facility</p><h2 className="mt-3 text-3xl font-serif font-bold text-secondary">Why complex campuses choose P1</h2></div>
            <div className="grid gap-5 md:grid-cols-2">
              {REASONS.map(([title, body]) => <article key={title} className="rounded-lg border border-border bg-card p-7"><ShieldCheck className="h-6 w-6 text-primary" /><h3 className="mt-4 text-xl font-bold text-secondary">{title}</h3><p className="mt-3 leading-relaxed text-secondary/75">{body}</p></article>)}
            </div>
          </div>

          <div className="rounded-lg bg-secondary p-8 text-white lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div><MapPin className="h-8 w-8 text-tan" /><h2 className="mt-4 text-3xl font-serif font-bold text-white">Serving complex campuses across Upstate SC and greater Charlotte</h2></div>
              <div className="space-y-5 leading-relaxed text-white/75"><p>P1 serves large commercial and industrial properties throughout Greenville, Spartanburg, Anderson, Charlotte, Concord, Mooresville, Lake Norman, Gastonia, and the Union, Lancaster, and York County corridors.</p><p>Our coverage includes the I-85 and I-77 industrial and logistics corridors where regional data centers, secure facilities, and distribution campuses are concentrated.</p><div className="flex flex-wrap gap-x-5 gap-y-2 font-bold"><Link href="/service-areas/charlotte-north-carolina" className="text-white underline">Charlotte region</Link><Link href="/service-areas/union-county-nc" className="text-white underline">Union County</Link><Link href="/service-areas/york-county-sc" className="text-white underline">York County</Link><Link href="/service-areas/lancaster-county-sc" className="text-white underline">Lancaster County</Link></div><p>Seasonal planning matters too. Review <Link href="/services/commercial-snow-ice-management" className="font-bold text-tan underline">commercial snow and ice management</Link> for large campuses.</p></div>
            </div>
          </div>

          <div className="space-y-6"><h2 className="border-b border-border pb-4 text-3xl font-serif font-bold text-secondary">Data center & secure facility grounds — frequently asked questions</h2><FaqAccordion items={FAQS} /></div>
        </div>
      </section>

      <ContextualLinks />

      <section className="bg-navy-deep py-20 text-white">
        <div className="site-shell flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><h2 className="text-3xl font-serif font-bold text-white">One Team to Call About Your Grounds</h2><p className="mt-4 text-lg leading-relaxed text-white/75">Tell us about your perimeter, ponds, roads, and any trouble spots. We'll help you plan the upkeep and repairs your facility needs.</p></div><div className="flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="rounded-full bg-primary font-bold"><Link href="/contact">Request a Site Assessment</Link></Button><Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-transparent font-bold text-white hover:bg-white/10 hover:text-white"><a href="tel:7042218928"><Phone className="mr-2 h-4 w-4" />Call (704) 221-8928</a></Button></div></div>
      </section>
    </Layout>
  );
}
