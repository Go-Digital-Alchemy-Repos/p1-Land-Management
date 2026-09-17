import type { ComponentType } from "react";
import { AppShell } from "./app-shell";
import { createSiteRoutes, type PageModule } from "./app-routes";

// The dedicated server entry uses a literal eager glob. Vite can therefore
// produce synchronous prerendered HTML without making client routes eager.
const pageModules = import.meta.glob<PageModule>("./pages/**/*.tsx", {
  eager: true,
}) as Record<string, PageModule>;
const SiteRoutes = createSiteRoutes((path) => {
  const module = pageModules[path];
  if (!module) throw new Error(`Missing public page module: ${path}`);
  return module.default as ComponentType;
});

export default function ServerApp({ ssrPath }: { ssrPath?: string }) {
  return <AppShell Routes={SiteRoutes} ssrPath={ssrPath} />;
}
