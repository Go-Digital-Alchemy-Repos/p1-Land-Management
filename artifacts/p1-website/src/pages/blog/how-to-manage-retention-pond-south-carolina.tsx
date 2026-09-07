import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import heroImg from "@/assets/blog-retention-pond.png";

export default function BlogPost() {
  return (
    <Layout>
      <SEO 
        title="How to Manage a Retention Pond on Your Property in SC & NC | P1 Land & Property Management"
        description="A retention pond that isn't maintained becomes a liability. Learn what routine pond management involves, what to watch for, and when to call a professional. Serving Upstate SC and Charlotte NC."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How to Manage a Retention Pond on Your Property in SC & NC",
          description: "A retention pond that isn't maintained becomes a liability. Learn what routine pond management involves and when to call a professional.",
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
          eyebrow="Pond Management"
          title={
            <>
              How to Manage a{" "}
              <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
                Retention Pond
              </em>{" "}
              on Your Property in South Carolina and North Carolina
            </>
          }
          image={heroImg}
          imageAlt="Well maintained retention pond"
        />

        {/* POST CONTENT */}
        <section className="py-16 bg-background">
          <div className="site-shell prose prose-lg prose-h2:font-serif prose-h2:text-3xl prose-h2:text-secondary prose-h3:font-serif prose-h3:text-2xl prose-h3:text-secondary prose-p:text-secondary/80 prose-li:text-secondary/80 prose-a:text-primary hover:prose-a:text-primary/80">
            <p>
              Whether your property has a farm pond, a stormwater retention basin, or a decorative lake, that water feature is either an asset or a liability — depending on how well it's maintained.
            </p>
            <p>
              Pond management starts with understanding the purpose of the water feature, its condition, and the maintenance responsibilities for the property. Watch for changes in water quality, sediment, vegetation, and shoreline condition.
            </p>
            <p>
              This guide covers what retention pond management actually involves, what problems to watch for, and when DIY maintenance ends and professional help begins.
            </p>

            <h2>What Retention Pond Management Includes</h2>
            <p>
              A complete pond management program addresses five key areas:
            </p>

            <h3>1. Water Quality Monitoring</h3>
            <p>
              Healthy ponds have balanced water chemistry — proper pH, dissolved oxygen levels, and nutrient balance. When chemistry goes wrong, algae and aquatic weeds explode, fish die, and the pond becomes visually and functionally degraded. Regular water quality testing lets you catch problems early, before they become expensive to fix.
            </p>

            <h3>2. Aquatic Weed and Algae Control</h3>
            <p>
              Algae blooms and invasive aquatic weeds are the most visible pond management problem. Left unchecked, they choke out native plants, deplete oxygen, and create foul odors and appearance. Management options include beneficial aeration, biological controls, aquatic herbicide treatments, and mechanical removal — the right approach depends on the species, severity, and pond use.
            </p>

            <h3>3. Shoreline Management</h3>
            <p>
              The shoreline is where pond maintenance meets land management. Erosion along pond banks is a common problem — rain runoff, wave action, and foot or equipment traffic all eat at unprotected banks. Management includes establishing appropriate vegetation buffer zones, installing erosion control materials on vulnerable banks, and removing invasive shoreline plants that destabilize soil.
            </p>

            <h3>4. Aeration</h3>
            <p>
              Aeration and circulation equipment serve different purposes. A fountain is not automatically an effective oxygen-management system for the whole pond. Have the pond’s depth, shape, and water-quality needs assessed before selecting equipment.
            </p>

            <h3>5. Sediment Management</h3>
            <p>
              All ponds accumulate sediment over time as runoff carries soil particles into the water. When sediment buildup reduces pond depth significantly, the pond loses storage capacity, water quality declines, and aquatic habitat degrades. Addressing sediment means either dredging (expensive but thorough) or managing upstream erosion to slow the accumulation rate.
            </p>

            <p>For background on equipment selection, see <a href="https://www.clemson.edu/extension/water/stormwater-ponds/problem-solving/aeration-circulation.html">Clemson Extension’s guide to aeration, circulation, and fountains</a>.</p>
            <h2>Signs Your Pond Needs Attention</h2>
            <ul>
              <li>Green or blue-green water — algae bloom in progress</li>
              <li>Aquatic weed growth that interferes with the intended use of the pond</li>
              <li>Fish kills or visible dead fish</li>
              <li>A new or persistent foul odor that warrants investigation</li>
              <li>Visibly eroding banks or muddy water after rain</li>
              <li>Water level that doesn't recover after dry periods — may indicate dam or outlet issue</li>
              <li>Sediment delta visible at inlet points — accelerating siltation</li>
            </ul>

            <h2>Commercial Property Retention Ponds: Compliance Matters</h2>
            <p>
              For a stormwater pond, review the approved maintenance plan and contact the relevant local stormwater office about the property’s requirements. Keep inspection and maintenance records with the property documentation.
            </p>
            <p>
              Discuss maintenance scope and recordkeeping needs with P1 before arranging a pond maintenance program.
            </p>

            <h2>When to Call a Professional</h2>
            <p>
              DIY pond maintenance has limits. If you're dealing with a serious algae problem, significant erosion, dam integrity concerns, or a commercial pond with regulatory implications, a professional pond management contractor has the equipment, chemicals, and expertise to solve the problem correctly.
            </p>
            <p>
              P1 provides pond and waterway management throughout Upstate South Carolina and the Charlotte, NC region. We work with farm ponds, commercial retention basins, residential estate ponds, and waterfront properties.
            </p>
            <p>
              Call <strong><a href="tel:7042218928">+1 (704) 221-8928</a></strong> or request a free estimate online — P1 Land & Property Management, serving Upstate SC and Charlotte NC.
            </p>
          </div>
        </section>
      </article>

      <aside className="site-shell pb-12 text-lg">
        <p>Planning work on your land? <Link href="/services/pond-waterway-management" className="text-primary underline">Explore this service</Link> and <Link href="/contact" className="text-primary underline">request a property estimate</Link>.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
