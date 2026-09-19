import { Link } from "wouter";
import { useCms } from "@/lib/cms";
import { Layout } from "@/components/layout/Layout";
import { FinalCTA } from "@/components/layout/FinalCTA";
import { PageHero } from "@/components/layout/PageHero";
import { articleSchema } from "@/lib/structured-data";
import { SEO } from "@/components/seo";
export default function PublishedBlog() {
  const { snapshot } = useCms();
  const slug = snapshot.route.split("/")[2];
  const post = snapshot.blog?.posts.find((post) => post.snapshot.slug === slug);
  if (!snapshot.blog?.staticRoutes)
    return (
      <Layout>
        <SEO
          title="Article temporarily unavailable | P1"
          description="Please try again shortly."
          noindex
        />
        <main className="site-shell py-20" role="status">
          {snapshot.blog
            ? "Articles are temporarily unavailable. Please try again shortly."
            : "Loading article…"}
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
  const presentation = s.presentation;
  if (presentation) {
    const data = presentation.structuredData;
    const structured = articleSchema({
      headline: data.headline,
      description: data.description,
      path: `/blog/${s.slug}`,
      datePublished: data.publishedDate ?? post.publishedAt,
      dateModified: data.modifiedDate ?? post.modifiedAt,
    });
    return (
      <Layout>
        <SEO
          title={s.seoTitle || s.title}
          description={s.seoDescription || s.excerpt || ""}
          image={s.ogImageUrl || s.coverImageUrl || undefined}
          noindex={s.noindex}
          jsonLd={{
            ...structured,
            "@type": data.type,
            author:
              data.authorType === "Organization"
                ? s.authorName ===
                  (structured.author as Record<string, unknown>).name
                  ? structured.author
                  : { "@type": "Organization", name: s.authorName }
                : { "@type": "Person", name: s.authorName },
          }}
        />
        <article className="pb-24">
          <PageHero
            eyebrow={presentation.eyebrow}
            title={
              <>
                {presentation.titleParts.map((part, index) =>
                  part.emphasis ? (
                    <em
                      key={index}
                      className="font-semibold not-italic text-tan"
                      style={{ fontStyle: "italic" }}
                    >
                      {part.text}
                    </em>
                  ) : (
                    <span key={index}>{part.text}</span>
                  ),
                )}
              </>
            }
            {...(s.coverImageUrl
              ? { image: s.coverImageUrl, imageAlt: presentation.imageAlt }
              : { image: undefined })}
            imagePosition={`${s.coverImagePositionX ?? 50}% ${s.coverImagePositionY ?? 50}%`}
          />
          <section className="py-16 bg-background">
            <div
              className="site-shell prose prose-lg prose-h2:font-serif prose-h2:text-3xl prose-h2:text-secondary prose-h3:font-serif prose-h3:text-2xl prose-h3:text-secondary prose-p:text-secondary/80 prose-li:text-secondary/80 prose-a:text-primary hover:prose-a:text-primary/80 min-w-0 break-words prose-pre:max-w-full prose-pre:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: s.content }}
            />
          </section>
        </article>
        {presentation.relatedContent && (
          <aside
            className="site-shell pb-12 text-lg [&_a]:text-primary [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: presentation.relatedContent }}
          />
        )}
        <FinalCTA />
      </Layout>
    );
  }
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
