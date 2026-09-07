import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { PageLayout } from "@/components/layout/page-layout";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Headphones, ExternalLink } from "lucide-react";
import { getPrimaryPostCategory, postMatchesCategory } from "@/lib/blog-post-categories";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import type { BlogPost } from "@shared/schema";
import { PublicSidebar } from "@/features/public/public-sidebar";

export default function InsightsPage() {
  const [location] = useLocation();
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
  const searchQuery = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const categoryFilter = searchParams.get("category") ?? "";
  const tagFilter = searchParams.get("tag") ?? "";

  const filteredPosts = (posts ?? []).filter((post) => {
    const matchesSearch =
      !searchQuery ||
      [post.title, post.excerpt, post.content, post.authorName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchQuery));
    const matchesCategory = !categoryFilter || postMatchesCategory(post, categoryFilter);
    const matchesTag = !tagFilter || Boolean(post.tags?.includes(tagFilter));
    return matchesSearch && matchesCategory && matchesTag;
  });

  const featuredPost = filteredPosts[0];
  const gridPosts = filteredPosts.slice(1);

  return (
    <PageLayout>
      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-insights-hero">
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.18) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <div className="text-center">
            <h1
              className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 public-heading-1"
              data-testid="text-insights-heading"
            >
              Insights & Articles
            </h1>
            <p className="text-base sm:text-lg public-supporting-copy max-w-2xl mx-auto leading-relaxed">
              Explore articles, research, and insights for platform operations.
            </p>
            {(searchQuery || categoryFilter || tagFilter) && (
              <p className="text-sm public-meta-text mt-4" data-testid="text-insights-filters">
                Filtering
                {searchQuery ? ` by "${searchQuery}"` : ""}
                {categoryFilter ? ` in ${categoryFilter}` : ""}
                {tagFilter ? ` tagged ${tagFilter}` : ""}.
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14"
        data-testid="section-insights-content"
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          <div>
            {isLoading ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner />
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-10">
                {featuredPost &&
                  (featuredPost.postType === "external" && featuredPost.externalUrl ? (
                    <a href={featuredPost.externalUrl} target="_blank" rel="noopener noreferrer">
                      <Card
                        className="overflow-hidden cursor-pointer hover-elevate blog-card-motion"
                        data-testid={`card-blog-featured-${featuredPost.id}`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2">
                          {featuredPost.coverImageUrl && (
                            <div className="aspect-[16/9] md:aspect-auto md:min-h-[320px] overflow-hidden">
                              <img
                                src={featuredPost.coverImageUrl}
                                alt={featuredPost.title}
                                className="w-full h-full object-cover"
                                style={getImageObjectPositionStyle(
                                  featuredPost.coverImagePositionX,
                                  featuredPost.coverImagePositionY,
                                )}
                                data-blog-card-image
                                data-testid={`img-blog-cover-${featuredPost.id}`}
                              />
                            </div>
                          )}
                          <CardContent className="p-6 sm:p-8 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <Badge
                                variant="default"
                                className="text-xs bg-accent text-accent-foreground"
                                data-testid={`badge-featured-${featuredPost.id}`}
                              >
                                Featured
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-xs"
                                data-testid={`badge-type-${featuredPost.id}`}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                External
                              </Badge>
                              {getPrimaryPostCategory(featuredPost) && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                  data-testid={`badge-category-${featuredPost.id}`}
                                >
                                  {getPrimaryPostCategory(featuredPost)}
                                </Badge>
                              )}
                            </div>
                            <h2
                              className="font-heading text-xl sm:text-2xl md:text-3xl font-semibold mb-3 public-heading-2"
                              data-testid={`text-blog-title-${featuredPost.id}`}
                            >
                              {featuredPost.title}
                            </h2>
                            {featuredPost.excerpt && (
                              <p className="text-sm sm:text-base public-body-text leading-relaxed mb-4 line-clamp-3">
                                {featuredPost.excerpt}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm public-meta-text">
                                By {featuredPost.authorName}
                              </span>
                              <span className="text-sm public-link-text font-medium flex items-center gap-1">
                                Visit Article <ExternalLink className="h-4 w-4" />
                              </span>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    </a>
                  ) : (
                    <Link href={`/insights/${featuredPost.slug}`}>
                      <Card
                        className="overflow-hidden cursor-pointer hover-elevate blog-card-motion"
                        data-testid={`card-blog-featured-${featuredPost.id}`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2">
                          {featuredPost.coverImageUrl && (
                            <div className="aspect-[16/9] md:aspect-auto md:min-h-[320px] overflow-hidden">
                              <img
                                src={featuredPost.coverImageUrl}
                                alt={featuredPost.title}
                                className="w-full h-full object-cover"
                                style={getImageObjectPositionStyle(
                                  featuredPost.coverImagePositionX,
                                  featuredPost.coverImagePositionY,
                                )}
                                data-blog-card-image
                                data-testid={`img-blog-cover-${featuredPost.id}`}
                              />
                            </div>
                          )}
                          <CardContent className="p-6 sm:p-8 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <Badge
                                variant="default"
                                className="text-xs bg-accent text-accent-foreground"
                                data-testid={`badge-featured-${featuredPost.id}`}
                              >
                                Featured
                              </Badge>
                              {featuredPost.postType === "podcast" && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                  data-testid={`badge-type-${featuredPost.id}`}
                                >
                                  <Headphones className="h-3 w-3 mr-1" />
                                  Podcast
                                </Badge>
                              )}
                              {getPrimaryPostCategory(featuredPost) && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                  data-testid={`badge-category-${featuredPost.id}`}
                                >
                                  {getPrimaryPostCategory(featuredPost)}
                                </Badge>
                              )}
                            </div>
                            <h2
                              className="font-heading text-xl sm:text-2xl md:text-3xl font-semibold mb-3 public-heading-2"
                              data-testid={`text-blog-title-${featuredPost.id}`}
                            >
                              {featuredPost.title}
                            </h2>
                            {featuredPost.excerpt && (
                              <p className="text-sm sm:text-base public-body-text leading-relaxed mb-4 line-clamp-3">
                                {featuredPost.excerpt}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm public-meta-text">
                                By {featuredPost.authorName}
                              </span>
                              <span className="text-sm public-link-text font-medium flex items-center gap-1">
                                {featuredPost.postType === "podcast" ? "Listen Now" : "Read More"}{" "}
                                <ArrowRight className="h-4 w-4" />
                              </span>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    </Link>
                  ))}

                {gridPosts.length > 0 && (
                  <section
                    className="relative bg-muted/30 overflow-hidden -mx-4 sm:-mx-6 px-4 sm:px-6 py-10 sm:py-14 rounded-xl"
                    data-testid="section-insights-grid"
                  >
                    <div
                      className="pointer-events-none absolute top-0 left-0 right-0 h-32"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.12) 0%, transparent 70%)",
                      }}
                    />
                    <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {gridPosts.map((post) => {
                        const isExternal = post.postType === "external" && post.externalUrl;
                        const isPodcast = post.postType === "podcast";
                        const cardInner = (
                          <Card
                            className="h-full cursor-pointer hover-elevate blog-card-motion"
                            data-testid={`card-blog-${post.id}`}
                          >
                            {post.coverImageUrl && (
                              <div className="aspect-[16/9] overflow-hidden rounded-t-lg">
                                <img
                                  src={post.coverImageUrl}
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                  style={getImageObjectPositionStyle(
                                    post.coverImagePositionX,
                                    post.coverImagePositionY,
                                  )}
                                  data-blog-card-image
                                  data-testid={`img-blog-cover-${post.id}`}
                                />
                              </div>
                            )}
                            <CardContent className={post.coverImageUrl ? "p-5" : "p-6"}>
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                {isPodcast && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                    data-testid={`badge-type-${post.id}`}
                                  >
                                    <Headphones className="h-3 w-3 mr-1" />
                                    Podcast
                                  </Badge>
                                )}
                                {isExternal && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                    data-testid={`badge-type-${post.id}`}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    External
                                  </Badge>
                                )}
                                {getPrimaryPostCategory(post) && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                    data-testid={`badge-category-${post.id}`}
                                  >
                                    {getPrimaryPostCategory(post)}
                                  </Badge>
                                )}
                              </div>
                              <h2
                                className="font-semibold text-lg mb-2 line-clamp-2 public-heading-3"
                                data-testid={`text-blog-title-${post.id}`}
                              >
                                {post.title}
                              </h2>
                              {post.excerpt && (
                                <p className="text-sm public-body-text line-clamp-3 leading-relaxed mb-3">
                                  {post.excerpt}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-xs public-meta-text">
                                  By {post.authorName}
                                </span>
                                <span className="text-xs public-link-text font-medium flex items-center gap-1">
                                  {isExternal ? (
                                    <>
                                      Visit Article <ExternalLink className="h-3 w-3" />
                                    </>
                                  ) : isPodcast ? (
                                    <>
                                      Listen Now <ArrowRight className="h-3 w-3" />
                                    </>
                                  ) : (
                                    <>
                                      Read More <ArrowRight className="h-3 w-3" />
                                    </>
                                  )}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        );

                        if (isExternal) {
                          return (
                            <a
                              key={post.id}
                              href={post.externalUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {cardInner}
                            </a>
                          );
                        }
                        return (
                          <Link key={post.id} href={`/insights/${post.slug}`}>
                            {cardInner}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {posts && posts.length > 0 ? "No matching articles" : "No articles yet"}
                </h3>
                <p className="text-sm public-helper-text">
                  {posts && posts.length > 0
                    ? "Try a different search, category, or tag."
                    : "Check back soon for insights on platform operations, content workflows, admin UX, and launch readiness."}
                </p>
              </div>
            )}
          </div>
          <PublicSidebar useDefault />
        </div>
      </section>
    </PageLayout>
  );
}
