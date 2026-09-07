import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import {
  SiFacebook,
  SiHouzz,
  SiInstagram,
  SiLinkedin,
  SiNextdoor,
  SiPinterest,
  SiTiktok,
  SiX,
  SiYelp,
  SiYoutube,
} from "react-icons/si";
import type { SocialIconStyle, SocialMediaLink, SocialPlatformKey } from "@shared/social-media";
import { cn } from "@/lib/utils";

const SOCIAL_ICONS: Record<SocialPlatformKey, IconType> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  linkedin: SiLinkedin,
  x: SiX,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  pinterest: SiPinterest,
  houzz: SiHouzz,
  yelp: SiYelp,
  nextdoor: SiNextdoor,
};

export function SocialMediaLinks({
  links,
  iconStyle,
  className,
  linkClassName,
  size = "md",
}: {
  links: SocialMediaLink[];
  iconStyle: SocialIconStyle;
  className?: string;
  linkClassName?: string;
  size?: "sm" | "md";
}) {
  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {links.map((link) => {
        const Icon = SOCIAL_ICONS[link.platform];
        const style =
          iconStyle === "brand"
            ? ({ "--social-color": link.brandColor } as CSSProperties)
            : undefined;

        return (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            title={link.label}
            style={style}
            className={cn(
              "inline-flex shrink-0 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              size === "sm" ? "h-8 w-8 text-sm" : "h-9 w-9 text-base",
              iconStyle === "brand" &&
                "text-[var(--social-color)] hover:bg-[var(--social-color)] hover:text-white",
              iconStyle === "outline" &&
                "border border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              iconStyle === "solid" &&
                "bg-foreground text-background hover:bg-primary hover:text-primary-foreground",
              iconStyle === "brand" ? "rounded-full" : "rounded-md",
              linkClassName,
            )}
            data-testid={`link-social-${link.platform}`}
          >
            <Icon className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}
