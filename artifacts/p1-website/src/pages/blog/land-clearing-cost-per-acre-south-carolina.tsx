import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { LOGO_URL } from "@/lib/site";
import heroImg from "@/assets/blog-land-clearing.png";

export default function BlogPost() {
  return (
    <Layout>
      <SEO 
        title="How Much Does Land Clearing Cost Per Acre in South Carolina? | P1 Land & Property Management"
        description="Understand what drives land clearing costs in South Carolina. From forestry mulching to full clearing with grubbing, we break down what you can expect to pay per acre. Call (704) 221-8928."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "How Much Does Land Clearing Cost Per Acre in South Carolina?",
          description: "Understand what drives land clearing costs in South Carolina, from forestry mulching to full clearing with grubbing.",
          image: "https://www.p1landmanagement.com/opengraph.jpg",
          author: { "@type": "Organization", name: "P1 Land & Property Management" },
          publisher: {
            "@type": "Organization",
            name: "P1 Land & Property Management",
            logo: { "@type": "ImageObject", url: LOGO_URL },
          },
        }}
      />

      <article className="pb-24">
        {/* POST HERO */}
        <PageHero
          eyebrow="Land Clearing"
          title={
            <>
              How Much Does Land Clearing Cost{" "}
              <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
                Per Acre
              </em>{" "}
              in South Carolina?
            </>
          }
          image={heroImg}
          imageAlt="Heavy equipment clearing land"
        />

        {/* POST CONTENT */}
        <section className="py-16 bg-background">
          <div className="site-shell prose prose-lg prose-h2:font-serif prose-h2:text-3xl prose-h2:text-secondary prose-h3:font-serif prose-h3:text-2xl prose-h3:text-secondary prose-p:text-secondary/80 prose-li:text-secondary/80 prose-a:text-primary hover:prose-a:text-primary/80">
            <p>
              If you own land in Upstate South Carolina and you're getting ready to clear it — for a building project, to open up farm acreage, or to reclaim overgrown property — one of the first questions you'll ask is: how much is this going to cost?
            </p>
            <p>
              The honest answer is that land clearing costs in South Carolina vary significantly depending on several factors. But understanding what drives that variation will help you budget accurately and avoid surprises when you start getting estimates.
            </p>
            <p>
              This post breaks down the cost considerations for land clearing in Upstate SC, what factors move the number up or down, and how to evaluate competing bids when you start talking to contractors.
            </p>

            <h2>Why a Per-Acre Price Needs a Site Assessment</h2>
            <p>There is no verified P1 price schedule published here. Brush density, tree size, site access, ground conditions, stump removal, and debris handling change the scope. Request a written estimate for your parcel before setting a budget.</p>

            <h2>What Factors Affect Land Clearing Cost?</h2>
            
            <h3>1. Vegetation Density and Type</h3>
            <p>
              This is the biggest driver. A field overgrown with brush and saplings clears much faster — and cheaper — than a stand of mature hardwoods with six-inch root systems. The more you're asking equipment to move, the more it costs.
            </p>

            <h3>2. Acreage and Site Access</h3>
            <p>
              Larger parcels generally have lower per-acre costs because mobilization and setup are fixed expenses that spread across more acres. A 50-acre clearing job will typically cost less per acre than a 2-acre job. Similarly, if heavy equipment can access your site easily, mobilization costs go down.
            </p>

            <h3>3. Clearing Method</h3>
            <p>
              The method used to clear your land significantly affects both cost and outcome. The two main approaches are:
            </p>
            <ul>
              <li><strong>Traditional clearing and grubbing:</strong> Trees are felled, stumps are pulled or ground, and debris is hauled or burned. This method is thorough but generates significant debris volume and is often more expensive.</li>
              <li><strong>Forestry mulching:</strong> A single machine with a drum head grinds all vegetation — trees, brush, stumps — directly into mulch on site. No hauling, no burning, less ground disturbance. Often more cost-effective and environmentally preferable for sites that won't be immediately constructed on.</li>
            </ul>

            <h3>4. What Happens to the Debris</h3>
            <p>
              Ask how debris will be handled and which disposal costs are included. Mulching may reduce hauling, but the appropriate approach depends on the vegetation and intended use of the cleared area. Confirm applicable requirements before any burning or disposal.
            </p>

            <h3>5. Post-Clearing Needs</h3>
            <p>
              If your clearing project is followed immediately by grading, drainage work, or turf establishment, bundling these services with one contractor can reduce total project cost. A contractor who handles clearing, grading, and seeding can discuss the sequence and mobilization costs across the proposed work.
            </p>

            <h2>Getting an Accurate Estimate</h2>
            <p>
              The only way to get an accurate land clearing estimate is to have a contractor walk your property. Photos and acreage numbers give a ballpark — but the actual terrain, slope, soil conditions, vegetation density, and access will be assessed on site. Ask whether an assessment has a fee and what the written bid includes.
            </p>
            <p>
              When comparing bids, make sure you're comparing apples to apples: Does the bid include stump grinding? Debris hauling? Site cleanup? Will the cleared area be left at rough grade, or is fine grading a separate line item? These questions will surface the real differences between quotes.
            </p>

            <h2>Ready to Get Your Land Cleared in Upstate SC or Charlotte NC?</h2>
            <p>
              P1 Land & Property Management provides land clearing for commercial, agricultural, and large residential properties throughout Upstate South Carolina and the Charlotte, NC region. We offer free on-site assessments and transparent, written estimates.
            </p>
            <p>
              Call <strong><a href="tel:7042218928">+1 (704) 221-8928</a></strong> or request a free estimate online — P1 Land & Property Management, serving Upstate SC and Charlotte NC.
            </p>
          </div>
        </section>
      </article>

      <aside className="site-shell pb-12 text-lg">
        <p>Planning work on your land? <Link href="/services/land-clearing" className="text-primary underline">Explore this service</Link> and <Link href="/contact" className="text-primary underline">request a property estimate</Link>.</p>
      </aside>
      <FinalCTA />
    </Layout>
  );
}
