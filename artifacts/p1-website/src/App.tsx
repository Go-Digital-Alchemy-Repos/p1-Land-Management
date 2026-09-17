import { lazy, type ComponentType } from "react";
import { AppShell } from "./app-shell";
import {
  createSiteRoutes,
  type PageLoader,
  type PageModule,
} from "./app-routes";

// Browser pages remain lazy so route code stays out of the initial bundle.
const pageModules = import.meta.glob<PageModule>("./pages/**/*.tsx") as Record<
  string,
  PageLoader
>;
const SiteRoutes = createSiteRoutes((path) => {
  const loader = pageModules[path];
  if (!loader) throw new Error(`Missing public page module: ${path}`);
  return lazy(loader) as ComponentType;
});

export default function App({ ssrPath }: { ssrPath?: string }) {
  return <AppShell Routes={SiteRoutes} ssrPath={ssrPath} />;
}
