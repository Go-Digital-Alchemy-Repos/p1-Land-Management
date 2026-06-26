import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { SEO } from "@/components/seo";
import { Link } from "wouter";

import blog1Img from "@/assets/blog-land-clearing.png";
import blog2Img from "@/assets/blog-retention-pond.png";
import blog3Img from "@/assets/blog-grass-acreage.png";
import blog4Img from "@/assets/blog-drainage.png";
import blog5Img from "@/assets/blog-ag-land.png";

const BLOG_POSTS = [
  {
    title: "How Much Does Land Clearing Cost Per Acre in South Carolina?",
    excerpt: "If you own land in Upstate South Carolina and you're getting ready to clear it — for a building project, to open up farm acreage, or to reclaim overgrown property — one of the first questions you'll ask is: how much is this going to cost?",
    image: blog1Img,
    slug: "land-clearing-cost-per-acre-south-carolina"
  },
  {
    title: "How to Manage a Retention Pond on Your Property in South Carolina and North Carolina",
    excerpt: "Whether your property has a farm pond, a stormwater retention basin, or a decorative lake, that water feature is either an asset or a liability — depending on how well it's maintained.",
    image: blog2Img,
    slug: "how-to-manage-retention-pond-south-carolina"
  },
  {
    title: "Best Grass Types for Large-Acreage Properties in the Carolinas",
    excerpt: "Choosing the wrong grass species for a large-acreage property in South Carolina or North Carolina is an expensive mistake. Reseed or re-sod even a modest number of acres and you're talking about thousands of dollars.",
    image: blog3Img,
    slug: "best-grass-large-acreage-carolinas"
  },
  {
    title: "5 Signs Your Property Has a Drainage Problem — And What to Do About It",
    excerpt: "Drainage problems don't announce themselves with a clear label. They show up as inconveniences — a soggy corner of the field, a driveway that washes out after every storm, a patch of turf that never seems to dry out.",
    image: blog4Img,
    slug: "signs-property-drainage-problem"
  },
  {
    title: "How to Prepare Raw Land for Agricultural Use in the Carolinas",
    excerpt: "Whether you've acquired raw land you want to put into production, reclaimed overgrown acreage that once was farmed, or inherited a neglected property you want to make productive again, the path from raw or overgrown land to working agricultural acreage follows a specific sequence.",
    image: blog5Img,
    slug: "preparing-land-agricultural-use-carolinas"
  }
];

export default function BlogIndex() {
  return (
    <Layout>
      <SEO 
        title="Blog & Insights | P1 Land & Property Management"
        description="Insights, guides, and expertise on large-acreage land clearing, grading, drainage, and property management in Upstate South Carolina and Charlotte, NC."
      />
      
      {/* PAGE HERO */}
      <PageHero
        eyebrow="Insights"
        title={
          <>
            Land &{" "}
            <em className="font-semibold not-italic text-tan" style={{ fontStyle: "italic" }}>
              Property Insights
            </em>
          </>
        }
        subtitle="Expertise, guides, and straight talk on managing large-acreage properties across the Carolinas."
      />

      {/* BLOG LISTING */}
      <section className="py-24 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post, i) => (
              <Link 
                key={i} 
                href={`/blog/${post.slug}`} 
                className="group flex flex-col bg-card border border-card-border rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                  <img 
                    src={post.image} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="text-2xl font-serif font-bold text-secondary mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-secondary/70 leading-relaxed mb-6 flex-1 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="mt-auto flex items-center text-primary font-bold">
                    Read Article <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
    </Layout>
  );
}
