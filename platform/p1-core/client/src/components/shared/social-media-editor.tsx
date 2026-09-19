import React, { type ComponentType, type HTMLAttributes, type ReactNode } from "react";
import { Link2 } from "lucide-react";
import { SOCIAL_MEDIA_PLATFORMS, type SocialPlatform } from "../../../../shared/social-media";

type Container = ComponentType<HTMLAttributes<HTMLDivElement>>;
const Div = (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />;

/** A full URL pasted after the focus prefix must replace that prefix. */
export function normalizePrefilledSocialUrl(value: string): string {
  return value.replace(/^https:\/\/(?=https?:\/\/)/i, "");
}

/** Retained BrandingTab presentation. Hosts supply their existing controls and transport. */
export function SocialMediaEditor({
  components = {},
  renderInput,
  styleControl,
  preview,
  toolbar,
  notices,
}: {
  components?: Partial<
    Record<"Card" | "CardHeader" | "CardTitle" | "CardDescription" | "CardContent", Container>
  >;
  renderInput: (platform: SocialPlatform) => ReactNode;
  styleControl: ReactNode;
  preview: ReactNode;
  toolbar: ReactNode;
  notices?: ReactNode;
}) {
  const {
    Card = Div,
    CardHeader = Div,
    CardTitle = Div,
    CardDescription = Div,
    CardContent = Div,
  } = components;
  return (
    <Card className="social-media-editor">
      <CardHeader className="social-media-header">
        <CardTitle className="social-media-title flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Social Media
        </CardTitle>
        <CardDescription className="social-media-description">
          Add social profile URLs for the public footer and the company contact information card.
          Empty fields stay hidden on the website.
        </CardDescription>
      </CardHeader>
      <CardContent className="social-media-content space-y-5">
        {notices}
        <div className="social-media-fields grid gap-4 md:grid-cols-2">
          {SOCIAL_MEDIA_PLATFORMS.map((platform) => (
            <div key={platform.key} className="social-media-field space-y-1.5">
              <label
                className="text-sm font-medium leading-none"
                htmlFor={`social-${platform.key}`}
              >
                {platform.label}
              </label>
              {renderInput(platform)}
            </div>
          ))}
        </div>
        <div className="social-media-style-preview grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="social-media-field space-y-1.5">
            <label className="text-sm font-medium leading-none" htmlFor="social-icon-style">
              Icon Style
            </label>
            {styleControl}
            <p className="social-media-help text-xs text-muted-foreground">
              Choose how icons should appear in the footer and contact card.
            </p>
          </div>
          <section
            aria-label="Social icon preview"
            className="social-media-preview rounded-xl border bg-muted/10 p-4"
          >
            <p className="social-media-preview-title text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <div className="social-media-preview-content mt-3">
              {preview ?? (
                <p className="social-media-empty text-sm text-muted-foreground">
                  Add at least one social URL to preview the icon style.
                </p>
              )}
            </div>
          </section>
        </div>
        <div className="social-media-toolbar flex gap-2">{toolbar}</div>
      </CardContent>
    </Card>
  );
}
