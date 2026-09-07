import { STALE_TIMES } from "@/lib/queryClient";
import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
const logoImg = "/p1-symbol.svg";
import { useBranding } from "@/components/shared/branding-provider";
import { SocialMediaLinks } from "@/components/shared/social-media-links";
import { DEFAULT_SITE_FEATURES, type SiteFeatures } from "@shared/site-features";
import { useDirectorySettings } from "@/hooks/use-directory-settings";
import { getDirectoryExperienceMode } from "@shared/types/directory-settings";
import type { CmsMenu, MenuItem, PublicMenuLocation } from "@shared/schema";

const defaultCompanyLinks = [
  { href: "/about", label: "About Us", testId: "link-footer-about" },
  { href: "/contact", label: "Contact", testId: "link-footer-contact" },
  { href: "/contact", label: "Support", testId: "link-footer-support" },
];

const defaultLegalLinks = [
  { href: "/privacy-policy", label: "Privacy Policy", testId: "link-footer-privacy" },
  { href: "/terms-of-service", label: "Terms of Service", testId: "link-footer-terms" },
  { href: "/disclaimer", label: "Disclaimer", testId: "link-footer-disclaimer" },
];

type FooterLegalLink = {
  href: string;
  label: string;
  testId: string;
  openInNewTab?: boolean;
};

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; testId: string }[];
}) {
  return (
    <div>
      <h4 className="font-semibold text-sm mb-3 sm:mb-4 text-foreground">{title}</h4>
      <ul className="space-y-2.5 sm:space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.testId}>
            <Link
              href={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid={link.testId}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function flattenFooterItems(items: MenuItem[], depth = 0): { item: MenuItem; depth: number }[] {
  const result: { item: MenuItem; depth: number }[] = [];
  for (const item of items) {
    result.push({ item, depth });
    if (item.children?.length > 0) {
      result.push(...flattenFooterItems(item.children, depth + 1));
    }
  }
  return result;
}

function DynamicFooterColumn({ item }: { item: MenuItem }) {
  const allLinks = flattenFooterItems(item.children || []);
  return (
    <div>
      <h4 className="font-semibold text-sm mb-3 sm:mb-4 text-foreground">{item.label}</h4>
      <ul className="space-y-2.5 sm:space-y-3 text-sm">
        {allLinks.map(({ item: child, depth }) => (
          <li key={child.id} style={depth > 0 ? { paddingLeft: `${depth * 12}px` } : undefined}>
            {child.openInNewTab ? (
              <a
                href={child.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-footer-${child.id}`}
              >
                {child.label}
              </a>
            ) : (
              <Link
                href={child.url}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-footer-${child.id}`}
              >
                {child.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function flattenMenuLinks(items: MenuItem[]): MenuItem[] {
  return flattenFooterItems(items).map(({ item }) => item);
}

function StandardFooterColumn({ menu }: { menu: CmsMenu }) {
  const links = flattenMenuLinks((menu.items as MenuItem[]) || []);
  if (links.length === 0) return null;

  return (
    <div>
      <h4 className="font-semibold text-sm mb-3 sm:mb-4 text-foreground">{menu.name}</h4>
      <ul className="space-y-2.5 sm:space-y-3 text-sm">
        {links.map((item) => (
          <li key={item.id}>
            {item.openInNewTab ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-footer-${item.id}`}
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.url}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-footer-${item.id}`}
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const { frontendLogoUrl, socialIconStyle, socialLinks } = useBranding();
  const { settings: directorySettings } = useDirectorySettings();
  const directoryExperience = getDirectoryExperienceMode(directorySettings);
  const directoryPlural =
    directoryExperience === "store_locator"
      ? directorySettings.listingLabelPlural || directorySettings.directoryLabelPlural || "Listings"
      : directorySettings.participantLabelPlural ||
        directorySettings.listingLabelPlural ||
        "Listings";
  const directoryLinkLabel = `Find ${directoryPlural}`;
  const professionalColumnTitle =
    directoryExperience === "service_provider" ? "For Professionals" : "For Location Owners";
  const professionalLoginLabel =
    directoryExperience === "service_provider" ? "Professional Login" : "Location Owner Login";
  const brandBlurb =
    directoryExperience === "service_provider"
      ? "Connecting members with trusted providers through a flexible, searchable directory."
      : `Connecting people with trusted ${directoryPlural.toLowerCase()} through a flexible, searchable directory.`;
  const defaultPlatformLinks = [
    { href: "/directory", label: directoryLinkLabel, testId: "link-footer-directory" },
    { href: "/events", label: "Events & Workshops", testId: "link-footer-events" },
    { href: "/about", label: "How It Works", testId: "link-footer-how-it-works" },
  ];
  const defaultProfessionalLinks = [
    { href: "/join", label: "Apply to Join", testId: "link-footer-join" },
    { href: "/admin/login", label: professionalLoginLabel, testId: "link-footer-login" },
    {
      href: "/therapist/subscription",
      label: "Membership Plans",
      testId: "link-footer-membership",
    },
  ];
  const defaultResourceLinks = [
    { href: "/about", label: "About the Platform", testId: "link-footer-about-corePlatforms" },
    { href: "/events", label: "Upcoming Events", testId: "link-footer-upcoming-events" },
    { href: "/directory", label: "Browse the Directory", testId: "link-footer-specializations" },
  ];
  const { data: siteFeaturesData } = useQuery<SiteFeatures>({
    queryKey: ["/api/site-config"],
    staleTime: STALE_TIMES.LIVE,
  });
  const siteFeatures = siteFeaturesData ?? DEFAULT_SITE_FEATURES;
  const { data: publicMenus } = useQuery<Partial<Record<PublicMenuLocation, CmsMenu>>>({
    queryKey: ["/api/cms/menus"],
    queryFn: async () => {
      const res = await fetch("/api/cms/menus");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: siteFeatures.cmsEnabled,
    staleTime: STALE_TIMES.LIVE,
  });

  const legacyFooterItems = useMemo(() => {
    const footerMenu = publicMenus?.footer;
    if (!footerMenu?.items) return null;
    const items = footerMenu.items as MenuItem[];
    return items.length > 0 ? items : null;
  }, [publicMenus]);

  const standardFooterMenus = useMemo(
    () =>
      [
        publicMenus?.footer_platform,
        publicMenus?.footer_professionals,
        publicMenus?.footer_resources,
        publicMenus?.footer_company,
      ].filter((menu): menu is CmsMenu =>
        Boolean(menu && Array.isArray(menu.items) && menu.items.length > 0),
      ),
    [publicMenus],
  );

  const legalLinks = useMemo(() => {
    const legalMenu = publicMenus?.footer_legal;
    if (!legalMenu?.items) return defaultLegalLinks;

    const items = flattenMenuLinks((legalMenu.items as MenuItem[]) || []);
    if (items.length === 0) return defaultLegalLinks;

    return items.map((item) => ({
      href: item.url,
      label: item.label,
      openInNewTab: item.openInNewTab,
      testId: `link-footer-${item.id}`,
    }));
  }, [publicMenus]) as FooterLegalLink[];

  const useStandardFooterMenus = standardFooterMenus.length > 0;
  const brandLogo = frontendLogoUrl || logoImg;

  return (
    <footer className="border-t bg-muted/30" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
        <div
          className={`grid grid-cols-2 sm:grid-cols-2 ${useStandardFooterMenus ? "lg:grid-cols-6" : "lg:grid-cols-5"} gap-8 sm:gap-10 lg:gap-12`}
        >
          <div className="col-span-2">
            <img src={brandLogo} alt="Core Platform" className="h-8 sm:h-9 w-auto mb-3 sm:mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{brandBlurb}</p>
            <SocialMediaLinks
              links={socialLinks}
              iconStyle={socialIconStyle}
              className="mt-4"
              size="sm"
            />
          </div>

          {useStandardFooterMenus ? (
            standardFooterMenus.map((menu) => <StandardFooterColumn key={menu.id} menu={menu} />)
          ) : legacyFooterItems ? (
            legacyFooterItems.map((item) =>
              item.children && item.children.length > 0 ? (
                <DynamicFooterColumn key={item.id} item={item} />
              ) : (
                <div key={item.id}>
                  <ul className="space-y-2.5 sm:space-y-3 text-sm">
                    <li>
                      {item.openInNewTab ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors font-semibold"
                          data-testid={`link-footer-${item.id}`}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          href={item.url}
                          className="text-muted-foreground hover:text-foreground transition-colors font-semibold"
                          data-testid={`link-footer-${item.id}`}
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  </ul>
                </div>
              ),
            )
          ) : (
            <>
              <FooterColumn title="Platform" links={defaultPlatformLinks} />
              <FooterColumn title={professionalColumnTitle} links={defaultProfessionalLinks} />
              <div className="col-span-2 sm:col-span-1">
                <FooterColumn title="Resources" links={defaultResourceLinks} />
                <div className="mt-6 sm:mt-8">
                  <FooterColumn title="Company" links={defaultCompanyLinks} />
                </div>
              </div>
            </>
          )}
        </div>

        <div
          className="mt-8 sm:mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-sm text-muted-foreground"
          data-testid="text-copyright"
        >
          <span className="text-center sm:text-left">
            &copy; {new Date().getFullYear()} Core Platform. All rights reserved.
          </span>
          <div className="flex items-center gap-4 sm:gap-6">
            {legalLinks.map((link) =>
              link.openInNewTab ? (
                <a
                  key={link.testId}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                  data-testid={link.testId}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.testId}
                  href={link.href}
                  className="hover:text-foreground transition-colors"
                  data-testid={link.testId}
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
