import { BrandingProvider } from "@/components/shared/branding-provider";
import { CookieConsentBanner } from "@/components/shared/cookie-consent-banner";
import { ProtectedRoute } from "@/components/shared/protected-route";
import { ThemeModeProvider } from "@/components/shared/theme-mode-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FrontendEditProvider } from "@/features/frontend-edit/frontend-edit";
import { useAuth } from "@/hooks/use-auth";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { queryClient, STALE_TIMES } from "./lib/queryClient";

import { loadGa4IfConsented, loadMarketingPixelsIfConsented } from "@/lib/analytics-runtime";
import { subscribeToCookieConsent } from "@/lib/cookie-consent";
import NotFound from "@/pages/not-found";
import { DEFAULT_SITE_FEATURES, type SiteFeatures } from "@shared/site-features";
import { Loader2 } from "lucide-react";

const ClientSitePagesPage = lazy(() => import("@/features/admin/cms/client-site-pages-page"));

const CmsHybridPage = lazy(() =>
  import("@/features/public/cms-hybrid-page").then((module) => ({
    default: module.CmsHybridPage,
  })),
);
const PublicGalleryPage = lazy(() => import("@/features/public/gallery-page"));

const LoginPage = lazy(() => import("@/features/auth/login-page"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/forgot-password-page"));
const ResetPasswordPage = lazy(() => import("@/features/auth/reset-password-page"));
const AdminSetupPage = lazy(() => import("@/features/auth/admin-setup-page"));

const AdminDashboardPage = lazy(() => import("@/features/admin/dashboard-page"));
const AdminUsersPage = lazy(() => import("@/features/admin/users-page"));
const AdminFormsPage = lazy(() => import("@/features/admin/forms-page"));
const AdminCrmSettingsPage = lazy(() => import("@/features/admin/crm-settings-page"));
const AdminCrmPage = lazy(() => import("@/features/admin/crm-page"));
const AdminCrmClientsPage = lazy(() => import("@/features/admin/crm-clients-page"));
const AdminEventsPage = lazy(() => import("@/features/admin/events-page"));
const AdminEventSettingsPage = lazy(() => import("@/features/admin/event-settings-page"));
const AdminCareersPage = lazy(() => import("@/features/admin/careers-page"));
const DocsPage = lazy(() => import("@/features/admin/docs-page"));
const AdminSettingsPage = lazy(() => import("@/features/admin/settings-page"));
const AdminDesignPage = lazy(() => import("@/features/admin/design-page"));
const CmsBlogPage = lazy(() => import("@/features/admin/cms/cms-blog-page"));
const CmsBlogEditorPage = lazy(() => import("@/features/admin/cms/cms-blog-editor-page"));

const CmsOverviewPage = lazy(() => import("@/features/admin/cms/cms-overview-page"));
const CmsPagesPage = lazy(() => import("@/features/admin/cms/cms-pages-page"));
const CmsPageEditorPage = lazy(() => import("@/features/admin/cms/cms-page-editor-page"));
const ClientSiteContentEditorPage = lazy(
  () => import("@/features/admin/cms/client-site-content-editor-page"),
);
const CmsGalleriesPage = lazy(() => import("@/features/admin/cms/cms-galleries-page"));
const CmsGalleryEditorPage = lazy(() => import("@/features/admin/cms/cms-gallery-editor-page"));
const CmsMediaPage = lazy(() => import("@/features/admin/cms/cms-media-page"));
const CmsSeoPage = lazy(() => import("@/features/admin/cms/cms-seo-page"));
const CmsTeamPage = lazy(() => import("@/features/admin/cms/cms-team-page"));
const CmsSectionsPage = lazy(() => import("@/features/admin/cms/cms-sections-page"));
const CmsSectionEditorPage = lazy(() => import("@/features/admin/cms/cms-section-editor-page"));
const CmsMenusPage = lazy(() => import("@/features/admin/cms/cms-menus-page"));
const CmsSidebarsPage = lazy(() => import("@/features/admin/cms/cms-sidebars-page"));
const SystemBackupsPage = lazy(() => import("@/features/admin/system-backups-page"));
const ClientStackOnboardingPage = lazy(
  () => import("@/features/admin/client-stack-onboarding-page"),
);

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" data-testid="page-loader">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function AdminIndexRoute() {
  const { user, hasAdminPermission } = useAuth();
  const { data: siteFeaturesData } = useQuery<SiteFeatures>({
    queryKey: ["/api/site-config"],
    staleTime: STALE_TIMES.LIVE,
  });
  const siteFeatures = siteFeaturesData ?? DEFAULT_SITE_FEATURES;

  if (!user) {
    return <Redirect to="/admin/login" replace />;
  }

  if (user.role === "admin") {
    return <AdminDashboardPage />;
  }

  if (user.role === "editor") {
    if (hasAdminPermission("content") && siteFeatures.cmsEnabled) {
      return <Redirect to="/admin/cms" replace />;
    }
    if (hasAdminPermission("content") && siteFeatures.eventsEnabled) {
      return <Redirect to="/admin/events" replace />;
    }
    if (hasAdminPermission("content") && siteFeatures.blogEnabled) {
      return <Redirect to="/admin/cms/blog" replace />;
    }
    if (hasAdminPermission("content")) {
      return <Redirect to="/admin/forms" replace />;
    }
    if (hasAdminPermission("crm")) {
      return <Redirect to="/admin/crm" replace />;
    }
    if (hasAdminPermission("design")) {
      return <Redirect to="/admin/design/branding" replace />;
    }
  }

  return <NotFound />;
}

function CmsDynamicPageRoute({ enabled }: { enabled: boolean }) {
  const [location] = useLocation();
  const slug = location.replace(/^\/+|\/+$/g, "");

  if (!slug || slug.includes("/")) {
    return <NotFound />;
  }

  if (!enabled) {
    return <NotFound />;
  }

  return (
    <CmsHybridPage slug={slug} fallback={<PublicGalleryPage slug={slug} />} enabled={enabled} />
  );
}

function Router() {
  const { data: siteFeaturesData } = useQuery<SiteFeatures>({
    queryKey: ["/api/site-config"],
    staleTime: STALE_TIMES.LIVE,
  });
  const siteFeatures = siteFeaturesData ?? DEFAULT_SITE_FEATURES;

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/admin/login" component={LoginPage} />
        <Route path="/admin/forgot-password" component={ForgotPasswordPage} />
        <Route path="/admin/reset-password" component={ResetPasswordPage} />
        <Route path="/admin/setup" component={AdminSetupPage} />
        <Route path="/admin">
          <ProtectedRoute roles={["admin", "editor"]}>
            <AdminIndexRoute />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/users">
          <ProtectedRoute roles={["admin"]}>
            <AdminUsersPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/events/new">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.eventsEnabled ? <AdminEventsPage initialCreate /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/events/settings">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.eventsEnabled ? <AdminEventSettingsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/events">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.eventsEnabled ? <AdminEventsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/careers/new">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.careersEnabled ? <AdminCareersPage initialCreate /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/careers/settings">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.careersEnabled ? (
              <AdminCareersPage initialTab="settings" />
            ) : (
              <NotFound />
            )}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/careers">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.careersEnabled ? <AdminCareersPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/forms">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            <AdminFormsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/crm/settings">
          <ProtectedRoute roles={["admin"]}>
            {siteFeatures.crmEnabled ? <AdminCrmSettingsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/crm/clients">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["crm"]}>
            {siteFeatures.crmEnabled ? <AdminCrmClientsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/crm">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["crm"]}>
            {siteFeatures.crmEnabled ? <AdminCrmPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/blog">
          <Redirect to="/admin/cms/blog" />
        </Route>
        <Route path="/admin/docs/:slug">
          <ProtectedRoute roles={["admin"]}>
            <DocsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/docs">
          <ProtectedRoute roles={["admin"]}>
            <DocsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/settings/:tab">
          <ProtectedRoute roles={["admin"]}>
            <AdminSettingsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/settings">
          <Redirect to="/admin/settings/integrations" />
        </Route>
        <Route path="/admin/design/branding">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            <AdminDesignPage initialSubview="branding" />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/design">
          <Redirect to="/admin/design/branding" />
        </Route>
        <Route path="/admin/design/colors">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            <AdminDesignPage initialSubview="colors" />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/design/social-media">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            <AdminDesignPage initialSubview="social-media" />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/design/typography">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            <AdminDesignPage initialSubview="typography" />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/system/backups">
          <ProtectedRoute roles={["admin"]}>
            <SystemBackupsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/client-stack-onboarding">
          <ProtectedRoute roles={["admin"]}>
            <ClientStackOnboardingPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/website/:routeId/:componentKey">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <ClientSiteContentEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/website">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            <ClientSitePagesPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsOverviewPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/pages/new">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsPageEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/pages/:id">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsPageEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/pages">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsPagesPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/media">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsMediaPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/team">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsTeamPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/galleries/new">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsGalleryEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/galleries/:id">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsGalleryEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/galleries">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsGalleriesPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/blog/new">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.blogEnabled ? <CmsBlogEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/blog/settings">
          <Redirect to="/admin/cms/blog?tab=settings" />
        </Route>
        <Route path="/admin/cms/blog/comments">
          <Redirect to="/admin/cms/blog?tab=comments" />
        </Route>
        <Route path="/admin/cms/blog/:id">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.blogEnabled ? <CmsBlogEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/blog">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.blogEnabled ? <CmsBlogPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sections/new">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content", "design"]}>
            {siteFeatures.cmsEnabled ? <CmsSectionEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sections/:id">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content", "design"]}>
            {siteFeatures.cmsEnabled ? <CmsSectionEditorPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sections">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content", "design"]}>
            {siteFeatures.cmsEnabled ? <CmsSectionsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/seo">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["content"]}>
            {siteFeatures.cmsEnabled ? <CmsSeoPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/menus">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            {siteFeatures.cmsEnabled ? <CmsMenusPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route path="/admin/cms/sidebars">
          <ProtectedRoute roles={["admin", "editor"]} adminPermissions={["design"]}>
            {siteFeatures.cmsEnabled ? <CmsSidebarsPage /> : <NotFound />}
          </ProtectedRoute>
        </Route>
        <Route
          path="/:slug"
          component={() => <CmsDynamicPageRoute enabled={siteFeatures.cmsEnabled} />}
        />

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function SetupGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: setupStatus, isLoading } = useQuery<{ needsSetup: boolean }>({
    queryKey: ["/api/setup/status"],
    staleTime: STALE_TIMES.LIVE,
    retry: 2,
  });

  const needsSetup = setupStatus?.needsSetup === true;

  useEffect(() => {
    if (needsSetup && location !== "/admin/setup") {
      setLocation("/setup");
    }
  }, [needsSetup, location, setLocation]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        data-testid="setup-guard-loading"
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}

function RouteScrollManager() {
  const [location] = useLocation();
  const lastPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pathname = location.split(/[?#]/)[0] || "/";
    const lastPathname = lastPathnameRef.current;
    lastPathnameRef.current = pathname;

    if (lastPathname === null || lastPathname === pathname) return;

    const scrollToTarget = () => {
      const hash = window.location.hash;
      if (hash) {
        const target = document.getElementById(hash.slice(1));
        if (target) {
          target.scrollIntoView({ block: "start" });
          return;
        }
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToTarget);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location]);

  return null;
}

function RouteAdminModeManager() {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const pathname = location.split(/[?#]/)[0] || "/";
    const isAdminRoute = pathname.startsWith("/admin");
    const root = document.documentElement;

    root.classList.toggle("admin-mode", isAdminRoute);

    return () => {
      root.classList.remove("admin-mode");
    };
  }, [location]);

  return null;
}

function RuntimeIntegrationsManager() {
  const [location] = useLocation();

  const loadRuntimeIntegrations = () => {
    void loadGa4IfConsented().catch(() => undefined);
    void loadMarketingPixelsIfConsented().catch(() => undefined);
  };

  useEffect(() => {
    loadRuntimeIntegrations();
  }, [location]);

  useEffect(() => {
    return subscribeToCookieConsent(() => {
      loadRuntimeIntegrations();
    });
  }, []);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <ThemeModeProvider>
          <TooltipProvider>
            <Toaster />
            <SetupGuard>
              <RouteAdminModeManager />
              <RouteScrollManager />
              <RuntimeIntegrationsManager />
              <FrontendEditProvider>
                <Router />
              </FrontendEditProvider>
              <CookieConsentBanner />
            </SetupGuard>
          </TooltipProvider>
        </ThemeModeProvider>
      </BrandingProvider>
    </QueryClientProvider>
  );
}

export default App;
