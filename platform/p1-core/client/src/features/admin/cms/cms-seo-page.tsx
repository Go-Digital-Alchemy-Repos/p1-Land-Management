import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CmsImageUpload } from "./components/cms-image-upload";
import {
  Globe,
  SearchIcon,
  Share2,
  Building2,
  Map,
  Code2,
  ArrowUpRight,
  ListChecks,
  BarChart2,
  Save,
  CheckCircle2,
} from "lucide-react";
import type { SeoSettings } from "@shared/schema";
import { CmsSeoAuditTab } from "./cms-seo-audit-tab";
import { CmsRedirectsTab } from "./cms-redirects-tab";
import { CmsSitemapTab } from "./cms-sitemap-tab";

const seoFormSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  titleSuffix: z.string().default(" | Core Platform"),
  defaultMetaDescription: z.string().max(320, "Keep under 320 characters").optional().nullable(),
  siteUrl: z
    .string()
    .url("Must be a valid URL (include https://)")
    .optional()
    .or(z.literal(""))
    .nullable(),
  defaultOgImageUrl: z.string().optional().nullable(),
  organizationName: z.string().optional().nullable(),
  organizationLogoUrl: z.string().optional().nullable(),
  facebookUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  twitterHandle: z.string().optional().nullable(),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  instagramUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  defaultRobotsNoindex: z.boolean().default(false),
});

type SeoFormValues = z.infer<typeof seoFormSchema>;

const ROADMAP_ITEMS = [
  {
    icon: Globe,
    title: "Per-Page SEO",
    description:
      "CMS pages already support per-page seoTitle, seoDescription, seoKeywords, and ogImageUrl. Full edit UI exists in the page editor.",
    status: "available",
  },
  {
    icon: SearchIcon,
    title: "Per-Post SEO",
    description:
      "Blog posts already support seoTitle, seoDescription, and ogImageUrl. Fields are editable in the blog post editor.",
    status: "available",
  },
  {
    icon: Code2,
    title: "Structured Data / JSON-LD",
    description:
      "Organization, WebSite, BreadcrumbList, Article (blog posts), Event (event detail), VideoObject (events with recordings), and FAQPage (CMS pages with FAQ blocks) are generated automatically from real content using JSON-LD.",
    status: "available",
  },
  {
    icon: Map,
    title: "Sitemap Generation",
    description:
      "Auto-generated /sitemap.xml from all published CMS pages, blog posts, and public events. Draft and noindex content is automatically excluded. Preview available in the Sitemap tab.",
    status: "available",
  },
  {
    icon: ListChecks,
    title: "Redirects Manager",
    description:
      "Manage 301/302 redirects for slug changes and retired pages. Redirects are applied server-side before the frontend loads. Toggle active/inactive without deleting.",
    status: "available",
  },
  {
    icon: BarChart2,
    title: "SEO Audit",
    description:
      "Scans all CMS pages, blog posts, and events for missing SEO title, meta description, social image, noindex flags, and publication status. Includes direct edit links.",
    status: "available",
  },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "available") {
    return (
      <Badge
        variant="secondary"
        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs"
      >
        Available
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-xs"
    >
      Planned
    </Badge>
  );
}

export default function CmsSeoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<SeoSettings>({
    queryKey: ["/api/admin/cms/seo"],
  });

  const form = useForm<SeoFormValues>({
    resolver: zodResolver(seoFormSchema),
    defaultValues: {
      siteName: "Core Platform",
      titleSuffix: " | Core Platform",
      defaultMetaDescription: "",
      siteUrl: "",
      defaultOgImageUrl: "",
      organizationName: "Core Platform",
      organizationLogoUrl: "",
      facebookUrl: "",
      twitterHandle: "",
      linkedinUrl: "",
      instagramUrl: "",
      defaultRobotsNoindex: false,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        siteName: settings.siteName ?? "Core Platform",
        titleSuffix: settings.titleSuffix ?? " | Core Platform",
        defaultMetaDescription: settings.defaultMetaDescription ?? "",
        siteUrl: settings.siteUrl ?? "",
        defaultOgImageUrl: settings.defaultOgImageUrl ?? "",
        organizationName: settings.organizationName ?? "Core Platform",
        organizationLogoUrl: settings.organizationLogoUrl ?? "",
        facebookUrl: settings.facebookUrl ?? "",
        twitterHandle: settings.twitterHandle ?? "",
        linkedinUrl: settings.linkedinUrl ?? "",
        instagramUrl: settings.instagramUrl ?? "",
        defaultRobotsNoindex: settings.defaultRobotsNoindex ?? false,
      });
    }
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: (data: SeoFormValues) => apiRequest("PUT", "/api/admin/cms/seo", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms/seo"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seo/global"] });
      toast({ title: "SEO settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const onSubmit = (data: SeoFormValues) => {
    saveMutation.mutate(data);
  };

  const descValue = form.watch("defaultMetaDescription") ?? "";
  const lastUpdated = settings?.updatedAt
    ? new Date(settings.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <AdminSidebar>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-semibold" data-testid="text-seo-title">
              SEO Settings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Global SEO defaults for the public-facing site and blog
            </p>
          </div>
          {lastUpdated && (
            <Badge variant="secondary" className="flex items-center gap-1.5 mt-1 shrink-0">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Saved {lastUpdated}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="settings" data-testid="tab-seo-settings">
              <Globe className="mr-1.5 h-4 w-4 text-blue-600" />
              Global Settings
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-seo-audit">
              <BarChart2 className="mr-1.5 h-4 w-4 text-emerald-600" />
              SEO Audit
            </TabsTrigger>
            <TabsTrigger value="redirects" data-testid="tab-seo-redirects">
              <ArrowUpRight className="mr-1.5 h-4 w-4 text-amber-600" />
              Redirects
            </TabsTrigger>
            <TabsTrigger value="sitemap" data-testid="tab-seo-sitemap">
              <Map className="mr-1.5 h-4 w-4 text-cyan-600" />
              Sitemap
            </TabsTrigger>
            <TabsTrigger value="roadmap" data-testid="tab-seo-roadmap">
              <Code2 className="mr-1.5 h-4 w-4 text-violet-600" />
              Architecture & Roadmap
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-5 mt-5">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">
                  Loading settings…
                </CardContent>
              </Card>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-violet-500" />
                        <CardTitle className="text-base">Site Identity</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        Core identity values used across SEO tags and structured data
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="siteName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Site Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Core Platform"
                                data-testid="input-site-name"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Used in title patterns and structured data
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="organizationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Core Platform"
                                data-testid="input-org-name"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Used in Organization structured data (JSON-LD)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="siteUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Canonical Site URL</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder="https://coreplatform.com"
                                autoPrependHttps
                                data-testid="input-site-url"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Base URL used for canonical tags and sitemap generation
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <SearchIcon className="h-4 w-4 text-violet-500" />
                        <CardTitle className="text-base">Default SEO Meta</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        Fallback meta tags used when a page has no custom SEO settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="titleSuffix"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title Suffix / Pattern</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder=" | Core Platform"
                                data-testid="input-title-suffix"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Appended to page titles — e.g. "Find a Provider | Core Platform"
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="defaultMetaDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Default Meta Description
                              <span
                                className={`ml-2 text-xs font-normal ${descValue.length > 160 ? "text-amber-500" : "text-muted-foreground"}`}
                              >
                                {descValue.length}/160 recommended
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Describe your site in 1-2 sentences for search engines…"
                                className="resize-none"
                                rows={3}
                                data-testid="input-default-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="defaultRobotsNoindex"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                              <div>
                                <FormLabel className="text-sm font-medium cursor-pointer">
                                  Disable Indexing Globally
                                </FormLabel>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Sets noindex,nofollow on all pages. Use only during development.
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-noindex"
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-violet-500" />
                        <CardTitle className="text-base">Default Open Graph Image</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        Fallback image for social sharing when a page has no custom OG image.
                        Recommended: 1200×630 px.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="defaultOgImageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <CmsImageUpload
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                helpText="Upload via R2 or pick from media library. Recommended 1200×630 px."
                                data-testid="upload-og-image"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-violet-500" />
                        <CardTitle className="text-base">Organization Logo</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        Used in Organization structured data and as a fallback brand image.
                        Recommended: square PNG or SVG.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="organizationLogoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <CmsImageUpload
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                helpText="Upload via R2 or pick from media library. Recommended square format."
                                data-testid="upload-org-logo"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-violet-500" />
                        <CardTitle className="text-base">Social Profiles</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        Linked in Organization structured data and used for social meta tags
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="facebookUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Facebook URL</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder="https://facebook.com/coreplatform"
                                  autoPrependHttps
                                  data-testid="input-facebook-url"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="twitterHandle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Twitter / X Handle</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder="@coreplatform"
                                  data-testid="input-twitter-handle"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Used for twitter:site meta tag
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="linkedinUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>LinkedIn URL</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder="https://linkedin.com/company/coreplatform"
                                  autoPrependHttps
                                  data-testid="input-linkedin-url"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="instagramUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instagram URL</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder="https://instagram.com/coreplatform"
                                  autoPrependHttps
                                  data-testid="input-instagram-url"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={saveMutation.isPending}
                      data-testid="button-save-seo"
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {saveMutation.isPending ? "Saving…" : "Save SEO Settings"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </TabsContent>

          <TabsContent value="roadmap" className="mt-5 space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">SEO Architecture</CardTitle>
                <CardDescription className="text-xs">
                  Current capabilities and the planned roadmap for per-page SEO, structured data,
                  and technical SEO tooling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {ROADMAP_ITEMS.map((item, i) => (
                  <div key={item.title}>
                    <div className="flex items-start gap-3 py-3">
                      <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="h-4 w-4 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{item.title}</span>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    {i < ROADMAP_ITEMS.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Global Settings API</CardTitle>
                <CardDescription className="text-xs">
                  Public endpoint for consuming SEO settings in frontend components
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md bg-muted px-3 py-2.5 font-mono text-xs flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">GET</span>
                  <span className="flex-1">/api/seo/global</span>
                  <a
                    href="/api/seo/global"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-500 hover:text-violet-600"
                    data-testid="link-seo-api"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  Returns the current global SEO settings. Used by the{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">useSeo</code> hook and
                  public pages to apply site-wide defaults for title suffix, OG image, and robots
                  preferences.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <CmsSeoAuditTab />
          </TabsContent>

          <TabsContent value="redirects">
            <CmsRedirectsTab />
          </TabsContent>

          <TabsContent value="sitemap">
            <CmsSitemapTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminSidebar>
  );
}
