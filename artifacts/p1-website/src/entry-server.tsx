import { renderToString } from "react-dom/server";
import App from "./App";
import {
  startHeadCollection,
  finishHeadCollection,
  type CollectedHead,
} from "@/lib/ssr-head";

export interface RenderResult {
  html: string;
  head: CollectedHead | null;
}

export function render(path: string): RenderResult {
  startHeadCollection();
  const html = renderToString(<App ssrPath={path} />);
  const head = finishHeadCollection();
  return { html, head };
}
