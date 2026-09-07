import { STALE_TIMES } from "@/lib/queryClient";
import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  DEFAULT_BRANDING_SETTINGS,
  fontFamilyForBrandingOption,
  hexToHslToken,
  type BrandingSettings,
} from "@/lib/branding";
import { normalizeSocialIconStyle } from "@shared/social-media";

const BrandingContext = createContext<BrandingSettings>(DEFAULT_BRANDING_SETTINGS);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data } = useQuery<BrandingSettings>({
    queryKey: ["/api/branding"],
    queryFn: async () => {
      const response = await fetch("/api/branding");
      if (!response.ok) {
        return DEFAULT_BRANDING_SETTINGS;
      }
      const payload = await response.json();
      return {
        frontendLogoUrl: payload?.frontendLogoUrl ?? null,
        faviconUrl: payload?.faviconUrl ?? null,
        companyName: payload?.companyName ?? null,
        companyAddress: payload?.companyAddress ?? null,
        companyPhoneNumbers: payload?.companyPhoneNumbers ?? null,
        companyGoogleBusinessUrl: payload?.companyGoogleBusinessUrl ?? null,
        socialLinks: Array.isArray(payload?.socialLinks) ? payload.socialLinks : [],
        socialIconStyle: normalizeSocialIconStyle(payload?.socialIconStyle),
        bodyFont: payload?.bodyFont ?? null,
        headingFont: payload?.headingFont ?? null,
        primaryColor: payload?.primaryColor ?? null,
        secondaryColor: payload?.secondaryColor ?? null,
        tertiaryColor: payload?.tertiaryColor ?? null,
        quaternaryColor: payload?.quaternaryColor ?? "#A8623A",
        h1Color: payload?.h1Color ?? null,
        h2Color: payload?.h2Color ?? null,
        h3ToH6Color: payload?.h3ToH6Color ?? null,
        bodyTextColor: payload?.bodyTextColor ?? null,
        headingSubtextColor: payload?.headingSubtextColor ?? null,
        supportingCopyColor: payload?.supportingCopyColor ?? null,
        helperTextColor: payload?.helperTextColor ?? null,
        metaTextColor: payload?.metaTextColor ?? null,
        linkColor: payload?.linkColor ?? null,
        linkHoverColor: payload?.linkHoverColor ?? null,
        inverseTextColor: payload?.inverseTextColor ?? null,
        primaryTextColor: payload?.primaryTextColor ?? null,
        secondaryTextColor: payload?.secondaryTextColor ?? null,
        tertiaryTextColor: payload?.tertiaryTextColor ?? null,
      } satisfies BrandingSettings;
    },
    staleTime: STALE_TIMES.LIVE,
  });

  const branding = useMemo(() => data ?? DEFAULT_BRANDING_SETTINGS, [data]);
  const pathname = location.split(/[?#]/)[0] || "/";
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    const root = document.documentElement;
    const bodyFontFamily = fontFamilyForBrandingOption(branding.bodyFont);
    const headingFontFamily = fontFamilyForBrandingOption(branding.headingFont);
    const primaryColor = hexToHslToken(branding.primaryColor);
    const secondaryColor = hexToHslToken(branding.secondaryColor);
    const tertiaryColor = hexToHslToken(branding.tertiaryColor);
    const quaternaryColor = hexToHslToken(branding.quaternaryColor);
    const h1Color = hexToHslToken(branding.h1Color);
    const h2Color = hexToHslToken(branding.h2Color);
    const h3ToH6Color = hexToHslToken(branding.h3ToH6Color);
    const bodyTextColor = hexToHslToken(branding.bodyTextColor);
    const headingSubtextColor = hexToHslToken(branding.headingSubtextColor);
    const supportingCopyColor = hexToHslToken(branding.supportingCopyColor);
    const helperTextColor = hexToHslToken(branding.helperTextColor);
    const metaTextColor = hexToHslToken(branding.metaTextColor);
    const linkColor = hexToHslToken(branding.linkColor);
    const linkHoverColor = hexToHslToken(branding.linkHoverColor);
    const inverseTextColor = hexToHslToken(branding.inverseTextColor);
    const primaryTextColor = hexToHslToken(branding.primaryTextColor);
    const secondaryTextColor = hexToHslToken(branding.secondaryTextColor);
    const tertiaryTextColor = hexToHslToken(branding.tertiaryTextColor);
    const frame = window.requestAnimationFrame(() => {
      if (isAdminRoute) {
        root.style.removeProperty("--font-sans");
        root.style.removeProperty("--font-serif");
        root.style.removeProperty("--primary");
        root.style.removeProperty("--secondary");
        root.style.removeProperty("--accent");
        root.style.removeProperty("--ring");
        root.style.removeProperty("--quaternary");
        root.style.removeProperty("--foreground");
        root.style.removeProperty("--card-foreground");
        root.style.removeProperty("--popover-foreground");
        root.style.removeProperty("--muted-foreground");
        root.style.removeProperty("--public-text-h1");
        root.style.removeProperty("--public-text-h2");
        root.style.removeProperty("--public-text-h3");
        root.style.removeProperty("--public-text-body");
        root.style.removeProperty("--public-text-heading-subtext");
        root.style.removeProperty("--public-text-supporting-copy");
        root.style.removeProperty("--public-text-helper");
        root.style.removeProperty("--public-text-meta");
        root.style.removeProperty("--public-text-link");
        root.style.removeProperty("--public-text-link-hover");
        root.style.removeProperty("--public-text-inverse");
        root.style.removeProperty("--primary-foreground");
        root.style.removeProperty("--secondary-foreground");
        root.style.removeProperty("--accent-foreground");
        return;
      }

      if (bodyFontFamily) {
        root.style.setProperty("--font-sans", bodyFontFamily);
      } else {
        root.style.removeProperty("--font-sans");
      }

      if (headingFontFamily) {
        root.style.setProperty("--font-serif", headingFontFamily);
      } else {
        root.style.removeProperty("--font-serif");
      }

      if (primaryColor) {
        root.style.setProperty("--primary", primaryColor);
      } else {
        root.style.removeProperty("--primary");
      }

      if (secondaryColor) {
        root.style.setProperty("--secondary", secondaryColor);
      } else {
        root.style.removeProperty("--secondary");
      }

      if (tertiaryColor) {
        root.style.setProperty("--accent", tertiaryColor);
        root.style.setProperty("--ring", tertiaryColor);
      } else {
        root.style.removeProperty("--accent");
        root.style.removeProperty("--ring");
      }

      if (quaternaryColor) {
        root.style.setProperty("--quaternary", quaternaryColor);
      } else {
        root.style.removeProperty("--quaternary");
      }

      if (bodyTextColor) {
        root.style.setProperty("--foreground", bodyTextColor);
        root.style.setProperty("--card-foreground", bodyTextColor);
        root.style.setProperty("--popover-foreground", bodyTextColor);
        root.style.setProperty("--public-text-body", bodyTextColor);
      } else {
        root.style.removeProperty("--foreground");
        root.style.removeProperty("--card-foreground");
        root.style.removeProperty("--popover-foreground");
        root.style.removeProperty("--public-text-body");
      }

      if (headingSubtextColor) {
        root.style.setProperty("--public-text-heading-subtext", headingSubtextColor);
      } else {
        root.style.removeProperty("--public-text-heading-subtext");
      }

      if (supportingCopyColor) {
        root.style.setProperty("--public-text-supporting-copy", supportingCopyColor);
      } else {
        root.style.removeProperty("--public-text-supporting-copy");
      }

      if (helperTextColor) {
        root.style.setProperty("--muted-foreground", helperTextColor);
        root.style.setProperty("--public-text-helper", helperTextColor);
      } else {
        root.style.removeProperty("--muted-foreground");
        root.style.removeProperty("--public-text-helper");
      }

      if (h1Color) {
        root.style.setProperty("--public-text-h1", h1Color);
      } else {
        root.style.removeProperty("--public-text-h1");
      }

      if (h2Color) {
        root.style.setProperty("--public-text-h2", h2Color);
      } else {
        root.style.removeProperty("--public-text-h2");
      }

      if (h3ToH6Color) {
        root.style.setProperty("--public-text-h3", h3ToH6Color);
      } else {
        root.style.removeProperty("--public-text-h3");
      }

      if (metaTextColor) {
        root.style.setProperty("--public-text-meta", metaTextColor);
      } else {
        root.style.removeProperty("--public-text-meta");
      }

      if (linkColor) {
        root.style.setProperty("--public-text-link", linkColor);
      } else {
        root.style.removeProperty("--public-text-link");
      }

      if (linkHoverColor) {
        root.style.setProperty("--public-text-link-hover", linkHoverColor);
      } else {
        root.style.removeProperty("--public-text-link-hover");
      }

      if (inverseTextColor) {
        root.style.setProperty("--public-text-inverse", inverseTextColor);
      } else {
        root.style.removeProperty("--public-text-inverse");
      }

      if (primaryTextColor) {
        root.style.setProperty("--primary-foreground", primaryTextColor);
      } else {
        root.style.removeProperty("--primary-foreground");
      }

      if (secondaryTextColor) {
        root.style.setProperty("--secondary-foreground", secondaryTextColor);
      } else {
        root.style.removeProperty("--secondary-foreground");
      }

      if (tertiaryTextColor) {
        root.style.setProperty("--accent-foreground", tertiaryTextColor);
      } else {
        root.style.removeProperty("--accent-foreground");
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    branding.companyAddress,
    branding.companyGoogleBusinessUrl,
    branding.companyName,
    branding.companyPhoneNumbers,
    branding.socialIconStyle,
    branding.socialLinks,
    branding.bodyFont,
    branding.headingFont,
    branding.primaryColor,
    branding.secondaryColor,
    branding.tertiaryColor,
    branding.quaternaryColor,
    branding.h1Color,
    branding.h2Color,
    branding.h3ToH6Color,
    branding.bodyTextColor,
    branding.headingSubtextColor,
    branding.supportingCopyColor,
    branding.helperTextColor,
    branding.metaTextColor,
    branding.linkColor,
    branding.linkHoverColor,
    branding.inverseTextColor,
    branding.primaryTextColor,
    branding.secondaryTextColor,
    branding.tertiaryTextColor,
    isAdminRoute,
  ]);

  useEffect(() => {
    const faviconHref = branding.faviconUrl || "/p1-symbol.svg";
    let faviconEl = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!faviconEl) {
      faviconEl = document.createElement("link");
      faviconEl.setAttribute("rel", "icon");
      document.head.appendChild(faviconEl);
    }

    faviconEl.setAttribute("href", faviconHref);
    if (faviconHref.endsWith(".svg")) {
      faviconEl.setAttribute("type", "image/svg+xml");
    } else if (faviconHref.endsWith(".ico")) {
      faviconEl.setAttribute("type", "image/x-icon");
    } else {
      faviconEl.setAttribute("type", "image/png");
    }
  }, [branding.faviconUrl, isAdminRoute]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
