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
        description="Commercial landscaping, grounds maintenance, land clearing, grading, drainage, turf, tree, pond & property reconstruction for 1-acre-plus sites in SC & NC."
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
        subtitle="Commercial landscaping, grounds care, clearing, grading, and property restoration across the Carolinas. Start with the work you need, and we&#x27;ll help you plan what comes next."
        image={heroImg}
        imageAlt="Heavy equipment on a large property"
      />

      {/* SERVICES GRID */}
      <section className="py-24 bg-background">
        <div className="site-shell">
          <div className="mx-auto mb-14 max-w-4xl text-center">
            <h2 className="font-display text-3xl font-semibold text-secondary md:text-4xl">One property plan, from rough ground to ongoing care</h2>
            <p className="mt-5 text-lg leading-relaxed text-secondary/80">Clearing opens access. Grading shapes drainage. Both affect how well roads and turf hold up. We'll help you put the work in the right order, whether you need one job or ongoing care.</p>
          </div>
          <ServicesGrid />
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 border-t border-border pt-12 md:grid-cols-3">
            <div><h2 className="text-xl font-bold text-secondary">Properties We Serve</h2><p className="mt-3 leading-relaxed text-secondary/75">We serve commercial, industrial, agricultural, municipal, and institutional properties 1 acre and larger. We do not provide residential services.</p></div>
            <div><h2 className="text-xl font-bold text-secondary">A Plan Before Work Starts</h2><p className="mt-3 leading-relaxed text-secondary/75">Before we start, you'll know what's included, how we'll access the site, and whether any specialist work is needed.</p></div>
            <div><h2 className="text-xl font-bold text-secondary">Across two regions</h2><p className="mt-3 leading-relaxed text-secondary/75">We serve Upstate South Carolina and greater Charlotte. Contact us to confirm coverage and available dates for your property.</p></div>
          </div>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
