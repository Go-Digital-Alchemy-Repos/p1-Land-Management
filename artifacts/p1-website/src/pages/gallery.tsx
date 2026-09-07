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

interface Project {
  title: string;
  location: string;
  service: string;
  market: "Upstate SC" | "Charlotte NC";
  image: string;
}

const projects: Project[] = [
  { title: "Forestry Mulching & Clearing", location: "Spartanburg County, SC", service: "Land Clearing", market: "Upstate SC", image: imgClearing },
  { title: "Commercial Site Fine Grading", location: "Greenville, SC", service: "Grading & Site Prep", market: "Upstate SC", image: imgGrading },
  { title: "French Drain & Regrade Drainage Fix", location: "Charlotte, NC", service: "Drainage Solutions", market: "Charlotte NC", image: imgDrainage },
  { title: "Large-Acreage Turf Installation", location: "Anderson, SC", service: "Turf & Seeding", market: "Upstate SC", image: imgTurf },
  { title: "Pond Restoration & Shoreline Repair", location: "Mooresville, NC", service: "Pond & Waterway", market: "Charlotte NC", image: imgPond },
  { title: "Full Property Reconstruction", location: "Gastonia, NC", service: "Property Reconstruction", market: "Charlotte NC", image: imgReconstruction },
  { title: "Commercial Campus Grounds Management", location: "Greenville, SC", service: "Commercial Management", market: "Upstate SC", image: imgCommercial },
  { title: "Agricultural Land Preparation", location: "Concord, NC", service: "Industrial & Agricultural", market: "Charlotte NC", image: imgIndustrial },
  { title: "Tree Removal & Stump Grinding", location: "Spartanburg, SC", service: "Tree Services", market: "Upstate SC", image: imgTree },
];

const serviceFilters = [
  "All",
  "Land Clearing",
  "Grading & Site Prep",
  "Drainage Solutions",
  "Turf & Seeding",
  "Pond & Waterway",
  "Property Reconstruction",
  "Commercial Management",
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
        title="Service Gallery | P1 Land & Property Management"
        description="Explore illustrative examples of land clearing, grading, drainage, turf, pond, and property reconstruction services."
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
        subtitle="Illustrative imagery showing types of land management services. These images are not verified photographs of completed P1 projects."
        image={heroImg}
        imageAlt="Illustration of land management services"
      />

      {/* FILTERS + GRID */}
      <section className="py-20 bg-background">
        <div className="site-shell space-y-10">
          <h2 className="sr-only">Illustrated service categories</h2>
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
                    <p className="text-sm text-secondary/60">Illustrative image</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-secondary/60 py-12">
              No projects match that combination. Try a different filter.
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
