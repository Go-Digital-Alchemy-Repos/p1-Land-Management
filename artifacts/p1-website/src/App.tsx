import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import About from "@/pages/about";
import Contact from "@/pages/contact";

import ServicesIndex from "@/pages/services/index";
import CommercialPropertyManagement from "@/pages/services/commercial-property-management";
import IndustrialAgricultural from "@/pages/services/industrial-agricultural";
import LandClearing from "@/pages/services/land-clearing";
import GradingSitePreparation from "@/pages/services/grading-site-preparation";
import Drainage from "@/pages/services/drainage";
import TurfInstallationSeeding from "@/pages/services/turf-installation-seeding";
import TreeServices from "@/pages/services/tree-services";
import PondWaterwayManagement from "@/pages/services/pond-waterway-management";
import PropertyReconstruction from "@/pages/services/property-reconstruction";

import ServiceAreasIndex from "@/pages/service-areas/index";
import UpstateSouthCarolina from "@/pages/service-areas/upstate-south-carolina";
import CharlotteNorthCarolina from "@/pages/service-areas/charlotte-north-carolina";
import GreenvilleSc from "@/pages/service-areas/greenville-sc";
import SpartanburgSc from "@/pages/service-areas/spartanburg-sc";
import AndersonSc from "@/pages/service-areas/anderson-sc";
import CharlotteNc from "@/pages/service-areas/charlotte-nc";
import ConcordNc from "@/pages/service-areas/concord-nc";
import MooresvilleLakeNormanNc from "@/pages/service-areas/mooresville-lake-norman-nc";
import GastoniaNc from "@/pages/service-areas/gastonia-nc";

import BlogIndex from "@/pages/blog/index";
import BlogLandClearingCost from "@/pages/blog/land-clearing-cost-per-acre-south-carolina";
import BlogRetentionPond from "@/pages/blog/how-to-manage-retention-pond-south-carolina";
import BlogBestGrass from "@/pages/blog/best-grass-large-acreage-carolinas";
import BlogDrainageSigns from "@/pages/blog/signs-property-drainage-problem";
import BlogPreparingLand from "@/pages/blog/preparing-land-agricultural-use-carolinas";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />

      {/* Services */}
      <Route path="/services" component={ServicesIndex} />
      <Route path="/services/commercial-property-management" component={CommercialPropertyManagement} />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
