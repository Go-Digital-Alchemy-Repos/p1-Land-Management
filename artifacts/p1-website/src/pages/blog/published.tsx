import { Link } from "wouter";
import { useCms } from "@/lib/cms";
import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { SEO } from "@/components/seo";
export default function PublishedBlog() {
  const { snapshot } = useCms();
  const slug = snapshot.route.split("/")[2];
  const post = snapshot.blog?.posts.find((post) => post.snapshot.slug === slug);
  if (!snapshot.blog)
    return (
      <Layout>
        <main className="site-shell py-20" role="status">
          Loading article…
        </main>
      </Layout>
    );
  if (!post)
    return (
      <Layout>
        <SEO
          title="Article not found | P1"
          description="This article is unavailable."
          noindex
        />
        <main className="site-shell py-20">
          <h1 className="text-4xl font-serif">Article not found</h1>
          <Link href="/blog">Return to Blog &amp; Insights</Link>
        </main>
      </Layout>
    );
  const s = post.snapshot;
  return (
    <Layout>
      <SEO
        title={s.seoTitle || s.title}
        description={s.seoDescription || s.excerpt || ""}
        image={s.ogImageUrl || s.coverImageUrl || undefined}
        noindex={s.noindex}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: s.title,
          description: s.excerpt || undefined,
          datePublished: post.publishedAt,
          dateModified: post.modifiedAt,
          url: `https://www.p1landmanagement.com/blog/${s.slug}`,
          author: { "@type": "Person", name: s.authorName },
          ...(s.coverImageUrl
            ? { image: `https://www.p1landmanagement.com${s.coverImageUrl}` }
            : {}),
        }}
      />
      <article className="site-shell py-16">
        <Link href="/blog" className="text-primary underline">
          Blog &amp; Insights
        </Link>
        <h1 className="font-serif text-4xl md:text-5xl mt-6 mb-4 text-secondary">
          {s.title}
        </h1>
        <p className="text-muted-foreground mb-8">
          {s.authorName} ·{" "}
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
        </p>
        {s.coverImageUrl && (
          <img
            src={s.coverImageUrl}
            alt={s.title}
            className="w-full aspect-video object-cover rounded-xl mb-10"
            style={{
              objectPosition: `${s.coverImagePositionX ?? 50}% ${s.coverImagePositionY ?? 50}%`,
            }}
          />
        )}
        <div
          className="prose prose-lg max-w-4xl prose-headings:font-serif prose-headings:text-secondary prose-a:text-primary prose-img:max-w-full min-w-0 break-words prose-pre:max-w-full prose-pre:overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: s.content }}
        />
        {s.podcastUrl && (
          <p className="mt-6">
            <a className="text-primary underline" href={s.podcastUrl}>
              Listen to this episode
            </a>
          </p>
        )}
        {s.externalUrl && (
          <p className="mt-6">
            <a className="text-primary underline" href={s.externalUrl}>
              Read the original article
            </a>
          </p>
        )}
      </article>
      <FinalCTA />
    </Layout>
  );
}
