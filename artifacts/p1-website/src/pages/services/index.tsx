import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { ServicesGrid } from "@/components/content/ServicesGrid";
import { SEO } from "@/components/seo";
import { breadcrumbSchema } from "@/lib/structured-data";
import heroImg from "@/assets/services-hero.png";

export default function ServicesIndex() {
  return (
    <Layout>
      <SEO 
        title="Land Management Services in SC & NC | P1"
        description="Compare P1 land clearing, grading, drainage, turf, tree, pond, reconstruction, and recurring property services for 1-acre-plus sites in SC and NC."
        jsonLd={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />

      {/* PAGE HERO */}
      <PageHero
        eyebrow="What We Do"
        title={
          <>
            Everything{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Your Property Needs
            </em>
          </>
        }
        subtitle="From early land clearing to ongoing property maintenance, P1 helps large-acreage operators define and coordinate the work their sites need across the Carolinas."
        image={heroImg}
        imageAlt="Heavy equipment on a large property"
      />

      {/* SERVICES GRID */}
      <section className="py-24 bg-background">
        <div className="site-shell">
          <div className="mx-auto mb-14 max-w-4xl text-center">
            <h2 className="font-display text-3xl font-semibold text-secondary md:text-4xl">One property plan, from rough ground to ongoing care</h2>
            <p className="mt-5 text-lg leading-relaxed text-secondary/80">Large sites rarely have one isolated need. Clearing changes access, grading affects drainage, and drainage determines whether turf and roads hold up. Start with the service that brought you here, then use the connected capabilities below to build a practical scope around the property.</p>
          </div>
          <ServicesGrid />
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 border-t border-border pt-12 md:grid-cols-3">
            <div><h2 className="text-xl font-bold text-secondary">For qualifying properties</h2><p className="mt-3 leading-relaxed text-secondary/75">P1 serves commercial, industrial, agricultural, municipal, and institutional properties of 1 acre or more. Residential work is outside our service model.</p></div>
            <div><h2 className="text-xl font-bold text-secondary">Scope before mobilization</h2><p className="mt-3 leading-relaxed text-secondary/75">Site conditions, access, proposed work, exclusions, documentation, and any specialist responsibilities are defined before approved work begins.</p></div>
            <div><h2 className="text-xl font-bold text-secondary">Across two regions</h2><p className="mt-3 leading-relaxed text-secondary/75">Service coverage centers on Upstate South Carolina and the greater Charlotte, North Carolina region. Confirm your property and current availability with the P1 team.</p></div>
          </div>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
