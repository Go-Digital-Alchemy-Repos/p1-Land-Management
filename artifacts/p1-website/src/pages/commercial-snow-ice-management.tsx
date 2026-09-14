import { FaqAccordion } from "@/components/content/FaqAccordion";
import { FeatureRow } from "@/components/layout/FeatureRow";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/structured-data";
import heroImg from "@/assets/hero-commercial-snow-ice.png";
import pretreatmentImg from "@/assets/features/commercial-snow-pretreatment.png";
import loadingDockImg from "@/assets/features/commercial-snow-loading-dock.png";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Factory,
  Hospital,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  Truck,
  Warehouse,
} from "lucide-react";
import { Link } from "wouter";

const PATH = "/commercial-snow-ice-management";

const PROPERTY_TYPES = [
  { icon: Truck, title: "Distribution & fulfillment centers", description: "Dock aprons, truck courts, staging lanes, and employee lots cleared on a schedule that protects throughput." },
  { icon: Building2, title: "Data centers & mission-critical facilities", description: "Access for staff, security, and emergency vehicles, with ice management around entrances and generator yards." },
  { icon: ShoppingCart, title: "Shopping centers & retail complexes", description: "Storefront walkways, fire lanes, and high-traffic lots kept safe and open during business hours." },
  { icon: Building2, title: "Corporate & office campuses", description: "Multi-building sites with parking areas, connector walkways, and main entrances treated for tenants and employees." },
  { icon: Factory, title: "Industrial & manufacturing plants", description: "Large yards, rail sidings, loading zones, and shift-change parking managed around your operations." },
  { icon: Warehouse, title: "Warehouse & logistics parks", description: "Multi-tenant industrial parks maintained under one coordinated plan." },
  { icon: Hospital, title: "Medical, institutional & large-format commercial", description: "Properties where continuous, safe access is non-negotiable." },
] as const;

const SERVICES = [
  ["Snow Plowing & Clearing", "Large pickup-mounted plowing for parking lots, truck courts, access roads, and fire lanes, with routes planned around your site."],
  ["Anti-Icing & Pre-Treatment", "Proactive brine and de-icing application before a storm arrives, helping prevent ice from fully bonding to pavement."],
  ["De-Icing & Salting", "Post-storm granular and liquid de-icing on lots, drive lanes, ramps, and high-traffic zones as temperatures fluctuate."],
  ["Sidewalk, Walkway & Entrance Clearing", "Hand crews and walk-behind equipment for entrances, crosswalks, ADA ramps, and pedestrian paths, coordinated with lot service."],
  ["Snow Hauling & Relocation", "Snow relocated from critical areas to preserve parking, sightlines, loading zones, and fire lanes when on-site stacking is not enough."],
  ["Loading Dock & Truck Court Management", "Specialized clearing around dock doors, aprons, and staging lanes so freight can keep moving."],
  ["24/7 Storm Monitoring & Emergency Response", "Developing systems are monitored so contracted sites can be staged and serviced according to the response windows in their agreement."],
] as const;

const REASONS = [
  ["Commercial and industrial focus", "Your site is not a big driveway. Crews, equipment, and plans are organized around large-format commercial and industrial properties."],
  ["Large-site operating capacity", "P1's land-management background supports coordinated snow clearing and relocation across acreage, truck courts, and broad paved areas."],
  ["Year-round property perspective", "Existing knowledge of a site's drainage, grades, curbs, landscape edges, and stacking constraints can support faster, safer execution."],
  ["Planning before the season", "A pre-season assessment maps plow routes, stacking zones, priority areas, and treatment triggers before weather arrives."],
  ["Liability-aware service", "Service timing and documentation are organized around safer walkways and lots and a cleaner operational record."],
  ["One plan and one point of contact", "Snow, ice, walkways, hauling, and emergency response can be coordinated under one seasonal agreement."],
] as const;

const STEPS = [
  ["Site assessment", "We walk the property, map priority zones, identify stacking and hauling needs, and flag high-liability areas."],
  ["Custom seasonal plan", "You receive a written plan with response triggers, service standards, and priority-response commitments."],
  ["Pre-season staging", "Equipment, materials, and crews are organized before the first freeze, with contract priority established in advance."],
  ["24/7 storm monitoring", "Forecasts are tracked so pre-treatment and mobilization can follow the agreed plan."],
  ["Documented service & follow-up", "Visits are logged and timestamped to support operations and risk management."],
] as const;

const FAQS = [
  { question: "Do you provide residential snow removal?", answer: "No. P1 works exclusively with commercial and industrial properties — distribution centers, data centers, shopping centers, office and industrial campuses, and similar large-format sites. We do not service residential driveways or small lots." },
  { question: "Why does a region that barely gets snow need a commercial snow contractor?", answer: "Because the danger here is not only accumulation; it is unpredictability. An overnight ice event can affect an entire property with little warning. A seasonal contract puts the site plan, service priorities, and response expectations in place before winter weather arrives." },
  { question: "What size properties do you service?", answer: "Commercial and industrial sites of roughly one acre and larger, up to multi-building campuses and industrial parks. Our operating model is built for large parking lots, truck courts, and yards." },
  { question: "What's the difference between snow plowing and snow removal (hauling)?", answer: "Plowing pushes snow aside to clear driving and parking surfaces. Removal, or hauling, physically relocates snow when there is too much to stack, freeing parking, sightlines, fire lanes, and loading zones. P1 can scope both services for a site." },
  { question: "What is pre-treatment (anti-icing), and do I need it?", answer: "Pre-treatment applies brine or de-icer before a storm so ice is less able to bond to pavement. In the Carolinas' freeze-thaw climate, it can be a critical part of a site-specific seasonal plan." },
  { question: "How fast do you respond during a storm?", answer: "Response windows are defined in the service agreement, and priority-contract sites are scheduled according to those commitments. Monitoring and pre-season planning allow equipment and crews to be organized before conditions deteriorate." },
  { question: "Are you insured?", answer: "Ask P1 for current commercial insurance documentation during qualification. Applicable coverage, site requirements, service records, and procurement documents should be reviewed before work is scheduled." },
  { question: "When should I set up a contract?", answer: "Before winter. Priority-response capacity and pre-season site assessments are limited, so late summer or early fall gives the best opportunity to map the property and confirm a plan before the first freeze." },
];

const description = "Commercial and industrial snow and ice management for distribution centers and data centers across Charlotte NC and Upstate SC. Request a site assessment.";

export default function CommercialSnowIceManagement() {
  return (
    <Layout>
      <SEO
        title="Commercial Snow & Ice Management in the Carolinas | P1"
        description={description}
        jsonLd={[
          serviceSchema({ name: "Commercial Snow and Ice Management", description, path: PATH }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
            { name: "Commercial Snow & Ice Management", path: PATH },
          ]),
          faqSchema(FAQS),
        ]}
      />

      <PageHero
        indexOfWork
        eyebrow="Commercial Snow & Ice Management"
        title={<>Commercial & Industrial Snow and Ice Management for the <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>Carolinas</em></>}
        subtitle="Keep your distribution center, data center, retail center, or industrial campus open, safe, and ready all winter with a dedicated commercial snow and ice plan for large-acreage sites across the Charlotte region and Upstate South Carolina."
        image={heroImg}
        imageAlt="Large pickup truck with a front-mounted snowplow clearing a commercial distribution center"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full bg-primary px-7 font-bold text-primary-foreground hover:bg-primary/90"><Link href="/contact">Request a Site Assessment</Link></Button>
          <Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-white/10 px-7 font-bold text-white hover:bg-white/20 hover:text-white"><a href="tel:7042218928"><Phone className="mr-2 h-4 w-4" />Call for Priority Availability</a></Button>
        </div>
      </PageHero>

      <section className="border-b border-border bg-white py-7" aria-label="Service commitments">
        <div className="site-shell grid gap-4 text-sm font-bold text-secondary sm:grid-cols-2 lg:grid-cols-5">
          {["Commercial & Industrial Only", "Large-Site Plow Fleet", "24/7 Storm Monitoring", "Insurance Documentation Available", "Seasonal Priority Contracts"].map((item) => <div key={item} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />{item}</div>)}
        </div>
      </section>

      <section className="bg-background py-24">
        <div className="site-shell space-y-20">
          <FeatureRow heading="In the Carolinas, the risk isn't the snowfall — it's the ice event no one saw coming" image={pretreatmentImg} imageAlt="Large pickup truck with a front plow and anti-icing equipment treating an industrial parking lot">
            <p>Because measurable snow is infrequent, many facilities are not prepared when an overnight ice event glazes a large parking lot, loading docks, and walkways before the first employee arrives.</p>
            <p>For distribution centers, that can interrupt truck staging and dock access. For mission-critical facilities, it can restrict staff and emergency access. For retail and office properties, it creates safety and liability exposure for customers, tenants, and employees.</p>
            <p>P1 is a commercial and industrial snow and ice management contractor. We assess the property before the season, monitor developing weather, and execute a site-specific plan under a defined seasonal agreement.</p>
          </FeatureRow>

          <div className="space-y-8">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Who we serve</p><h2 className="mt-3 text-3xl font-serif font-bold text-secondary">Built for large commercial and industrial properties</h2><p className="mt-4 text-lg leading-relaxed text-secondary/80">We work with properties of scale where downtime and safety carry real cost. We do not service residential driveways or small lots.</p></div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {PROPERTY_TYPES.map(({ icon: Icon, title, description: body }) => <article key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm"><Icon className="h-7 w-7 text-primary" /><h3 className="mt-4 text-xl font-serif font-bold text-secondary">{title}</h3><p className="mt-2 leading-relaxed text-secondary/75">{body}</p></article>)}
            </div>
            <p className="border-l-4 border-primary pl-5 text-lg font-bold italic text-secondary">If your site is one acre or larger and downtime isn't an option, this service is built for you.</p>
          </div>

          <div className="space-y-8">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">One coordinated plan</p><h2 className="mt-3 text-3xl font-serif font-bold text-secondary">Complete commercial snow and ice services — from a single contractor</h2><p className="mt-4 text-lg leading-relaxed text-secondary/80">The full scope is coordinated under one contract, one point of contact, and one plan built for your site.</p></div>
            <div className="grid gap-4 md:grid-cols-2">
              {SERVICES.map(([title, body]) => <article key={title} className="flex gap-4 rounded-xl bg-muted p-6"><Snowflake className="mt-1 h-6 w-6 shrink-0 text-primary" /><div><h3 className="text-lg font-bold text-secondary">{title}</h3><p className="mt-2 leading-relaxed text-secondary/75">{body}</p></div></article>)}
            </div>
          </div>

          <FeatureRow heading="Why large properties across the Carolinas choose P1" image={loadingDockImg} imageAlt="Large pickup truck with a front-mounted snowplow clearing a distribution center loading dock" reverse>
            <p>P1 approaches winter work as a planned commercial operation: the site is reviewed, priority areas are mapped, and response expectations are defined before weather arrives.</p>
            <p>Large lots, truck courts, entrances, walkways, and relocation needs are coordinated through one site plan and one point of contact.</p>
          </FeatureRow>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {REASONS.map(([title, body]) => <article key={title} className="rounded-xl border border-border bg-white p-6"><ShieldCheck className="h-6 w-6 text-primary" /><h3 className="mt-4 text-lg font-bold text-secondary">{title}</h3><p className="mt-2 leading-relaxed text-secondary/75">{body}</p></article>)}
          </div>

          <div className="rounded-2xl bg-secondary p-8 text-white lg:p-12">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.24em] text-tan">Seasonal readiness</p><h2 className="mt-3 text-3xl font-serif font-bold text-white">How our seasonal service works</h2></div>
            <ol className="mt-9 grid gap-6 lg:grid-cols-5">
              {STEPS.map(([title, body], index) => <li key={title} className="border-t border-white/15 pt-5"><span className="block font-display text-5xl font-semibold leading-none tabular-nums text-tan">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-5 text-lg font-bold text-white">{title}</h3><p className="mt-3 text-sm leading-relaxed text-white/70">{body}</p></li>)}
            </ol>
            <div className="mt-9 flex flex-col items-start gap-4 border-t border-white/15 pt-7 sm:flex-row sm:items-center sm:justify-between"><p className="font-bold">Priority contracts are limited and fill before winter.</p><Button asChild className="rounded-full bg-primary font-bold"><Link href="/contact">Request Your Site Assessment</Link></Button></div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div><MapPin className="h-8 w-8 text-primary" /><h2 className="mt-4 text-3xl font-serif font-bold text-secondary">Serving the Charlotte region and Upstate South Carolina</h2><p className="mt-4 text-lg leading-relaxed text-secondary/80">P1 provides commercial and industrial snow and ice management across the greater Charlotte metro and the Upstate SC corridor.</p></div>
            <div className="space-y-5 rounded-xl border border-border bg-card p-7 shadow-sm"><p><strong className="text-secondary">North Carolina:</strong> Charlotte, Huntersville, Concord, Gastonia, Monroe, Matthews, Mint Hill, Ballantyne, Pineville, Indian Trail, and surrounding industrial corridors.</p><p><strong className="text-secondary">South Carolina:</strong> Rock Hill, Fort Mill, Indian Land, Lancaster, York, and the I-77 / I-85 industrial and distribution corridors through the Upstate.</p><p className="text-sm italic text-secondary/70">Not sure whether your property is in range? <Link href="/contact" className="font-bold text-primary underline">Ask about current coverage</Link>.</p><div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold"><Link href="/service-areas/charlotte-north-carolina" className="text-primary underline">Charlotte region</Link><Link href="/service-areas/union-county-nc" className="text-primary underline">Union County</Link><Link href="/service-areas/york-county-sc" className="text-primary underline">York County</Link><Link href="/service-areas/lancaster-county-sc" className="text-primary underline">Lancaster County</Link></div></div>
          </div>

          <div className="space-y-6"><h2 className="border-b border-border pb-4 text-3xl font-serif font-bold text-secondary">Commercial snow and ice management — frequently asked questions</h2><FaqAccordion items={FAQS} /></div>
        </div>
      </section>

      <section className="bg-navy-deep py-20 text-white">
        <div className="site-shell flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><Clock3 className="h-8 w-8 text-tan" /><h2 className="mt-4 text-3xl font-serif font-bold">Protect your property before the first freeze</h2><p className="mt-4 text-lg leading-relaxed text-white/75">Lock in a commercial snow and ice management plan built around your site, operations, and risk priorities.</p></div><div className="flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" className="rounded-full bg-primary font-bold"><Link href="/contact">Request Your Free Site Assessment</Link></Button><Button asChild size="lg" variant="outline" className="rounded-full border-white/30 bg-transparent font-bold text-white hover:bg-white/10 hover:text-white"><a href="tel:7042218928"><Phone className="mr-2 h-4 w-4" />Call P1</a></Button></div></div>
      </section>
    </Layout>
  );
}
