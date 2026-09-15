import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { cn } from "@/lib/utils";
import heroImg from "@/assets/services-hero.png";

import imgClearing from "@/assets/service-clearing.png";
import imgGrading from "@/assets/fine-grading.png";
import imgDrainage from "@/assets/service-drainage.png";
import imgTurf from "@/assets/service-turf.png";
import imgPond from "@/assets/pond-management.png";
import imgReconstruction from "@/assets/service-reconstruction.png";
import imgCommercial from "@/assets/commercial-property.png";
import imgIndustrial from "@/assets/service-industrial.png";
import imgTree from "@/assets/service-tree.png";

interface ServiceIllustration {
  title: string;
  service: string;
  image: string;
}

const projects: ServiceIllustration[] = [
  { title: "Forestry Mulching & Clearing", service: "Land Clearing", image: imgClearing },
  { title: "Commercial Site Fine Grading", service: "Grading & Site Prep", image: imgGrading },
  { title: "French Drain & Regrade Drainage Work", service: "Drainage Solutions", image: imgDrainage },
  { title: "Large-Acreage Turf Installation", service: "Turf & Seeding", image: imgTurf },
  { title: "Pond Restoration & Shoreline Repair", service: "Pond & Waterway", image: imgPond },
  { title: "Full Property Reconstruction", service: "Property Reconstruction", image: imgReconstruction },
  { title: "Commercial Campus Grounds Management", service: "Commercial Landscaping", image: imgCommercial },
  { title: "Agricultural Land Preparation", service: "Industrial & Agricultural", image: imgIndustrial },
  { title: "Tree Removal & Stump Grinding", service: "Tree Services", image: imgTree },
];

const serviceFilters = [
  "All",
  "Land Clearing",
  "Grading & Site Prep",
  "Drainage Solutions",
  "Turf & Seeding",
  "Pond & Waterway",
  "Property Reconstruction",
  "Commercial Landscaping",
  "Industrial & Agricultural",
  "Tree Services",
];


export default function Gallery() {
  const [activeService, setActiveService] = useState("All");

  const filtered = projects.filter(
    (p) =>
      (activeService === "All" || p.service === activeService)
  );

  return (
    <Layout>
      <SEO
        title="Land Management Service Gallery | P1"
        description="See the land clearing, grading, drainage, turf, pond, tree, grounds, and reconstruction capabilities P1 offers for qualifying Carolina properties."
      />

      {/* PAGE HERO */}
      <PageHero
        eyebrow="Service Illustrations"
        title={
          <>
            Service{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Gallery
            </em>
          </>
        }
        subtitle="Explore the land management services P1 provides for commercial, industrial, agricultural, municipal, and institutional properties across the Carolinas."
        image={heroImg}
        imageAlt="Illustration of land management services"
      />

      {/* FILTERS + GRID */}
      <section className="py-20 bg-background">
        <div className="site-shell space-y-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-semibold text-secondary md:text-4xl">Find the capability your property needs</h2>
            <p className="mt-4 text-lg leading-relaxed text-secondary/75">Use the filters to compare P1's service categories, then open the relevant service page for scope details, common applications, and next steps. Owner-approved project photography and case studies will be added separately when available.</p>
          </div>
          {/* Service filters */}
          <div className="flex flex-wrap justify-center gap-3">
            {serviceFilters.map((f) => (
              <button
                key={f}
                aria-pressed={activeService === f}
                onClick={() => setActiveService(f)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold border transition-colors",
                  activeService === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-secondary/70 border-border hover:border-primary hover:text-primary"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <p role="status" className="text-center text-sm">{filtered.length} service illustrations shown</p>
          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      loading="lazy" decoding="async"
                      src={p.image}
                      alt={`Illustration: ${p.title}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5 space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-primary">
                      {p.service}
                    </span>
                    <h3 className="font-serif font-bold text-secondary leading-snug">{p.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-secondary/60 py-12">
              No service illustrations match that filter. Try another category.
            </p>
          )}

          <p className="text-center text-sm text-secondary/50 max-w-2xl mx-auto pt-4">
            Gallery imagery illustrates service categories. It does not document specific completed jobs or customer results.
          </p>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
