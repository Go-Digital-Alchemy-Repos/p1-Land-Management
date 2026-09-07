import { useEffect } from "react";

interface SeoOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
  ogType?: string;
  twitterCard?: "summary" | "summary_large_image";
  extraMeta?: Array<{ name: string; content: string; property?: boolean }>;
}

function setMeta(name: string, content: string, property = false) {
  const attr = property ? "property" : "name";
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMeta(name: string, property = false) {
  const attr = property ? "property" : "name";
  const el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (el) el.remove();
}

export function useSeo({
  title,
  description,
  ogImage,
  canonical,
  noindex,
  ogType,
  twitterCard = "summary_large_image",
  extraMeta = [],
}: SeoOptions) {
  useEffect(() => {
    const prevTitle = document.title;

    if (title) document.title = title;

    if (description) {
      setMeta("description", description);
      setMeta("og:description", description, true);
    }

    if (title) {
      setMeta("og:title", title, true);
      setMeta("twitter:title", title);
    }

    if (description) setMeta("twitter:description", description);
    if (ogType) setMeta("og:type", ogType, true);
    setMeta("twitter:card", twitterCard);

    if (ogImage) {
      setMeta("og:image", ogImage, true);
      setMeta("twitter:image", ogImage);
    } else {
      removeMeta("og:image", true);
      removeMeta("twitter:image");
    }

    if (canonical) {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    } else {
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.remove();
    }

    if (noindex) {
      setMeta("robots", "noindex,nofollow");
    } else {
      removeMeta("robots");
    }

    for (const meta of extraMeta) {
      setMeta(meta.name, meta.content, meta.property);
    }

    return () => {
      document.title = prevTitle;
      if (ogType) removeMeta("og:type", true);
      for (const meta of extraMeta) {
        removeMeta(meta.name, meta.property);
      }
    };
  }, [
    title,
    description,
    ogImage,
    canonical,
    noindex,
    ogType,
    twitterCard,
    JSON.stringify(extraMeta),
  ]);
}
