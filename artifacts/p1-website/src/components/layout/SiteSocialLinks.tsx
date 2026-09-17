import { useEffect, useState } from "react";
import {
  SOCIAL_MEDIA_PLATFORMS,
  SOCIAL_ICON_STYLES,
  isSafeSocialUrl,
  type SocialMediaLink,
  type SocialIconStyle,
} from "../../../../../platform/p1-core/shared/social-media";
import { SOCIAL_ICON_PATHS } from "../../../../../platform/p1-core/shared/social-icon-paths";
type Publication = { links: SocialMediaLink[]; iconStyle: SocialIconStyle };
function publication(data: unknown): Publication {
  if (
    !data ||
    typeof data !== "object" ||
    Object.keys(data).sort().join(",") !== "iconStyle,links"
  )
    throw Error("Invalid social links");
  const input = data as { iconStyle: unknown; links: unknown };
  if (
    !SOCIAL_ICON_STYLES.some((style) => style === input.iconStyle) ||
    !Array.isArray(input.links) ||
    input.links.length > 10
  )
    throw Error("Invalid social links");
  const seen = new Set<string>();
  const links = input.links.map((value: unknown) => {
    if (
      !value ||
      typeof value !== "object" ||
      Object.keys(value).sort().join(",") !== "platform,url"
    )
      throw Error("Invalid link");
    const link = value as { platform: unknown; url: unknown };
    const platform = SOCIAL_MEDIA_PLATFORMS.find(
      (item) => item.key === link.platform,
    );
    if (
      !platform ||
      seen.has(platform.key) ||
      typeof link.url !== "string" ||
      !isSafeSocialUrl(link.url)
    )
      throw Error("Invalid link");
    seen.add(platform.key);
    return {
      platform: platform.key,
      label: platform.label,
      brandColor: platform.brandColor,
      url: link.url,
    };
  });
  return { links, iconStyle: input.iconStyle as SocialIconStyle };
}
export function SiteSocialLinks() {
  const [data, setData] = useState<Publication | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch("/api/p1/social-links", {
      credentials: "omit",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw Error("Unavailable");
        return publication(await response.json());
      })
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setData(null);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  if (!data?.links.length) return null;
  return (
    <nav
      aria-label="Social profiles"
      className={`site-social-links site-social-${data.iconStyle}`}
    >
      {data.links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          aria-label={`P1 on ${link.label}`}
          title={link.label}
          target="_blank"
          rel="noopener noreferrer"
          style={
            data.iconStyle === "brand" ? { color: link.brandColor } : undefined
          }
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
          >
            {SOCIAL_ICON_PATHS[link.platform].map((d, index) => (
              <path key={index} d={d} />
            ))}
          </svg>
        </a>
      ))}
    </nav>
  );
}
