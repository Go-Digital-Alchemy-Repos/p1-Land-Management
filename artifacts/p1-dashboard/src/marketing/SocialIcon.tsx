import type { SocialPlatformKey } from "../../../../platform/p1-core/shared/social-media";
import { SOCIAL_ICON_PATHS } from "../../../../platform/p1-core/shared/social-icon-paths";
export function SocialPlatformIcon({
  platform,
}: {
  platform: SocialPlatformKey;
}) {
  return (
    <svg
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
