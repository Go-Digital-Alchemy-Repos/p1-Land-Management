import { useEffect, useState } from "react";
import { useBrowserLocation } from "wouter/use-browser-location";
import App from "../App";
import { CmsProvider, type CmsSnapshot } from "./cms";

export function ClientCmsApp({ initial }: { initial: CmsSnapshot }) {
  const [path] = useBrowserLocation();
  const [snapshot, setSnapshot] = useState(initial);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/p1/page-content?path=${encodeURIComponent(path)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.route === path && data?.content && data?.global)
          setSnapshot(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [path]);
  const current =
    snapshot.route === path
      ? snapshot
      : { route: path, content: {}, global: snapshot.global };
  return (
    <CmsProvider snapshot={current}>
      <App />
    </CmsProvider>
  );
}
