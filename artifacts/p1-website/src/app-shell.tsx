import { recoverStaleRoute } from "@/lib/route-recovery";
import { createGoogleAnalytics } from "@/lib/google-analytics";
import { trackAcquisition } from "@/lib/acquisition";
import {
  Component,
  type ComponentType,
  type ReactNode,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { Router as WouterRouter, useLocation, useSearch } from "wouter";
import { checkClientRedirect } from "@/lib/website-redirects";

const trackGooglePage = createGoogleAnalytics();

class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    recoverStaleRoute(error, {
      storage: { getItem: (key) => window.sessionStorage.getItem(key), setItem: (key, value) => window.sessionStorage.setItem(key, value) },
      reload: () => window.location.reload(),
      now: Date.now,
    });
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
    // Let in-page links retain their target instead of overriding the anchor scroll.
    if (!window.location.hash) window.scrollTo(0, 0);
    trackAcquisition("page_view");
    try {
      void trackGooglePage().catch(() => { /* Analytics must not break navigation. */ });
    } catch {
      /* Optional analytics must not break navigation. */
    }
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

/** Initial HTML already passed the server redirect check; guard subsequent SPA routes. */
function WebsiteRedirectBoundary({ children }: { children: ReactNode }) {
  const [pathname] = useLocation();
  const search = useSearch();
  const first = useRef(true);
  const [readyPath, setReadyPath] = useState(pathname);
  const lastFocusedPath = useRef(pathname);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    let active = true;
    // Use the actual browser query verbatim (Wouter omits the leading question mark).
    void checkClientRedirect(
      pathname,
      window.location.search,
      controller.signal,
    )
      .then((destination) => {
        if (!active) return;
        if (destination) {
          window.location.replace(destination);
        } else {
          setReadyPath(pathname);
        }
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [pathname, search]);
  useEffect(() => {
    if (readyPath !== pathname || lastFocusedPath.current === pathname) return;
    lastFocusedPath.current = pathname;
    // Hash navigation and open dialogs manage their own focus.
    if (window.location.hash || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

    let observer: MutationObserver | undefined;
    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>("#main-content h1");
      if (!heading) return false;
      // Avoid taking focus back after someone has already entered the new page.
      if (document.activeElement?.closest("#main-content")) return true;
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      return true;
    };
    const frame = requestAnimationFrame(() => {
      if (focusHeading()) return;
      // Lazy routes can show a loading fallback before their heading mounts.
      observer = new MutationObserver(() => {
        if (focusHeading()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
    const timeout = window.setTimeout(() => observer?.disconnect(), 5000);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      observer?.disconnect();
    };
  }, [pathname, readyPath]);
  return readyPath === pathname ? (
    children
  ) : (
    <main className="p-12" role="status">
      Loading page…
    </main>
  );
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
      <WebsiteRedirectBoundary>
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
      </WebsiteRedirectBoundary>
    </WouterRouter>
  );
}
