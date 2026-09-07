import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe,
  FileCode,
  Image,
  SearchIcon,
  Plus,
  ArrowRight,
  Clock,
  BookOpen,
  Blocks,
} from "lucide-react";
import type { CmsPage, BlogPost } from "@shared/schema";
import { format } from "date-fns";

export default function CmsOverviewPage() {
  const [, navigate] = useLocation();

  const { data: pages = [], isLoading: pagesLoading } = useQuery<CmsPage[]>({
    queryKey: ["/api/admin/cms/pages"],
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog"],
  });

  const isLoading = pagesLoading || postsLoading;

  const totalPages = pages.length;
  const publishedPages = pages.filter((p) => p.status === "published").length;
  const recentPages = pages.slice(0, 5);

  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.isPublished).length;

  const quickLinks = [
    {
      title: "Better Farms",
      description: "Edit and publish the Fund a Farm client-site content",
      icon: Globe,
      href: "/admin/cms/client-sites/better-farms/fund-a-farm",
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/30",
      available: true,
    },
    {
      title: "Pages",
      description: "Create and manage public website pages with SEO settings",
      icon: FileCode,
      href: "/admin/cms/pages",
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      available: true,
    },
    {
      title: "Blog",
      description: "Write and publish articles at /insights with SEO controls",
      icon: BookOpen,
      href: "/admin/cms/blog",
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      available: true,
    },
    {
      title: "Media Library",
      description: "Upload and manage images and files via Cloudflare R2",
      icon: Image,
      href: "/admin/cms/media",
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      available: true,
    },
    {
      title: "Sections",
      description: "Save and reuse block groups across any page",
      icon: Blocks,
      href: "/admin/cms/sections",
      color: "text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      available: true,
    },
    {
      title: "SEO Settings",
      description: "Configure global SEO defaults and sitemap settings",
      icon: SearchIcon,
      href: "/admin/cms/seo",
      color: "text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      available: false,
    },
  ];

  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold" data-testid="text-cms-title">
              Content Management System
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your public-facing website pages, blog, and media
            </p>
          </div>
          <Button onClick={() => navigate("/admin/cms/pages/new")} data-testid="button-create-page">
            <Plus className="h-4 w-4 mr-2" />
            Create Page
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card data-testid="card-stat-total">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Globe className="h-4.5 w-4.5 text-violet-600" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10" />
                  ) : (
                    <p className="text-xl font-bold" data-testid="text-stat-total">
                      {totalPages}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Total Pages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-published">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Globe className="h-4.5 w-4.5 text-green-600" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10" />
                  ) : (
                    <p className="text-xl font-bold" data-testid="text-stat-published">
                      {publishedPages}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Published Pages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-blog-total">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <BookOpen className="h-4.5 w-4.5 text-purple-600" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10" />
                  ) : (
                    <p className="text-xl font-bold" data-testid="text-stat-blog-total">
                      {totalPosts}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Blog Posts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-blog-published">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <BookOpen className="h-4.5 w-4.5 text-emerald-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-10" />
                  ) : (
                    <p className="text-xl font-bold" data-testid="text-stat-blog-published">
                      {publishedPosts}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Posts Live</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickLinks.map((link) => (
            <Card
              key={link.href}
              className={`cursor-pointer transition-shadow hover:shadow-md ${!link.available ? "opacity-60" : ""}`}
              onClick={() => link.available && navigate(link.href)}
              data-testid={`card-quicklink-${link.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <CardContent className="pt-5 pb-4">
                <div
                  className={`h-9 w-9 rounded-lg ${link.bg} flex items-center justify-center mb-3`}
                >
                  <link.icon className={`h-4.5 w-4.5 ${link.color}`} />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">{link.title}</h3>
                  {link.available ? (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Soon
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{link.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recently Updated Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentPages.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-testid="text-no-recent-pages"
              >
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No pages yet. Create your first CMS page to get started.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate("/admin/cms/pages/new")}
                  data-testid="button-create-first-page"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Page
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm" data-testid="table-recent-pages">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-muted-foreground font-medium">Title</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Slug</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPages.map((page) => (
                    <tr
                      key={page.id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() =>
                        navigate(
                          page.slug === "directory"
                            ? "/admin/cms/pages/directory"
                            : `/admin/cms/pages/${page.id}`,
                        )
                      }
                      data-testid={`row-recent-page-${page.id}`}
                    >
                      <td className="py-2 font-medium">{page.title}</td>
                      <td className="py-2 text-muted-foreground font-mono text-xs">{page.slug}</td>
                      <td className="py-2">
                        <Badge
                          variant={page.status === "published" ? "default" : "outline"}
                          className={`text-xs ${page.status === "published" ? "bg-emerald-600" : ""}`}
                        >
                          {page.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {page.updatedAt ? format(new Date(page.updatedAt), "MMM d, yyyy") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {posts.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  Recent Blog Posts
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin/cms/blog")}>
                  View all
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm" data-testid="table-recent-posts">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-muted-foreground font-medium">Title</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Author</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.slice(0, 5).map((post) => (
                    <tr
                      key={post.id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => navigate(`/admin/cms/blog/${post.id}`)}
                      data-testid={`row-recent-post-${post.id}`}
                    >
                      <td className="py-2 font-medium truncate max-w-[200px]">{post.title}</td>
                      <td className="py-2 text-muted-foreground">{post.authorName}</td>
                      <td className="py-2">
                        <Badge
                          variant={post.isPublished ? "default" : "outline"}
                          className={`text-xs ${post.isPublished ? "bg-emerald-600" : ""}`}
                        >
                          {post.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {post.publishedAt ? format(new Date(post.publishedAt), "MMM d, yyyy") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminSidebar>
  );
}
