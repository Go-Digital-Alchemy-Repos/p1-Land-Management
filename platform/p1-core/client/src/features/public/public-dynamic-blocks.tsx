import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, ArrowRight, Search, BookOpen, ExternalLink } from "lucide-react";
import {
  getPostCategories,
  getPrimaryPostCategory,
  postMatchesCategory,
} from "@/lib/blog-post-categories";
import { getImageObjectPositionStyle } from "@/lib/image-focus";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
import { CompanyInformationCard } from "@/components/shared/company-information-card";
import { stripHtml } from "@/lib/html";
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function plainText(v: unknown): string {
  return stripHtml(str(v));
}

export function ContactFormBlock() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="dynamic-contact-form">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send a Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PublicFormRenderer slug="contact-form" showHeader={false} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <CompanyInformationCard
            titleClassName="public-heading-3"
            bodyClassName="public-helper-text"
            linkClassName="public-text-link hover:text-[hsl(var(--public-text-link-hover))]"
          />
        </div>
      </div>
    </div>
  );
}

export function ManagedFormEmbedBlock({ props }: { props: Record<string, unknown> }) {
  const formSlug = str(props.formSlug) || "contact-form";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid={`dynamic-form-embed-${formSlug}`}>
      <PublicFormRenderer slug={formSlug} />
    </div>
  );
}

function num(v: unknown, fallback = 3): number {
  return typeof v === "number" ? v : fallback;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  category?: string;
  categories?: string[] | null;
  tags?: string[];
  coverImageUrl?: string;
  coverImagePositionX?: number | null;
  coverImagePositionY?: number | null;
  postType?: string | null;
  externalUrl?: string | null;
  isPublished: boolean;
}

function getBlogCardMotionClass(enabled: boolean) {
  return enabled ? "blog-card-motion" : "";
}

function FeaturedBlogCard({
  post,
  layout,
  enableHoverMotion = true,
}: {
  post: BlogPost;
  layout: string;
  enableHoverMotion?: boolean;
}) {
  const isExternal = post.postType === "external" && post.externalUrl;
  const isPodcast = post.postType === "podcast";
  const actionText = isExternal ? "Visit Article" : isPodcast ? "Listen Now" : "Read Article";
  const card = (
    <Card
      className={`cursor-pointer overflow-hidden ${getBlogCardMotionClass(enableHoverMotion)}`}
      data-testid="blog-featured-card"
    >
      <div
        className={layout === "stacked" ? "grid grid-cols-1" : "grid grid-cols-1 md:grid-cols-2"}
      >
        {post.coverImageUrl && (
          <div className="aspect-[16/9] md:aspect-auto overflow-hidden">
            <img
              src={post.coverImageUrl}
              alt={plainText(post.title)}
              className="w-full h-full object-cover"
              style={getImageObjectPositionStyle(
                post.coverImagePositionX,
                post.coverImagePositionY,
              )}
              data-blog-card-image
            />
          </div>
        )}
        <CardContent className="p-6 flex flex-col justify-center">
          <h3 className="text-xl font-heading font-bold mb-3 public-heading-3">
            {plainText(post.title)}
          </h3>
          <p className="text-sm public-body-text line-clamp-4 leading-relaxed">
            {plainText(post.excerpt)}
          </p>
          <div className="mt-4">
            <span className="text-sm public-link-text font-medium inline-flex items-center gap-1">
              {actionText}{" "}
              {isExternal ? (
                <ExternalLink className="h-3.5 w-3.5" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </span>
          </div>
        </CardContent>
      </div>
    </Card>
  );

  return isExternal ? (
    <a href={post.externalUrl!} target="_blank" rel="noopener noreferrer">
      {card}
    </a>
  ) : (
    <Link href={`/insights/${post.slug}`}>{card}</Link>
  );
}

function BlogFeedFilters({
  showSearch,
  showCategoryFilter,
  showTagFilter,
  searchQuery,
  selectedCategory,
  selectedTag,
  categories,
  allTags,
  onSearchChange,
  onCategoryChange,
  onTagChange,
  onReset,
}: {
  showSearch: boolean;
  showCategoryFilter: boolean;
  showTagFilter: boolean;
  searchQuery: string;
  selectedCategory: string;
  selectedTag: string;
  categories: string[];
  allTags: string[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-6">
      {showSearch && (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search articles..."
            className="pl-9"
            data-testid="input-blog-search"
          />
        </div>
      )}
      {showCategoryFilter && categories.length > 0 && (
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          data-testid="select-blog-category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
      {showTagFilter && allTags.length > 0 && (
        <select
          value={selectedTag}
          onChange={(e) => onTagChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          data-testid="select-blog-tag"
        >
          <option value="">All Tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}
      {(searchQuery || selectedCategory || selectedTag) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-xs"
          data-testid="button-clear-filters"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

function BlogFeedGrid({
  visible,
  feedStyle,
  gridColsClass,
  filteredCount,
  searchQuery,
  selectedCategory,
  selectedTag,
  safePage,
  totalPages,
  onPrevPage,
  onNextPage,
  onLoadMore,
  enableHoverMotion,
}: {
  visible: BlogPost[];
  feedStyle: string;
  gridColsClass: string;
  filteredCount: number;
  searchQuery: string;
  selectedCategory: string;
  selectedTag: string;
  safePage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onLoadMore: () => void;
  enableHoverMotion: boolean;
}) {
  if (visible.length === 0) {
    return (
      <div className="text-center py-12 public-helper-text">
        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">
          {searchQuery || selectedCategory || selectedTag
            ? "No articles match your filters"
            : "No articles published yet"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`grid gap-6 ${gridColsClass}`}>
        {visible.map((p) => {
          const isExternal = p.postType === "external" && p.externalUrl;
          const isPodcast = p.postType === "podcast";
          const actionText = isExternal ? "Visit Article" : isPodcast ? "Listen Now" : "Read More";
          const card = (
            <Card
              className={`h-full cursor-pointer ${getBlogCardMotionClass(enableHoverMotion)}`}
              data-testid={`blog-feed-card-${p.id}`}
            >
              {p.coverImageUrl && (
                <div className="aspect-[16/9] overflow-hidden rounded-t-lg">
                  <img
                    src={p.coverImageUrl}
                    alt={plainText(p.title)}
                    className="w-full h-full object-cover"
                    style={getImageObjectPositionStyle(
                      p.coverImagePositionX,
                      p.coverImagePositionY,
                    )}
                    data-blog-card-image
                  />
                </div>
              )}
              <CardContent className="p-4">
                {getPrimaryPostCategory(p) && (
                  <span className="text-xs public-meta-text font-medium">
                    {getPrimaryPostCategory(p)}
                  </span>
                )}
                <p className="font-semibold text-sm mb-1 line-clamp-2 public-heading-3">
                  {plainText(p.title)}
                </p>
                <p className="text-xs public-body-text line-clamp-3 leading-relaxed">
                  {plainText(p.excerpt)}
                </p>
                <span className="mt-3 text-xs public-link-text font-medium inline-flex items-center gap-1">
                  {actionText}{" "}
                  {isExternal ? (
                    <ExternalLink className="h-3 w-3" />
                  ) : (
                    <ArrowRight className="h-3 w-3" />
                  )}
                </span>
              </CardContent>
            </Card>
          );

          if (isExternal) {
            return (
              <a key={p.id} href={p.externalUrl!} target="_blank" rel="noopener noreferrer">
                {card}
              </a>
            );
          }

          return (
            <Link key={p.id} href={`/insights/${p.slug}`}>
              {card}
            </Link>
          );
        })}
      </div>
      {feedStyle === "pagination" && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8" data-testid="blog-pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={onPrevPage}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="text-sm public-meta-text px-3">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={onNextPage}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}
      {feedStyle === "load-more" && visible.length < filteredCount && (
        <div className="flex justify-center mt-8" data-testid="blog-load-more">
          <Button variant="outline" onClick={onLoadMore}>
            Load More Articles
          </Button>
        </div>
      )}
    </>
  );
}

export function BlogPostFeedBlock({ props }: { props: Record<string, unknown> }) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { data: posts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });
  const postsPerPage = num(props.postsPerPage, 9);
  const gridColumns = String(props.gridColumns ?? "3");
  const feedStyle = String(props.feedStyle ?? "pagination");
  const showSearch = props.showSearch !== false;
  const showCategoryFilter = props.showCategoryFilter !== false;
  const showTagFilter = props.showTagFilter !== false;
  const enableHoverMotion = props.enableHoverMotion !== false;
  const published = (posts ?? []).filter((p) => p.isPublished);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
    setSearchQuery(searchParams.get("search") ?? "");
    setSelectedCategory(searchParams.get("category") ?? "");
    setSelectedTag(searchParams.get("tag") ?? "");
    setCurrentPage(1);
  }, [location]);

  const categories = Array.from(
    new Set(published.flatMap((p) => getPostCategories(p)).filter(Boolean)),
  ) as string[];
  const allTags = Array.from(new Set(published.flatMap((p) => p.tags ?? []).filter(Boolean)));

  const filtered = published.filter((p) => {
    if (
      searchQuery &&
      !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(p.excerpt ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (selectedCategory && !postMatchesCategory(p, selectedCategory)) return false;
    if (selectedTag && !(p.tags ?? []).includes(selectedTag)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / postsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const visible =
    feedStyle === "load-more"
      ? filtered.slice(0, safePage * postsPerPage)
      : filtered.slice((safePage - 1) * postsPerPage, safePage * postsPerPage);
  const gridColsClass =
    gridColumns === "2"
      ? "grid-cols-1 md:grid-cols-2"
      : gridColumns === "4"
        ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
        : "grid-cols-1 md:grid-cols-3";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedTag("");
    setCurrentPage(1);
  };

  return (
    <div className="py-4" data-testid="block-blog-post-feed">
      <BlogFeedFilters
        showSearch={showSearch}
        showCategoryFilter={showCategoryFilter}
        showTagFilter={showTagFilter}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedTag={selectedTag}
        categories={categories}
        allTags={allTags}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        onCategoryChange={(value) => {
          setSelectedCategory(value);
          setCurrentPage(1);
        }}
        onTagChange={(value) => {
          setSelectedTag(value);
          setCurrentPage(1);
        }}
        onReset={resetFilters}
      />
      <BlogFeedGrid
        visible={visible}
        feedStyle={feedStyle}
        gridColsClass={gridColsClass}
        filteredCount={filtered.length}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedTag={selectedTag}
        safePage={safePage}
        totalPages={totalPages}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        onLoadMore={() => setCurrentPage((page) => page + 1)}
        enableHoverMotion={enableHoverMotion}
      />
    </div>
  );
}

export function BlogFeaturedPostBlock({ props }: { props: Record<string, unknown> }) {
  const { data: posts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });
  const featured = (posts ?? []).filter((p) => p.isPublished)[0];
  const layout = String(props.layout ?? "split");
  const enableHoverMotion = props.enableHoverMotion !== false;

  return (
    <div className="py-4" data-testid="block-blog-featured-post">
      {!featured ? (
        <div className="text-center py-12 public-helper-text">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Featured article will appear here</p>
        </div>
      ) : (
        <FeaturedBlogCard post={featured} layout={layout} enableHoverMotion={enableHoverMotion} />
      )}
    </div>
  );
}

export function StandardBlogPageBlock({ props }: { props: Record<string, unknown> }) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { data: posts } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog"],
  });

  const featured = (posts ?? []).filter((p) => p.isPublished)[0];
  const layout = String(props.layout ?? "split");
  const postsPerPage = num(props.postsPerPage, 9);
  const gridColumns = String(props.gridColumns ?? "3");
  const feedStyle = String(props.feedStyle ?? "pagination");
  const showSearch = props.showSearch !== false;
  const showCategoryFilter = props.showCategoryFilter !== false;
  const showTagFilter = props.showTagFilter !== false;
  const enableHoverMotion = props.enableHoverMotion !== false;
  const published = (posts ?? []).filter((p) => p.isPublished);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
    setSearchQuery(searchParams.get("search") ?? "");
    setSelectedCategory(searchParams.get("category") ?? "");
    setSelectedTag(searchParams.get("tag") ?? "");
    setCurrentPage(1);
  }, [location]);

  const categories = Array.from(
    new Set(published.flatMap((p) => getPostCategories(p)).filter(Boolean)),
  ) as string[];
  const allTags = Array.from(new Set(published.flatMap((p) => p.tags ?? []).filter(Boolean)));

  const filtered = published.filter((p) => {
    if (featured?.id && p.id === featured.id) return false;
    if (
      searchQuery &&
      !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(p.excerpt ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (selectedCategory && !postMatchesCategory(p, selectedCategory)) return false;
    if (selectedTag && !(p.tags ?? []).includes(selectedTag)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / postsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const visible =
    feedStyle === "load-more"
      ? filtered.slice(0, safePage * postsPerPage)
      : filtered.slice((safePage - 1) * postsPerPage, safePage * postsPerPage);
  const gridColsClass =
    gridColumns === "2"
      ? "grid-cols-1 md:grid-cols-2"
      : gridColumns === "4"
        ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
        : "grid-cols-1 md:grid-cols-3";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedTag("");
    setCurrentPage(1);
  };

  return (
    <div className="py-4 space-y-8" data-testid="block-standard-blog-page">
      <BlogFeedFilters
        showSearch={showSearch}
        showCategoryFilter={showCategoryFilter}
        showTagFilter={showTagFilter}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedTag={selectedTag}
        categories={categories}
        allTags={allTags}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setCurrentPage(1);
        }}
        onCategoryChange={(value) => {
          setSelectedCategory(value);
          setCurrentPage(1);
        }}
        onTagChange={(value) => {
          setSelectedTag(value);
          setCurrentPage(1);
        }}
        onReset={resetFilters}
      />
      {featured ? (
        <FeaturedBlogCard post={featured} layout={layout} enableHoverMotion={enableHoverMotion} />
      ) : null}
      <BlogFeedGrid
        visible={visible}
        feedStyle={feedStyle}
        gridColsClass={gridColsClass}
        filteredCount={filtered.length}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        selectedTag={selectedTag}
        safePage={safePage}
        totalPages={totalPages}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        onLoadMore={() => setCurrentPage((page) => page + 1)}
        enableHoverMotion={enableHoverMotion}
      />
    </div>
  );
}
