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
        title="Services | P1 Land & Property Management | Upstate SC & Charlotte NC"
        description="Comprehensive land and property management services for large-acreage properties. Commercial maintenance, land clearing, grading, drainage, turf, and more."
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
        subtitle="From early land clearing to ongoing property maintenance, discuss the work your large-acreage property needs in the Carolinas and define a connected scope with P1."
        image={heroImg}
        imageAlt="Heavy equipment on a large property"
      />

      {/* SERVICES GRID */}
      <section className="py-24 bg-background">
        <div className="site-shell">
          <h2 className="sr-only">P1 land and property services</h2>
          <ServicesGrid />
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
