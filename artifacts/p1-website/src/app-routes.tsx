import type { ComponentType } from "react";
import { Route, Switch } from "wouter";

export type PageModule = { default: ComponentType };
export type PageLoader = () => Promise<PageModule>;
export type ResolvePage = (path: string) => ComponentType;

// Route declarations stay in one shared module so the browser's lazy loader
// and the server's eager prerenderer cannot drift apart.
export function createSiteRoutes(page: ResolvePage): ComponentType {
  const NotFound = page("./pages/not-found.tsx"),
    Home = page("./pages/home.tsx"),
    About = page("./pages/about.tsx"),
    Commercial = page("./pages/commercial.tsx"),
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
    CharlotteNc = page("./pages/service-areas/charlotte-nc.tsx"),
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
  return function SiteRoutes() {
    return (
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/commercial" component={Commercial} />
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
        <Route path="/service-areas/charlotte-nc" component={CharlotteNc} />
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
        <Route component={NotFound} />
      </Switch>
    );
  };
}
