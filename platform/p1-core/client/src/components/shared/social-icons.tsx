import type { SocialPlatformKey } from "../../../../shared/social-media";
import { SOCIAL_ICON_PATHS } from "../../../../shared/social-icon-paths";
export function SocialPlatformIcon({
  platform,
  className,
}: {
  platform: SocialPlatformKey;
  className?: string;
}) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      {SOCIAL_ICON_PATHS[platform].map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
