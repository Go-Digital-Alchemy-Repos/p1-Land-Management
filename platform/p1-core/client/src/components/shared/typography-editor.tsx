import React, { useEffect, type ComponentType, type HTMLAttributes, type ReactNode } from "react";
import { Check, Type } from "lucide-react";
import type { BrandingFontOption } from "../../../../shared/website-fonts";

type Container = ComponentType<HTMLAttributes<HTMLDivElement>>;
const Div = (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />;
export type TypographyKind = "heading" | "body";

/** Original BrandingTab typography presentation; hosts retain their controls and saves. */
export function TypographyEditor({
  components = {},
  options,
  headingValue,
  bodyValue,
  onSelect,
  renderSelect,
  toolbar,
  notices,
  disabled = false,
  loadFonts = false,
}: {
  components?: Partial<
    Record<"Card" | "CardHeader" | "CardTitle" | "CardDescription" | "CardContent", Container>
  >;
  options: BrandingFontOption[];
  headingValue: string;
  bodyValue: string;
  onSelect: (kind: TypographyKind, value: string) => void;
  renderSelect: (kind: TypographyKind) => ReactNode;
  toolbar: ReactNode;
  notices?: ReactNode;
  disabled?: boolean;
  loadFonts?: boolean;
}) {
  const {
    Card = Div,
    CardHeader = Div,
    CardTitle = Div,
    CardDescription = Div,
    CardContent = Div,
  } = components;
  const fontQuery = options
    .map((option) => `family=${encodeURIComponent(option.label)}`)
    .join("&");
  useEffect(() => {
    if (!loadFonts || !fontQuery) return;
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
    document.head.append(stylesheet);
    return () => stylesheet.remove();
  }, [loadFonts, fontQuery]);
  const selected = (kind: TypographyKind) => (kind === "heading" ? headingValue : bodyValue);
  const family = (kind: TypographyKind) =>
    options.find((option) => option.value === selected(kind))?.family;
  return (
    <Card className="typography-editor">
      <CardHeader className="typography-header">
        <CardTitle className="typography-title flex items-center gap-2 text-base">
          <Type className="h-4 w-4 text-primary" aria-hidden="true" />
          Frontend Typography
        </CardTitle>
        <CardDescription className="typography-description">
          Choose one font for headings and another for body copy on the public-facing website. Each
          option includes an inline sample so editors can compare type directly in the admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="typography-content space-y-5">
        {notices}
        <div className="typography-controls grid gap-4 md:grid-cols-2">
          {(["heading", "body"] as const).map((kind) => (
            <div key={kind} className="typography-field space-y-1.5">
              <label htmlFor={`frontend_${kind}_font`} className="text-sm font-medium leading-none">
                {kind === "heading" ? "Heading Font" : "Body Font"}
              </label>
              {renderSelect(kind)}
              <p className="typography-help text-xs text-muted-foreground">
                {kind === "heading"
                  ? `Choose from ${options.filter((option) => option.category === "sans").length} sans serif and ${options.filter((option) => option.category === "serif").length} serif Google fonts.`
                  : "Choose from the same balanced font library for paragraph copy."}
              </p>
            </div>
          ))}
        </div>
        <div className="typography-pickers grid gap-6 xl:grid-cols-2">
          {(["heading", "body"] as const).map((kind) => (
            <Card className="typography-picker border-dashed" key={kind}>
              <CardHeader className="typography-picker-header pb-3">
                <CardTitle className="typography-picker-title text-sm">
                  {kind === "heading" ? "Heading Font Picker" : "Body Font Picker"}
                </CardTitle>
                <CardDescription className="typography-description">
                  {kind === "heading"
                    ? "Preview how each font feels in large editorial headings."
                    : "Preview how each font reads in paragraph-sized content."}
                </CardDescription>
              </CardHeader>
              <CardContent className="typography-picker-content space-y-4">
                {(["sans", "serif"] as const).map((category) => (
                  <div key={category} className="typography-group space-y-3">
                    <div>
                      <p className="typography-category text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {category === "sans" ? "Sans Serif Options" : "Serif Options"}
                      </p>
                    </div>
                    <div className="typography-options grid gap-3">
                      {options
                        .filter((option) => option.category === category)
                        .map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelect(kind, option.value)}
                            aria-pressed={selected(kind) === option.value}
                            className={`typography-option w-full rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${selected(kind) === option.value ? "is-selected border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/70 bg-background"}`}
                            data-testid={`button-branding-font-${kind}-${option.value}`}
                          >
                            <div className="typography-option-heading flex items-start justify-between gap-3">
                              <div className="typography-option-labels space-y-1">
                                <p
                                  className="typography-option-name text-sm font-semibold"
                                  style={{ fontFamily: option.family }}
                                >
                                  {option.label}
                                </p>
                                <p className="typography-option-category text-xs uppercase tracking-wide text-muted-foreground">
                                  {category === "sans" ? "Sans Serif" : "Serif"}
                                </p>
                              </div>
                              {selected(kind) === option.value && (
                                <span className="typography-option-check inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                              )}
                            </div>
                            <p
                              className={`typography-option-sample mt-3 text-balance text-foreground ${kind === "heading" ? "typography-heading-sample text-xl font-semibold" : "typography-body-sample text-sm"}`}
                              style={{ fontFamily: option.family }}
                            >
                              {kind === "heading"
                                ? "The right words should feel understood."
                                : "Thoughtful typography helps editors preview the real feeling of the brand before publishing."}
                            </p>
                            <p className="typography-option-description mt-2 text-xs text-muted-foreground">
                              {option.preview}
                            </p>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <section
          aria-label="Typography combination preview"
          className="typography-preview rounded-xl border bg-muted/10 p-5"
        >
          <p className="typography-preview-label text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <h4
            className="typography-preview-heading mt-3 text-2xl font-semibold"
            style={{ fontFamily: family("heading") }}
          >
            P1 Land &amp; Property Management
          </h4>
          <p
            className="typography-preview-body mt-3 text-sm text-muted-foreground"
            style={{ fontFamily: family("body") }}
          >
            Use this preview to compare heading and body combinations before saving. These font
            selections only apply to the public-facing website, not the admin dashboard.
          </p>
        </section>
        <div className="typography-toolbar flex gap-2">{toolbar}</div>
      </CardContent>
    </Card>
  );
}
