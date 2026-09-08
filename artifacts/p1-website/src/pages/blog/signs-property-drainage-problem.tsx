import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import heroImg from "@/assets/blog-drainage.png";

export default function BlogPost() {
  return (
    <Layout>
      <SEO 
        title="5 Signs Your Property Has a Drainage Problem (And What to Do About It) | P1 Land & Property Management"
        description="Standing water, soggy soil, and erosion are signs of a drainage problem that will get worse. Learn to spot the signs early and understand your options. Serving Upstate SC and Charlotte NC."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "5 Signs Your Property Has a Drainage Problem (And What to Do About It)",
          description: "Standing water, soggy soil, and erosion are signs of a drainage problem that will get worse. Learn to spot the signs early.",
          image: "https://www.p1landmanagement.com/opengraph.jpg",
          author: { "@type": "Organization", name: "P1 Land & Property Management" },
          publisher: {
            "@type": "Organization",
            name: "P1 Land & Property Management",
            logo: { "@type": "ImageObject", url: "https://www.p1landmanagement.com/opengraph.jpg" },
          },
        }}
      />

      <article className="pb-24">
        {/* POST HERO */}
        <PageHero
          eyebrow="Drainage Solutions"
          title={
            <>
              5 Signs Your Property Has a{" "}
              <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
                Drainage Problem
              </em>{" "}
              — And What to Do About It
            </>
          }
          image={heroImg}
          imageAlt="Heavy equipment drainage trench"
        />

        {/* POST CONTENT */}
        <section className="py-16 bg-background">
          <div className="site-shell prose prose-lg prose-h2:font-serif prose-h2:text-3xl prose-h2:text-secondary prose-h3:font-serif prose-h3:text-2xl prose-h3:text-secondary prose-p:text-secondary/80 prose-li:text-secondary/80 prose-a:text-primary hover:prose-a:text-primary/80">
            <p>
              Drainage problems don't announce themselves with a clear label. They show up as inconveniences — a soggy corner of the field, a driveway that washes out after every storm, a patch of turf that never seems to dry out — until the underlying problem is serious enough that small fixes won't cut it.
            </p>
            <p>
              For large commercial, agricultural, and rural residential properties, drainage failures are especially costly: they damage structures, reduce the productive capacity of fields, create erosion and additional maintenance work.
            </p>
            <p>
              Here are five signs that your property has a drainage problem that deserves a professional look — and what your options are when you find one.
            </p>

            <h2>Sign 1: Standing Water After Rain</h2>
            <p>
              The most obvious indicator. If water is pooling on your property after moderate rainfall and persisting beyond the rainfall event, arrange an assessment of how the site drains. This could be a grading problem (water has nowhere to flow), a soil permeability problem (water can't infiltrate fast enough), or a drainage infrastructure problem (pipes, ditches, or swales that are undersized, blocked, or nonexistent).
            </p>
            <p>
              Standing water that persists damages turf, compacts soil, creates muddy access conditions, and in warm months breeds mosquitoes and other pests. On agricultural land, it can make fields unworkable for days after each rain event.
            </p>

            <h2>Sign 2: Erosion on Slopes and Banks</h2>
            <p>
              If you notice rills (small channels) forming on slopes after rain, bare soil where turf can't establish itself, or sediment washing onto lower areas of your property, you have active erosion. Erosion means water is moving too fast across the surface without being intercepted — and every rain event carries more of your topsoil away.
            </p>
            <p>
              Erosion on embankments, pond banks, and roadsides is particularly concerning because it can compromise structural integrity over time. A pond dam or road embankment that's losing material to erosion needs attention before it becomes a failure.
            </p>

            <h2>Sign 3: Turf That Won't Grow or Keeps Dying</h2>
            <p>
              If you have areas where grass simply won't establish despite repeated seeding, or where turf dies out every season, poor drainage is a likely culprit. Waterlogged soil creates anaerobic conditions that suffocate root systems. Grass needs oxygen in the soil as much as it needs water — saturated ground starves roots of air.
            </p>
            <p>
              If you're spending money repeatedly seeding problem areas without addressing the underlying drainage issue, you're in a cycle that won't end until the drainage is fixed.
            </p>

            <h2>Sign 4: Drainage Ditches That Are Silted, Overgrown, or Undersized</h2>
            <p>
              Ditches that were designed to carry runoff off your property can't do their job if they're silted in with sediment, choked with vegetation, or undersized for current runoff volumes. A blocked or undersized ditch backs water up onto adjacent land — which is often when standing water problems in fields or near structures appear.
            </p>
            <p>
              Agricultural properties in particular rely on properly functioning drainage ditches for field workability. A ditch that hasn't been maintained in several years has often lost 30–50% or more of its original flow capacity.
            </p>

            <h2>Sign 5: Water Intrusion Near Structures</h2>
            <p>
              Water that collects near building foundations, equipment storage areas, or other structures is both a maintenance problem and a structural risk. Repeated saturation of soil adjacent to foundations causes settling, cracking, and in severe cases, structural failure. On farm properties, this might show up as water intrusion in equipment barns or storage buildings situated in low spots.
            </p>
            <p>
              If water consistently runs toward a structure rather than away from it, the grade around that structure needs correction — and the broader drainage system needs evaluation to understand why water is routing toward the building.
            </p>

            <h2>What to Do When You Spot These Signs</h2>
            <p>
              The first step is a site assessment. Drainage problems have root causes that are not always visible from the surface, and applying the wrong solution — such as installing a French drain when the underlying issue is grade — can waste money while leaving the problem unresolved.
            </p>
            <p>
              A proper drainage assessment evaluates the overall topography, existing drainage infrastructure, soil type and permeability, and sources of the water causing the problem. From that assessment, a targeted solution can be designed — whether that's regrading, installing drainage pipes or swales, improving ditch capacity, or a combination.
            </p>
            <p>
              P1 Land & Property Management provides on-site drainage assessments and installs custom drainage solutions for large commercial, agricultural, and residential properties throughout Upstate South Carolina and the Charlotte, NC region.
            </p>
            <p>
              Call <strong><a href="tel:7042218928">+1 (704) 221-8928</a></strong> or request a free estimate online — P1 Land & Property Management, serving Upstate SC and Charlotte NC.
            </p>
          </div>
        </section>
      </article>

      <aside className="site-shell pb-12 text-lg">
        <p>Planning work on your land? <Link href="/services/drainage" className="text-primary underline">Explore this service</Link> and <Link href="/contact" className="text-primary underline">request a property estimate</Link>.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
