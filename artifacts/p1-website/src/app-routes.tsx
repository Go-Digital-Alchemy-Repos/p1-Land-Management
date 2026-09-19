import { useCms } from "./lib/cms";
import {
  staticBlogSlugs,
  staticBlogDisposition,
} from "./lib/blog-route-ownership";
import type { ComponentType } from "react";
import { Route, Switch } from "wouter";

export type PageModule = { default: ComponentType };
export type PageLoader = () => Promise<PageModule>;
export type ResolvePage = (path: string) => ComponentType;

// Route declarations stay in one shared module so the browser's lazy loader
// and the server's eager prerenderer cannot drift apart.
export function createSiteRoutes(page: ResolvePage): ComponentType {
  const PublishedBlog = page("./pages/blog/published.tsx");
  const originalPage = page;
  page = (path) => {
    const Original = originalPage(path);
    const slug = path.replace("./pages/blog/", "").replace(/\.tsx$/, "");
    if (!staticBlogSlugs.has(slug)) return Original;
    return function StaticBlogDispatch() {
      const { snapshot } = useCms();
      const mode = staticBlogDisposition(slug, snapshot.blog?.staticRoutes);
      return mode === "unowned" ? <Original /> : <PublishedBlog />;
    };
  };
  const NotFound = page("./pages/not-found.tsx"),
    Home = page("./pages/home.tsx"),
    About = page("./pages/about.tsx"),
    Commercial = page("./pages/commercial.tsx"),
    CommercialSnowIceManagement = page(
      "./pages/commercial-snow-ice-management.tsx",
    ),
    DataCentersSecureFacilities = page(
      "./pages/commercial/data-centers-secure-facilities.tsx",
    ),
    Contact = page("./pages/contact.tsx"),
    Gallery = page("./pages/gallery.tsx");
  const ServicesIndex = page("./pages/services/index.tsx"),
    CommercialLandscaping = page("./pages/services/commercial-landscaping.tsx"),
    IndustrialAgricultural = page(
      "./pages/services/industrial-agricultural.tsx",
    ),
    LandClearing = page("./pages/services/land-clearing.tsx"),
    GradingSitePreparation = page(
      "./pages/services/grading-site-preparation.tsx",
    ),
    Drainage = page("./pages/services/drainage.tsx"),
    TurfInstallationSeeding = page(
      "./pages/services/turf-installation-seeding.tsx",
    ),
    TreeServices = page("./pages/services/tree-services.tsx"),
    PondWaterwayManagement = page(
      "./pages/services/pond-waterway-management.tsx",
    ),
    PropertyReconstruction = page(
      "./pages/services/property-reconstruction.tsx",
    );
  const ServiceAreasIndex = page("./pages/service-areas/index.tsx"),
    UpstateSouthCarolina = page(
      "./pages/service-areas/upstate-south-carolina.tsx",
    ),
    CharlotteNorthCarolina = page(
      "./pages/service-areas/charlotte-north-carolina.tsx",
    ),
    GreenvilleSc = page("./pages/service-areas/greenville-sc.tsx"),
    SpartanburgSc = page("./pages/service-areas/spartanburg-sc.tsx"),
    AndersonSc = page("./pages/service-areas/anderson-sc.tsx"),
    ConcordNc = page("./pages/service-areas/concord-nc.tsx"),
    MooresvilleLakeNormanNc = page(
      "./pages/service-areas/mooresville-lake-norman-nc.tsx",
    ),
    GastoniaNc = page("./pages/service-areas/gastonia-nc.tsx"),
    UnionCountyNc = page("./pages/service-areas/union-county-nc.tsx"),
    LancasterCountySc = page("./pages/service-areas/lancaster-county-sc.tsx"),
    YorkCountySc = page("./pages/service-areas/york-county-sc.tsx");
  const BlogIndex = page("./pages/blog/index.tsx"),
    BlogLandClearingCost = page(
      "./pages/blog/land-clearing-cost-per-acre-south-carolina.tsx",
    ),
    BlogRetentionPond = page(
      "./pages/blog/how-to-manage-retention-pond-south-carolina.tsx",
    ),
    BlogBestGrass = page("./pages/blog/best-grass-large-acreage-carolinas.tsx"),
    BlogDrainageSigns = page(
      "./pages/blog/signs-property-drainage-problem.tsx",
    ),
    BlogPreparingLand = page(
      "./pages/blog/preparing-land-agricultural-use-carolinas.tsx",
    );
  const Location0 = page("./pages/service-areas/greer-sc.tsx");
  const Location1 = page("./pages/service-areas/simpsonville-sc.tsx");
  const Location2 = page("./pages/service-areas/easley-sc.tsx");
  const Location3 = page("./pages/service-areas/gaffney-sc.tsx");
  const Location4 = page("./pages/service-areas/duncan-sc.tsx");
  const Location5 = page("./pages/service-areas/inman-sc.tsx");
  const Location6 = page("./pages/service-areas/boiling-springs-sc.tsx");
  const Location7 = page("./pages/service-areas/huntersville-nc.tsx");
  const Location8 = page("./pages/service-areas/matthews-nc.tsx");
  const Location9 = page("./pages/service-areas/kannapolis-nc.tsx");
  const Location10 = page("./pages/service-areas/waxhaw-nc.tsx");
  const Location11 = page("./pages/service-areas/fort-mill-sc.tsx");
  const Location12 = page("./pages/service-areas/rock-hill-sc.tsx");
  const Location13 = page("./pages/service-areas/indian-land-sc.tsx");
  const Location14 = page("./pages/service-areas/indian-trail-nc.tsx");
  const Location15 = page("./pages/service-areas/monroe-nc.tsx");
  const Location16 = page("./pages/service-areas/belmont-nc.tsx");
  const Location17 = page("./pages/service-areas/mount-holly-nc.tsx");
  const Location18 = page("./pages/service-areas/cornelius-nc.tsx");
  return function SiteRoutes() {
    return (
      <Switch>
        <Route path="/service-areas/greer-sc" component={Location0} />
        <Route path="/service-areas/simpsonville-sc" component={Location1} />
        <Route path="/service-areas/easley-sc" component={Location2} />
        <Route path="/service-areas/gaffney-sc" component={Location3} />
        <Route path="/service-areas/duncan-sc" component={Location4} />
        <Route path="/service-areas/inman-sc" component={Location5} />
        <Route path="/service-areas/boiling-springs-sc" component={Location6} />
        <Route path="/service-areas/huntersville-nc" component={Location7} />
        <Route path="/service-areas/matthews-nc" component={Location8} />
        <Route path="/service-areas/kannapolis-nc" component={Location9} />
        <Route path="/service-areas/waxhaw-nc" component={Location10} />
        <Route path="/service-areas/fort-mill-sc" component={Location11} />
        <Route path="/service-areas/rock-hill-sc" component={Location12} />
        <Route path="/service-areas/indian-land-sc" component={Location13} />
        <Route path="/service-areas/indian-trail-nc" component={Location14} />
        <Route path="/service-areas/monroe-nc" component={Location15} />
        <Route path="/service-areas/belmont-nc" component={Location16} />
        <Route path="/service-areas/mount-holly-nc" component={Location17} />
        <Route path="/service-areas/cornelius-nc" component={Location18} />

        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/commercial" component={Commercial} />
        <Route
          path="/services/commercial-snow-ice-management"
          component={CommercialSnowIceManagement}
        />
        <Route
          path="/commercial/data-centers-secure-facilities"
          component={DataCentersSecureFacilities}
        />
        <Route path="/contact" component={Contact} />
        <Route path="/gallery" component={Gallery} />
        <Route path="/services" component={ServicesIndex} />
        <Route
          path="/services/commercial-landscaping"
          component={CommercialLandscaping}
        />
        <Route
          path="/services/industrial-agricultural"
          component={IndustrialAgricultural}
        />
        <Route path="/services/land-clearing" component={LandClearing} />
        <Route
          path="/services/grading-site-preparation"
          component={GradingSitePreparation}
        />
        <Route path="/services/drainage" component={Drainage} />
        <Route
          path="/services/turf-installation-seeding"
          component={TurfInstallationSeeding}
        />
        <Route path="/services/tree-services" component={TreeServices} />
        <Route
          path="/services/pond-waterway-management"
          component={PondWaterwayManagement}
        />
        <Route
          path="/services/property-reconstruction"
          component={PropertyReconstruction}
        />
        <Route path="/service-areas" component={ServiceAreasIndex} />
        <Route
          path="/service-areas/upstate-south-carolina"
          component={UpstateSouthCarolina}
        />
        <Route
          path="/service-areas/charlotte-north-carolina"
          component={CharlotteNorthCarolina}
        />
        <Route path="/service-areas/greenville-sc" component={GreenvilleSc} />
        <Route path="/service-areas/spartanburg-sc" component={SpartanburgSc} />
        <Route path="/service-areas/anderson-sc" component={AndersonSc} />
        <Route path="/service-areas/concord-nc" component={ConcordNc} />
        <Route
          path="/service-areas/mooresville-lake-norman-nc"
          component={MooresvilleLakeNormanNc}
        />
        <Route path="/service-areas/gastonia-nc" component={GastoniaNc} />
        <Route
          path="/service-areas/union-county-nc"
          component={UnionCountyNc}
        />
        <Route
          path="/service-areas/lancaster-county-sc"
          component={LancasterCountySc}
        />
        <Route path="/service-areas/york-county-sc" component={YorkCountySc} />
        <Route path="/blog" component={BlogIndex} />
        <Route
          path="/blog/land-clearing-cost-per-acre-south-carolina"
          component={BlogLandClearingCost}
        />
        <Route
          path="/blog/how-to-manage-retention-pond-south-carolina"
          component={BlogRetentionPond}
        />
        <Route
          path="/blog/best-grass-large-acreage-carolinas"
          component={BlogBestGrass}
        />
        <Route
          path="/blog/signs-property-drainage-problem"
          component={BlogDrainageSigns}
        />
        <Route
          path="/blog/preparing-land-agricultural-use-carolinas"
          component={BlogPreparingLand}
        />
        <Route path="/blog/:slug" component={PublishedBlog} />
        <Route component={NotFound} />
      </Switch>
    );
  };
}
