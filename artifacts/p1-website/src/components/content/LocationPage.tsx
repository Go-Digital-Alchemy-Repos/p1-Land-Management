import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { FaqAccordion } from "@/components/content/FaqAccordion";
import { LocationSidebar } from "@/components/content/LocationSidebar";
import { SEO } from "@/components/seo";
import { breadcrumbSchema, faqSchema, localBusinessSchema, serviceAreaSchema } from "@/lib/structured-data";

type LocationContent = {
  city: string; state: string; path: string; title: string; description: string;
  heading: string; market: string; intro: string; parent: string | null;
  sections: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
  links: { label: string; href: string }[];
};

const services = [
  "Commercial landscaping and exterior grounds maintenance contracts",
  "Land clearing and forestry mulching — lot clearing, right-of-way, and rural acreage",
  "Fine grading and site preparation for commercial, industrial, municipal, and institutional development",
  "Drainage planning and scoped French-drain, retention, and erosion work",
  "Turf installation — sod and large-acreage seeding for Piedmont soils",
  "Tree services — trimming, removal, and selective clearing",
  "Pond and waterway management — construction, restoration, and water quality",
  "Agricultural property maintenance — pastures, fields, fence lines, and access roads",
  "Full property reconstruction",
];

export function LocationPage({ page, image }: { page: LocationContent; image: string }) {
  const parents: Record<string, string> = {
    "/service-areas/york-county-sc": "York County, SC",
    "/service-areas/lancaster-county-sc": "Lancaster County, SC",
    "/service-areas/union-county-nc": "Union County, NC",
  };
  const crumbs = [
    { name: "Home", path: "/" }, { name: "Service Areas", path: "/service-areas" },
    ...(page.parent ? [{ name: parents[page.parent], path: page.parent }] : []),
    { name: `${page.city}, ${page.state}`, path: page.path },
  ];
  return <Layout>
    <SEO title={page.title} description={page.description} image={image} jsonLd={[
      localBusinessSchema(),
      serviceAreaSchema({ areaName: `${page.city}, ${page.state}`, areaType: page.city === "Indian Land" || page.city === "Boiling Springs" ? "AdministrativeArea" : "City", description: page.description, path: page.path }),
      breadcrumbSchema(crumbs), faqSchema(page.faqs),
    ]} />
    <PageHero eyebrow={`Service Area · ${page.state}`} title={page.heading} subtitle={page.intro}
      image={image} imageAlt={`Illustrative ${page.city} service-area landscape showing ${page.city === "Inman" || page.city === "Waxhaw" ? "managed agricultural acreage" : "large-property grounds and site care"}`} />
    <div className="site-shell py-8">
      <nav aria-label="Breadcrumb"><ol className="flex flex-wrap gap-2 text-sm text-muted-foreground">{crumbs.map((crumb, index) => <li key={crumb.path}>
        {index > 0 && <span aria-hidden="true" className="mr-2">›</span>}
        {index === crumbs.length - 1 ? <span aria-current="page">{crumb.name}</span> : <Link className="underline hover:text-primary" href={crumb.path}>{crumb.name}</Link>}
      </li>)}</ol></nav>
    </div>
    <div className="site-shell grid items-start gap-10 pb-16 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-14">
      <div className="min-w-0 space-y-14">
        <p className="max-w-4xl text-lg leading-relaxed">P1 Land &amp; Property Management is a commercial grounds management and land contractor serving commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger in {page.city}, {page.state}.</p>
        {page.sections.map((section, index) => <section key={section.heading} className="max-w-4xl">
          <h2 className="font-display text-3xl text-secondary">{section.heading}</h2>
          <p className="mt-5 text-lg leading-relaxed text-secondary/80">{section.body}</p>
          {index === 0 && <section className="mt-12 rounded-lg bg-muted p-6 sm:p-8">
            <h2 className="font-display text-2xl">Land &amp; Property Management Services in {page.city}</h2>
            <ul className="mt-6 list-disc space-y-3 pl-5">{services.map(service => <li key={service}>{service}</li>)}</ul>
            <p className="mt-6 leading-relaxed">Our exterior facility maintenance covers the grounds, vegetation, water movement, and access areas around your operation.</p>
          </section>}
        </section>)}
        <section className="max-w-4xl">
          <h2 className="mb-6 font-display text-3xl">{page.city}, {page.state} Land &amp; Property Management FAQs</h2>
          <FaqAccordion items={page.faqs} />
        </section>
        <section>
          <h2 className="font-display text-2xl">Services and nearby communities</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">{page.links.map(link => <li key={link.href}><Link className="font-semibold text-primary underline" href={link.href}>{link.label}</Link></li>)}</ul>
          <p className="mt-10 text-lg">Call <a className="text-primary underline" href="tel:+17042218928">(704) 221-8928</a> or <Link className="text-primary underline" href="/contact">request a free site assessment online</Link> to discuss your property.</p>
        </section>
      </div>
      <LocationSidebar currentPath={page.path} />
    </div>
    <FinalCTA />
  </Layout>;
}
