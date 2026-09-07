import { cmsValue, fieldId, safeValue, useCms } from "@/lib/cms";
import { useEffect } from "react";
import { SITE_URL, BUSINESS_NAME } from "@/lib/site";
import { collectHead } from "@/lib/ssr-head";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function SEO(props: SEOProps) {
  const context = useCms();
  const title = cmsValue(context, props.title, "text", false, "seoTitle");
  const description = cmsValue(context, props.description, "textarea", false, "seoDescription");
  const image = cmsValue(context, props.image || "/opengraph.jpg", "image", false, "seoImage");
  const noindex = props.noindex;
  // Reuse editable visible text in structured data without exposing schema internals as fields.
  const translate = (value: unknown): unknown => {
    if (typeof value === "string") {
      const key = fieldId(value, "text");
      const replacement = context.snapshot.content[key] ?? context.snapshot.global[key];
      return safeValue(replacement, "text") ? replacement : value;
    }
    if (Array.isArray(value)) return value.map(translate);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translate(item)]));
    return value;
  };
  const jsonLd = translate(props.jsonLd) as SEOProps["jsonLd"];
  if (import.meta.env.SSR) {
    collectHead({ title, description, image, jsonLd, noindex });
  }

  useEffect(() => {
    document.title = title;

    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex, follow" : "index, follow"
    );

    const url = SITE_URL + (window.location.pathname.replace(/\.html$/, "").replace(/\/+$/, "") || "/");
    const img = image
      ? image.startsWith("http")
        ? image
        : SITE_URL + image
      : `${SITE_URL}/opengraph.jpg`;

    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:locale", "en_US");
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", img);
    upsertMeta("property", "og:site_name", BUSINESS_NAME);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", img);

    // Canonical URL
    let canonical = document.head.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // Per-page JSON-LD structured data (managed, replaced on each navigation)
    document
      .head
      .querySelectorAll("script[data-seo-jsonld]")
      .forEach((n) => n.remove());
    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach((obj) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-seo-jsonld", "");
        script.textContent = JSON.stringify(obj);
        document.head.appendChild(script);
      });
    }
    return () => { document.head.querySelectorAll("script[data-seo-jsonld]").forEach(node => node.remove()); };
  }, [title, description, image, noindex, JSON.stringify(jsonLd)]);

  return null;
}
