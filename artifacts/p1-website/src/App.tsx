import { trackAcquisition } from "@/lib/acquisition";
import { Component, type ReactNode, lazy, Suspense, useEffect, type ComponentType } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="mx-auto max-w-2xl p-8" role="alert">
      <h1 className="text-3xl">This page couldn’t load</h1>
      <p className="my-4">Please reload the page to try again.</p>
      <button className="rounded bg-primary px-5 py-3 font-bold text-primary-foreground" onClick={() => window.location.reload()}>Reload page</button>
    </main>;
    return this.props.children;
  }
}

// Vite evaluates both import.glob calls before it removes an SSR branch. One
// glob with an SSR-dependent eager flag preserves synchronous prerendering on
// the server while allowing every browser route to remain a separate chunk.
type PageModule = { default: ComponentType };
type PageLoader = () => Promise<PageModule>;
const pageModules = import.meta.glob<PageModule>("./pages/**/*.tsx", {
  // Vite replaces this with a literal before processing the glob. Its public
  // type overloads model only literal source syntax, so keep that limitation
  // at this boundary rather than widening the page-loader contract.
  eager: import.meta.env.SSR as never,
}) as Record<string, PageModule | PageLoader>;
function page(path: string): ComponentType {
  const module = pageModules[path];
  if (!module) throw new Error(`Missing public page module: ${path}`);
  return import.meta.env.SSR
    ? (module as PageModule).default
    : lazy(module as PageLoader);
}

const NotFound = page("./pages/not-found.tsx");

const Home = page("./pages/home.tsx");
const About = page("./pages/about.tsx");
const Commercial = page("./pages/commercial.tsx");
const Contact = page("./pages/contact.tsx");
const Gallery = page("./pages/gallery.tsx");

const ServicesIndex = page("./pages/services/index.tsx");
const CommercialLandscaping = page("./pages/services/commercial-landscaping.tsx");
const IndustrialAgricultural = page("./pages/services/industrial-agricultural.tsx");
const LandClearing = page("./pages/services/land-clearing.tsx");
const GradingSitePreparation = page("./pages/services/grading-site-preparation.tsx");
const Drainage = page("./pages/services/drainage.tsx");
const TurfInstallationSeeding = page("./pages/services/turf-installation-seeding.tsx");
const TreeServices = page("./pages/services/tree-services.tsx");
const PondWaterwayManagement = page("./pages/services/pond-waterway-management.tsx");
const PropertyReconstruction = page("./pages/services/property-reconstruction.tsx");

const ServiceAreasIndex = page("./pages/service-areas/index.tsx");
const UpstateSouthCarolina = page("./pages/service-areas/upstate-south-carolina.tsx");
const CharlotteNorthCarolina = page("./pages/service-areas/charlotte-north-carolina.tsx");
const GreenvilleSc = page("./pages/service-areas/greenville-sc.tsx");
const SpartanburgSc = page("./pages/service-areas/spartanburg-sc.tsx");
const AndersonSc = page("./pages/service-areas/anderson-sc.tsx");
const CharlotteNc = page("./pages/service-areas/charlotte-nc.tsx");
const ConcordNc = page("./pages/service-areas/concord-nc.tsx");
const MooresvilleLakeNormanNc = page("./pages/service-areas/mooresville-lake-norman-nc.tsx");
const GastoniaNc = page("./pages/service-areas/gastonia-nc.tsx");
const UnionCountyNc = page("./pages/service-areas/union-county-nc.tsx");
const LancasterCountySc = page("./pages/service-areas/lancaster-county-sc.tsx");
const YorkCountySc = page("./pages/service-areas/york-county-sc.tsx");

const BlogIndex = page("./pages/blog/index.tsx");
const BlogLandClearingCost = page("./pages/blog/land-clearing-cost-per-acre-south-carolina.tsx");
const BlogRetentionPond = page("./pages/blog/how-to-manage-retention-pond-south-carolina.tsx");
const BlogBestGrass = page("./pages/blog/best-grass-large-acreage-carolinas.tsx");
const BlogDrainageSigns = page("./pages/blog/signs-property-drainage-problem.tsx");
const BlogPreparingLand = page("./pages/blog/preparing-land-agricultural-use-carolinas.tsx");


function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/commercial" component={Commercial} />
      <Route path="/contact" component={Contact} />
      <Route path="/gallery" component={Gallery} />

      {/* Services */}
      <Route path="/services" component={ServicesIndex} />
      <Route path="/services/commercial-landscaping" component={CommercialLandscaping} />
      <Route path="/services/industrial-agricultural" component={IndustrialAgricultural} />
      <Route path="/services/land-clearing" component={LandClearing} />
      <Route path="/services/grading-site-preparation" component={GradingSitePreparation} />
      <Route path="/services/drainage" component={Drainage} />
      <Route path="/services/turf-installation-seeding" component={TurfInstallationSeeding} />
      <Route path="/services/tree-services" component={TreeServices} />
      <Route path="/services/pond-waterway-management" component={PondWaterwayManagement} />
      <Route path="/services/property-reconstruction" component={PropertyReconstruction} />

      {/* Service Areas */}
      <Route path="/service-areas" component={ServiceAreasIndex} />
      <Route path="/service-areas/upstate-south-carolina" component={UpstateSouthCarolina} />
      <Route path="/service-areas/charlotte-north-carolina" component={CharlotteNorthCarolina} />
      <Route path="/service-areas/greenville-sc" component={GreenvilleSc} />
      <Route path="/service-areas/spartanburg-sc" component={SpartanburgSc} />
      <Route path="/service-areas/anderson-sc" component={AndersonSc} />
      <Route path="/service-areas/charlotte-nc" component={CharlotteNc} />
      <Route path="/service-areas/concord-nc" component={ConcordNc} />
      <Route path="/service-areas/mooresville-lake-norman-nc" component={MooresvilleLakeNormanNc} />
      <Route path="/service-areas/gastonia-nc" component={GastoniaNc} />
      <Route path="/service-areas/union-county-nc" component={UnionCountyNc} />
      <Route path="/service-areas/lancaster-county-sc" component={LancasterCountySc} />
      <Route path="/service-areas/york-county-sc" component={YorkCountySc} />

      {/* Blog */}
      <Route path="/blog" component={BlogIndex} />
      <Route path="/blog/land-clearing-cost-per-acre-south-carolina" component={BlogLandClearingCost} />
      <Route path="/blog/how-to-manage-retention-pond-south-carolina" component={BlogRetentionPond} />
      <Route path="/blog/best-grass-large-acreage-carolinas" component={BlogBestGrass} />
      <Route path="/blog/signs-property-drainage-problem" component={BlogDrainageSigns} />
      <Route path="/blog/preparing-land-agricultural-use-carolinas" component={BlogPreparingLand} />

      <Route component={NotFound} />
    </Switch>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackAcquisition("page_view");
  }, [location]);
  useEffect(() => {
    const trackLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      const href = link?.getAttribute("href") || "";
      if (href.startsWith("tel:")) trackAcquisition("call_click");
      else if (href.startsWith("mailto:")) trackAcquisition("email_click");
      else if (href === "/contact") trackAcquisition("estimate_click");
    };
    document.addEventListener("click", trackLink);
    return () => document.removeEventListener("click", trackLink);
  }, []);
  return null;
}

function App({ ssrPath }: { ssrPath?: string }) {
  return (
        <WouterRouter
          base={import.meta.env.BASE_URL.replace(/\/$/, "")}
          ssrPath={ssrPath}
        >
          <ScrollToTop />
          <RouteErrorBoundary><Suspense fallback={<main className="p-12" role="status">Loading page…</main>}><Router /></Suspense></RouteErrorBoundary>
        </WouterRouter>
  );
}

export default App;
