import { trackAcquisition } from "@/lib/acquisition";
import {
  Component,
  type ComponentType,
  type ReactNode,
  Suspense,
  useEffect,
} from "react";
import { Router as WouterRouter, useLocation } from "wouter";

class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="mx-auto max-w-2xl p-8" role="alert">
          <h1 className="text-3xl">This page couldn’t load</h1>
          <p className="my-4">Please reload the page to try again.</p>
          <button
            className="rounded bg-primary px-5 py-3 font-bold text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </main>
      );
    return this.props.children;
  }
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackAcquisition("page_view");
  }, [location]);
  useEffect(() => {
    const trackLink = (event: MouseEvent) => {
      const link =
        event.target instanceof Element ? event.target.closest("a") : null;
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

export function AppShell({
  Routes,
  ssrPath,
}: {
  Routes: ComponentType;
  ssrPath?: string;
}) {
  return (
    <WouterRouter
      base={import.meta.env.BASE_URL.replace(/\/$/, "")}
      ssrPath={ssrPath}
    >
      <ScrollToTop />
      <RouteErrorBoundary>
        <Suspense
          fallback={
            <main className="p-12" role="status">
              Loading page…
            </main>
          }
        >
          <Routes />
        </Suspense>
      </RouteErrorBoundary>
    </WouterRouter>
  );
}
