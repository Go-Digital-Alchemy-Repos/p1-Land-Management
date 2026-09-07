import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { FormModalButton } from "@/components/forms/form-modal-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "./section-heading";
import { LucideIcon } from "./block-icons";
import { arr, SPACING_MAP, str } from "./block-renderer.shared";

export function ContactInfoBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ icon: string; label: string; value: string }>(props.items);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="left" className="mb-6" />
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">Add contact items to display here.</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <LucideIcon name={item.icon || "Globe"} className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="break-words font-medium text-sm">{item.value}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function DividerBlock({ props }: { props: Record<string, unknown> }) {
  const style = str(props.style) || "spacer";
  const spacing = str(props.spacing) || "md";
  const heightClass = SPACING_MAP[spacing] ?? SPACING_MAP.md;
  if (style === "spacer") return <div className={heightClass} />;
  if (style === "dots")
    return (
      <div className={`flex justify-center items-center gap-2 ${heightClass}`}>
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
      </div>
    );
  return <hr className={`border-border ${heightClass} border-0 border-t-[1px] my-auto`} />;
}

export function FeatureListBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "3";
  const colsClass =
    cols === "1" ? "grid-cols-1" : cols === "2" ? "md:grid-cols-2" : "md:grid-cols-3";
  const features = arr<{ icon: string; title: string; description: string }>(props.features);
  return (
    <div className="py-4" data-testid="block-feature-list">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className={`grid grid-cols-1 ${colsClass} gap-6 sm:gap-8`}>
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-4" data-testid={`feature-item-${i}`}>
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <LucideIcon name={f.icon || "CheckCircle"} className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ObjectionBustersBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ concern: string; response: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-objection-busters">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="space-y-6 max-w-3xl mx-auto">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border p-4 sm:p-6" data-testid={`objection-item-${i}`}>
            <div className="flex items-start gap-3 mb-3">
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="font-medium text-sm">{item.concern}</p>
            </div>
            <div className="flex items-start gap-3 pl-8">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">{item.response}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BeforeAfterBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ milestone: string; before: string; after: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-before-after">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="relative max-w-3xl mx-auto">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />
        <div className="space-y-8">
          {items.map((item, i) => (
            <div key={i} className="flex gap-4 sm:gap-6" data-testid={`milestone-item-${i}`}>
              <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs">
                {item.milestone}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                  <p className="text-xs font-medium text-destructive mb-1">Before</p>
                  <p className="text-sm text-muted-foreground">{item.before}</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                    After
                  </p>
                  <p className="text-sm text-muted-foreground">{item.after}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrustBarBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ icon: string; label: string }>(props.items);
  return (
    <div className="py-4 border-y bg-muted/20" data-testid="block-trust-bar">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-muted-foreground"
            data-testid={`trust-signal-${i}`}
          >
            <LucideIcon name={item.icon || "CheckCircle"} className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PressMentionsBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ name: string; logoUrl: string; link: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-press-mentions">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
        {items.map((item, i) => {
          const content = item.logoUrl ? (
            <img
              src={item.logoUrl}
              alt={item.name}
              className="h-8 sm:h-10 object-contain opacity-60 hover:opacity-100 transition-opacity"
            />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              {item.name}
            </span>
          );
          return item.link ? (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
              data-testid={`press-item-${i}`}
            >
              {content}
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          ) : (
            <div key={i} data-testid={`press-item-${i}`}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SocialProofStatsBlock({ props }: { props: Record<string, unknown> }) {
  const stats = arr<{ value: string; label: string }>(props.stats);
  return (
    <div className="py-4" data-testid="block-social-proof-stats">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="text-center" data-testid={`stat-item-${i}`}>
            <p className="text-3xl md:text-4xl font-bold text-accent">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
      {str(props.disclaimer) && (
        <p className="text-xs text-muted-foreground text-center mt-6 italic">
          {str(props.disclaimer)}
        </p>
      )}
    </div>
  );
}

export function ImageGridBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "3";
  const colsClass =
    cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-4" : "md:grid-cols-3";
  const gapSize = str(props.gap) || "md";
  const gapClass =
    gapSize === "sm" ? "gap-2" : gapSize === "lg" ? "gap-6" : gapSize === "xl" ? "gap-8" : "gap-4";
  const images = arr<{ url: string; alt: string; caption: string }>(props.images);
  return (
    <div className="py-4" data-testid="block-image-grid">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      {images.length === 0 ? (
        <div className="rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Add images to display here</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${colsClass} ${gapClass}`}>
          {images.map((img, i) => (
            <div key={i} data-testid={`grid-image-${i}`}>
              <img
                src={img.url}
                alt={img.alt}
                className="w-full rounded-lg object-cover aspect-square"
              />
              {img.caption && (
                <p className="text-xs text-muted-foreground text-center mt-1">{img.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SliderBlock({ props }: { props: Record<string, unknown> }) {
  const [current, setCurrent] = useState(0);
  const slides = arr<{ imageUrl: string; heading: string; description: string }>(props.slides);
  useEffect(() => {
    if (slides.length > 0 && current >= slides.length) setCurrent(Math.max(0, slides.length - 1));
  }, [slides.length, current]);
  if (slides.length === 0)
    return (
      <div className="py-4 rounded-xl bg-muted/40 border border-dashed h-48 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Add slides to display here</p>
      </div>
    );
  const safeIdx = Math.min(current, slides.length - 1);
  const slide = slides[safeIdx];
  return (
    <div className="py-4" data-testid="block-slider">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className="relative rounded-xl overflow-hidden bg-muted/20 border">
        {slide.imageUrl && (
          <img
            src={slide.imageUrl}
            alt={slide.heading}
            className="w-full aspect-[16/9] object-cover"
          />
        )}
        <div
          className={`${slide.imageUrl ? "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent" : ""} p-4 sm:p-8`}
        >
          {slide.heading && (
            <h3
              className={`text-xl font-heading font-bold mb-2 ${slide.imageUrl ? "text-white" : ""}`}
            >
              {slide.heading}
            </h3>
          )}
          {slide.description && (
            <p className={`text-sm ${slide.imageUrl ? "text-white/80" : "text-muted-foreground"}`}>
              {slide.description}
            </p>
          )}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
            data-testid="button-slider-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-accent" : "bg-muted-foreground/30"}`}
                onClick={() => setCurrent(i)}
                data-testid={`button-slider-dot-${i}`}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={() => setCurrent((c) => (c + 1) % slides.length)}
            data-testid="button-slider-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function StatsBarBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ icon: string; value: string; label: string }>(props.items);
  return (
    <div className="py-6 bg-muted/30 rounded-xl" data-testid="block-stats-bar">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6 px-4" />
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-center gap-3 rounded-xl border border-border/50 bg-background/70 px-4 py-4 text-center sm:justify-start"
            data-testid={`stats-bar-item-${i}`}
          >
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <LucideIcon name={item.icon || "Star"} className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IconGridBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "4";
  const colsClass =
    cols === "2"
      ? "sm:grid-cols-2"
      : cols === "3"
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : cols === "5"
          ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          : "sm:grid-cols-2 lg:grid-cols-4";
  const items = arr<{ icon: string; title: string }>(props.items);
  return (
    <div className="py-4" data-testid="block-icon-grid">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className={`grid grid-cols-1 ${colsClass} gap-4`}>
        {items.map((item, i) => (
          <div
            key={i}
            className="flex min-w-0 flex-col items-center gap-3 rounded-xl border p-4 text-center transition-shadow hover:shadow-sm sm:p-5"
            data-testid={`icon-grid-item-${i}`}
          >
            <div className="flex h-12 w-12 rounded-xl bg-accent/10 items-center justify-center">
              <LucideIcon name={item.icon || "Globe"} className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-medium leading-snug break-words">{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BenefitStackBlock({ props }: { props: Record<string, unknown> }) {
  const layout = str(props.layout) || "stack";
  const items = arr<{ icon: string; title: string; description: string }>(props.items);
  const isTimeline = layout === "timeline";
  return (
    <div className="py-4" data-testid="block-benefit-stack">
      <SectionHeading props={props} defaultAlignment="left" className="mb-8" />
      <div className={`relative ${isTimeline ? "pl-8" : ""}`}>
        {isTimeline && <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-accent/20" />}
        <div className={isTimeline ? "space-y-6" : "space-y-4"}>
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-4 ${isTimeline ? "relative" : "p-4 rounded-lg border"}`}
              data-testid={`benefit-item-${i}`}
            >
              {isTimeline && (
                <div className="absolute -left-5 top-1 h-4 w-4 rounded-full bg-accent border-2 border-background" />
              )}
              <div
                className={`h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 ${isTimeline ? "" : ""}`}
              >
                <LucideIcon name={item.icon || "CheckCircle"} className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ScienceExplainerBlock({ props }: { props: Record<string, unknown> }) {
  const citations = arr<{ text: string; url: string }>(props.citations);
  return (
    <div className="py-4" data-testid="block-science-explainer">
      <SectionHeading props={props} defaultAlignment="left" className="mb-6" />
      {str(props.body) && (
        <div
          className="prose prose-sm max-w-none text-foreground mb-6"
          dangerouslySetInnerHTML={{ __html: str(props.body) }}
        />
      )}
      {citations.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Sources
          </p>
          <ol className="space-y-1">
            {citations.map((c, i) => (
              <li key={i} className="text-xs text-muted-foreground" data-testid={`citation-${i}`}>
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-2 hover:text-accent/80"
                  >
                    {c.text}
                  </a>
                ) : (
                  c.text
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function SafetyChecklistBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ text: string; required: boolean }>(props.items);
  return (
    <div className="py-4" data-testid="block-safety-checklist">
      <SectionHeading props={props} defaultAlignment="left" className="mb-6" />
      <div className="space-y-3 max-w-2xl">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3" data-testid={`checklist-item-${i}`}>
            <CheckCircle
              className={`h-5 w-5 flex-shrink-0 mt-0.5 ${item.required ? "text-accent" : "text-muted-foreground/50"}`}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm">{item.text}</span>
              {item.required && (
                <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                  Required
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {str(props.disclaimer) && (
        <p className="text-xs text-muted-foreground mt-6 italic border-t pt-4">
          {str(props.disclaimer)}
        </p>
      )}
    </div>
  );
}

export function GuaranteeWarrantyBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ text: string } | string>(props.items);
  return (
    <div className="py-4" data-testid="block-guarantee-warranty">
      <div className="rounded-2xl bg-accent/5 border border-accent/20 p-8 text-center">
        <BadgeCheck className="h-10 w-10 text-accent mx-auto mb-4" />
        <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
        <ul className="space-y-2 max-w-lg mx-auto text-left mb-6">
          {items.map((item, i) => {
            const text = typeof item === "string" ? item : (item as { text: string }).text;
            return (
              <li key={i} className="flex items-start gap-2" data-testid={`guarantee-item-${i}`}>
                <CheckCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm">{text}</span>
              </li>
            );
          })}
        </ul>
        {str(props.ctaText) && (
          <FormModalButton
            label={str(props.ctaText)}
            action={props.ctaAction}
            href={props.ctaLink}
            openInNewTab={props.ctaOpenInNewTab}
            formSlug={props.ctaFormSlug}
            modalTitle={props.ctaModalTitle}
            modalDescription={props.ctaModalDescription}
            className="bg-accent text-accent-foreground"
          />
        )}
      </div>
    </div>
  );
}

export function DeliverySetupBlock({ props }: { props: Record<string, unknown> }) {
  const steps = arr<{ step: string; title: string; description: string }>(props.steps);
  const includedItems = arr<{ text: string } | string>(props.includedItems);
  return (
    <div className="py-4" data-testid="block-delivery-setup">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="max-w-3xl mx-auto mb-8">
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4 sm:gap-6" data-testid={`setup-step-${i}`}>
              <div className="relative flex w-12 flex-shrink-0 justify-center">
                {i < steps.length - 1 ? (
                  <div className="absolute left-1/2 top-12 h-[calc(100%+1.5rem)] w-0.5 -translate-x-1/2 bg-border hidden sm:block" />
                ) : null}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm">
                  {step.step}
                </div>
              </div>
              <div className="pt-2">
                <h3 className="font-semibold text-sm sm:text-base mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {includedItems.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-4 sm:p-6 max-w-3xl mx-auto">
          <h3 className="font-semibold text-sm mb-3">What's Included</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {includedItems.map((item, i) => {
              const text = typeof item === "string" ? item : (item as { text: string }).text;
              return (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                  {text}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function RecoveryUseCasesBlock({ props }: { props: Record<string, unknown> }) {
  const personas = arr<{ icon: string; title: string; description: string }>(props.personas);
  return (
    <div className="py-4" data-testid="block-recovery-use-cases">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {personas.map((p, i) => (
          <Card
            key={i}
            className="text-center hover:shadow-md transition-shadow"
            data-testid={`persona-card-${i}`}
          >
            <CardContent className="pt-8 pb-6">
              <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <LucideIcon name={p.icon || "User"} className="h-7 w-7 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ProtocolBuilderBlock({ props }: { props: Record<string, unknown> }) {
  const level = str(props.level) || "beginner";
  const steps = arr<{ title: string; description: string }>(props.steps);
  const levelColors: Record<string, string> = {
    beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    intermediate: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    advanced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return (
    <div className="py-4" data-testid="block-protocol-builder">
      <div className="flex flex-wrap items-start gap-3 mb-6">
        <SectionHeading props={props} defaultAlignment="left" className="flex-1 min-w-[220px]" />
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${levelColors[level] || levelColors.beginner}`}
        >
          {level}
        </span>
      </div>
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4 items-start" data-testid={`protocol-step-${i}`}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
              {i + 1}
            </div>
            <div className="flex-1 border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
