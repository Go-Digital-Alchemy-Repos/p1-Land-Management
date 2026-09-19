import {
  snapshotForRoute,
  retainPublishedIdentity,
} from "./cms-route-snapshot";
import { useEffect, useState } from "react";
import { useBrowserLocation } from "wouter/use-browser-location";
import App from "../App";
import { CmsProvider, type CmsSnapshot } from "./cms";

export function ClientCmsApp({ initial }: { initial: CmsSnapshot }) {
  const [path] = useBrowserLocation();
  const [snapshot, setSnapshot] = useState(initial);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setFailedPath(null);
    const timeout = setTimeout(() => {
      setFailedPath(path);
      controller.abort();
    }, 6000);
    fetch(`/api/p1/page-content?path=${encodeURIComponent(path)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (
          !controller.signal.aborted &&
          data?.route === path &&
          data?.content &&
          data?.global
        )
          setSnapshot((previous) => retainPublishedIdentity(previous, data));
        else if (!controller.signal.aborted)
          throw new Error("Page snapshot unavailable");
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailedPath(path);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [path]);
  const current = snapshotForRoute(snapshot, path);
  if (failedPath === path && path.startsWith("/blog/") && !current.blog)
    return (
      <main className="p-12" role="alert">
        This article could not load.{" "}
        <button onClick={() => window.location.reload()}>Reload page</button>
      </main>
    );
  return (
    <CmsProvider snapshot={current}>
      <App />
    </CmsProvider>
  );
}
