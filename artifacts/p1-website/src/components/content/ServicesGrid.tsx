import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  Droplets,
  Mountain,
  Sprout,
  Tractor,
  Trees,
  Waves,
  Wrench,
} from "lucide-react";
import serviceCommercial from "@/assets/service-commercial.png";
import serviceIndustrial from "@/assets/service-industrial.png";
import serviceClearing from "@/assets/service-clearing.png";
import serviceGrading from "@/assets/service-grading.png";
import serviceDrainage from "@/assets/service-drainage.png";
import serviceTurf from "@/assets/service-turf.png";
import serviceTree from "@/assets/service-tree.png";
import servicePond from "@/assets/service-pond.png";
import serviceReconstruction from "@/assets/service-reconstruction.png";
import { cmsValue, useCms } from "@/lib/cms";
import { responsiveImageProps } from "@/lib/responsive-images";

type Service = {
  title: string;
  description: string;
  image: string;
  icon: LucideIcon;
  slug: string;
};

const services: readonly Service[] = [
  { title: "Commercial Landscaping", description: "Scheduled exterior grounds maintenance that keeps large sites pristine year-round.", image: serviceCommercial, icon: Building2, slug: "commercial-landscaping" },
  { title: "Industrial & Agricultural Land", description: "Heavy-duty care for farms, industrial sites and working rural acreage.", image: serviceIndustrial, icon: Tractor, slug: "industrial-agricultural" },
  { title: "Land Clearing & Mulching", description: "Selective clearing and forestry mulching that opens up acreage responsibly.", image: serviceClearing, icon: Trees, slug: "land-clearing" },
  { title: "Fine Grading & Site Prep", description: "Precision cut-and-fill that gives every project a true, build-ready foundation.", image: serviceGrading, icon: Mountain, slug: "grading-site-preparation" },
  { title: "Drainage Solutions", description: "French drains, swales and retention work planned around the property's water-management needs.", image: serviceDrainage, icon: Droplets, slug: "drainage" },
  { title: "Turf Installation & Seeding", description: "Sod and seed installation built for large-scale acreage and lasting cover.", image: serviceTurf, icon: Sprout, slug: "turf-installation-seeding" },
  { title: "Tree & Brush Management", description: "Removal, trimming and stump grinding handled with the right heavy iron.", image: serviceTree, icon: Trees, slug: "tree-services" },
  { title: "Pond & Waterway Management", description: "Design, excavation and long-term care of ponds and working waterways.", image: servicePond, icon: Waves, slug: "pond-waterway-management" },
  { title: "Property Reconstruction", description: "Full-scale rebuilds from drainage overhaul to complete site regrading.", image: serviceReconstruction, icon: Wrench, slug: "property-reconstruction" },
];

/**
 * CMS-bound service-card section shared by the home and services pages.
 * Its strings, links, images, and image descriptions are collected into each
 * page's P1 CMS editor while the responsive layout remains site controlled.
 */
export function ServicesGrid() {
  const context = useCms();

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-content-section="Services Grid">
      {services.map((service) => {
        const title = cmsValue(context, service.title);
        const description = cmsValue(context, service.description, "textarea");
        const href = cmsValue(context, `/services/${service.slug}`, "ctaTarget");
        const image = cmsValue(context, service.image, "image");
        const alt = cmsValue(context, service.title, "imageAlt");
        const imageProps = responsiveImageProps(image, "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw");
        const Icon = service.icon;

        return (
          <Link
            key={service.slug}
            href={href}
            className="group relative block overflow-hidden rounded-xl border bg-white transition-all duration-300 hover:-translate-y-1.5 motion-reduce:transform-none"
            style={{ borderColor: "hsl(215 30% 15% / 0.08)", boxShadow: "0 1px 0 hsl(215 30% 15% / 0.04)" }}
            onMouseEnter={(event) => { event.currentTarget.style.boxShadow = "0 34px 60px -30px hsl(215 45% 15%), 0 10px 22px -16px hsl(215 40% 22% / 0.4)"; }}
            onMouseLeave={(event) => { event.currentTarget.style.boxShadow = "0 1px 0 hsl(215 30% 15% / 0.04)"; }}
          >
            <div className="relative h-52 overflow-hidden">
              <img
                {...imageProps}
                src={image}
                alt={alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, hsl(215 50% 11% / 0.55), transparent 55%)" }} />
              <Icon className="absolute bottom-4 right-4 h-6 w-6 text-white/90" aria-hidden="true" />
            </div>
            <div className="p-6">
              <h3 className="font-serif text-xl font-bold tracking-tight text-secondary">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "hsl(215 18% 38%)" }}>{description}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 font-sans text-[12px] font-bold uppercase text-clay-ink opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" style={{ letterSpacing: "0.12em" }}>
                Learn more <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            </div>
            <span className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-clay transition-transform duration-300 group-hover:scale-x-100 motion-reduce:transition-none" />
          </Link>
        );
      })}
    </div>
  );
}
