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
