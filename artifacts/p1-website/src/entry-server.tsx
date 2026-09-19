export {
  safePublishedHtml,
  publicBlogListing,
} from "../../../platform/p1-core/shared/public-blog";
import { renderToString } from "react-dom/server";
import { ServerCmsApp } from "./lib/cms-app.server";
import type { CmsSnapshot, CmsCollection } from "./lib/cms";
import {
  startHeadCollection,
  finishHeadCollection,
  type CollectedHead,
} from "@/lib/ssr-head";
export interface RenderResult {
  html: string;
  head: CollectedHead | null;
  fields: CmsCollection;
}
export function render(
  path: string,
  snapshot: CmsSnapshot = { route: path, content: {}, global: {} },
): RenderResult {
  const fields: CmsCollection = { page: {}, global: {} };
  startHeadCollection();
  const html = renderToString(
    <ServerCmsApp path={path} snapshot={snapshot} collect={fields} />,
  );
  return { html, head: finishHeadCollection(), fields };
}

/** Build-time source collection only. HTTP rendering always supplies live ownership. */
export function renderStaticDefaults(path: string): RenderResult {
  return render(path, {
    route: path,
    content: {},
    global: {},
    blog: { revision: null, staticRoutes: [], posts: [], listing: [] },
  });
}
