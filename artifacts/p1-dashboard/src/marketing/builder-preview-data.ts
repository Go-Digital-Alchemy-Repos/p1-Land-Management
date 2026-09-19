import {
  getSocialMediaLinks,
  normalizeSocialIconStyle,
  isSafeSocialUrl,
} from "../../../../platform/p1-core/shared/social-media";
import { useEffect, useMemo, useState } from "react";
import {
  getWebsiteIdentity,
  getWebsiteSocial,
  listMarketingForms,
  listMarketingBlog,
  listMarketingTeam,
  listMarketingEvents,
  getMarketingGallery,
  listMarketingCareerJobs,
} from "@workspace/api-client-react/dashboard";
import {
  getBlockDef,
  type BlockInstance,
} from "../../../../platform/p1-core/shared/cms-builder/block-registry";
export type BuilderPreviewKind =
  | "social"
  | "branding"
  | "forms"
  | "blog"
  | "galleries"
  | "team"
  | "events"
  | "careers";
export interface PreviewResource {
  data?: any;
  loading: boolean;
  error?: string;
  denied?: boolean;
}
const kindByType: Record<string, BuilderPreviewKind> = {
  "form-embed": "forms",
  "contact-form": "forms",
  team: "team",
  gallery: "galleries",
  "blog-preview": "blog",
  "blog-post-feed": "blog",
  "blog-featured-post": "blog",
  "standard-blog-page": "blog",
  "events-preview": "events",
  "events-archive": "events",
  "video-archives": "events",
  "career-listings": "careers",
};
export function previewResourceKey(block: BlockInstance) {
  const kind = kindByType[getBlockDef(block.type)?.type ?? block.type];
  return kind
    ? kind +
        (kind === "galleries" ? `:${String(block.props.galleryId ?? "")}` : "")
    : null;
}
export function useBuilderPreviewData(
  blocks: BlockInstance[],
  canPreview: (kind: BuilderPreviewKind) => boolean,
) {
  const keys = Array.from(
    new Set(
      [
        ...blocks.map(previewResourceKey),
        ...(blocks.some(
          (block) =>
            (getBlockDef(block.type)?.type ?? block.type) === "contact-form",
        )
          ? ["branding", "social"]
          : []),
      ].filter((key): key is string => !!key),
    ),
  ).sort();
  const signature = JSON.stringify(
    keys.map((key) => [
      key,
      canPreview(key.split(":")[0] as BuilderPreviewKind),
    ]),
  );
  const [data, setData] = useState<Record<string, PreviewResource>>({});
  useEffect(() => {
    const requests = JSON.parse(signature) as [string, boolean][];
    const controller = new AbortController();
    setData(
      Object.fromEntries(
        requests.map(([key, allowed]) => [
          key,
          { loading: allowed, denied: !allowed },
        ]),
      ),
    );
    for (const [key, allowed] of requests) {
      if (!allowed) continue;
      const [kind, id] = key.split(":");
      const options = { signal: controller.signal };
      const request =
        kind === "social"
          ? getWebsiteSocial(options).then(({ settings }) => ({
              socialLinks: getSocialMediaLinks(settings),
              socialIconStyle: normalizeSocialIconStyle(
                settings.social_icon_style,
              ),
            }))
          : kind === "branding"
            ? getWebsiteIdentity(options).then(({ settings }) => ({
                companyName: settings.company_name,
                companyAddress: settings.company_address,
                companyGoogleBusinessUrl: isSafeSocialUrl(
                  settings.company_google_business_url,
                )
                  ? settings.company_google_business_url
                  : "",
                companyPhoneNumbers: settings.company_phone_numbers,
                socialLinks: [],
              }))
            : kind === "forms"
              ? listMarketingForms(options)
              : kind === "blog"
                ? listMarketingBlog(options)
                : kind === "team"
                  ? listMarketingTeam(options)
                  : kind === "events"
                    ? listMarketingEvents(options)
                    : kind === "careers"
                      ? listMarketingCareerJobs(options)
                      : id
                        ? getMarketingGallery(id, options)
                        : Promise.resolve(null);
      void request
        .then((rows) => {
          if (controller.signal.aborted) return;
          setData((current) => ({
            ...current,
            [key]: { loading: false, data: rows },
          }));
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setData((current) => ({
              ...current,
              [key]: {
                loading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Preview data could not load.",
              },
            }));
        });
    }
    return () => controller.abort();
  }, [signature]);
  // Recheck current grants synchronously: never render stale privileged data while effect cleanup runs.
  return Object.fromEntries(
    keys.map((key) => [
      key,
      canPreview(key.split(":")[0] as BuilderPreviewKind)
        ? (data[key] ?? { loading: true })
        : { loading: false, denied: true },
    ]),
  );
}
