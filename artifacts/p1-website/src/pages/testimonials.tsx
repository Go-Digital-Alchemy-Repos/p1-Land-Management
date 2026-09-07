import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { Link } from "wouter";
import heroImg from "@/assets/service-reconstruction.png";

export default function Testimonials() {
  return (
    <Layout>
      <SEO
        title="Working With P1 | P1 Land & Property Management"
        description="Discuss your land and property management needs with P1. Explore services and request an estimate."
      />

      {/* PAGE HERO */}
      <PageHero
        eyebrow="Working With P1"
        title={
          <>
            Discuss Your{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Property
            </em>
          </>
        }
        subtitle="Explore services for commercial, agricultural, and large residential properties across the Carolinas."
        image={heroImg}
        imageAlt="Illustration of property reconstruction services"
      />

      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-3xl space-y-6 text-lg text-secondary">
          <h2 className="text-3xl">Choose the right approach for your land</h2>
          <p>Clearing, grading, drainage, turf, tree care, and pond management each address different property needs. Tell us about your goals so we can discuss the work involved.</p>
          <p><Link className="text-primary underline" href="/services">Explore our services</Link> or <Link className="text-primary underline" href="/contact">request an estimate</Link>.</p>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
