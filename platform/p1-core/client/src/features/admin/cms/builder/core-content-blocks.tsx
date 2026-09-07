import { ArrowRight, Quote } from "lucide-react";
import { FormModalButton } from "@/components/forms/form-modal-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { SectionHeading } from "./section-heading";
import { LucideIcon } from "./block-icons";
import { arr, getMobileImageStyles, str } from "./block-renderer.shared";

export function TwoColumnTextBlock({ props }: { props: Record<string, unknown> }) {
  const leftItems = arr<{ text: string }>(props.leftItems);
  const rightItems = arr<{ text: string }>(props.rightItems);
  const columns = [
    {
      heading: str(props.leftHeading),
      body: str(props.leftBody),
      items: leftItems,
    },
    {
      heading: str(props.rightHeading),
      body: str(props.rightBody),
      items: rightItems,
    },
  ];

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className="grid gap-8 md:grid-cols-2">
        {columns.map((column, index) => (
          <div key={index} className="space-y-4">
            {column.heading && (
              <h3 className="text-xl font-heading font-semibold">{column.heading}</h3>
            )}
            {column.body && (
              <div
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: column.body }}
              />
            )}
            {column.items.length > 0 && (
              <ul className="space-y-2 pl-5 list-disc text-sm text-muted-foreground">
                {column.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item.text}</li>
                ))}
              </ul>
            )}
            {!column.heading && !column.body && column.items.length === 0 && (
              <p className="text-sm text-muted-foreground">Add content for this column.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalloutBoxBlock({ props }: { props: Record<string, unknown> }) {
  const variant = str(props.variant) || "accent";
  const variantClass =
    variant === "neutral"
      ? "bg-muted/40 border"
      : variant === "outline"
        ? "bg-background border-2"
        : "bg-accent/10 border border-accent/20";

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className={`rounded-2xl p-5 sm:p-8 ${variantClass}`}>
        <div
          className="prose prose-sm max-w-none break-words text-foreground"
          dangerouslySetInnerHTML={{ __html: str(props.content) || "<p>Add callout content.</p>" }}
        />
        {str(props.ctaText) && (
          <div className="mt-6">
            <FormModalButton
              label={str(props.ctaText)}
              action={props.ctaAction}
              href={props.ctaLink}
              openInNewTab={props.ctaOpenInNewTab}
              formSlug={props.ctaFormSlug}
              modalTitle={props.ctaModalTitle}
              modalDescription={props.ctaModalDescription}
              className="w-full sm:w-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function LinkListBlock({ props }: { props: Record<string, unknown> }) {
  const links = arr<{ label: string; description: string; url: string }>(props.links);
  const gridClass = str(props.columns) === "2" ? "md:grid-cols-2" : "md:grid-cols-1";

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      <div className={`grid grid-cols-1 gap-4 ${gridClass}`}>
        {links.length === 0 ? (
          <div className="text-sm text-muted-foreground">Add links to display here.</div>
        ) : (
          links.map((link, index) => (
            <a
              key={index}
              href={link.url || "#"}
              className="group rounded-xl border p-4 transition-shadow hover:shadow-md sm:p-5"
              data-testid={`link-list-item-${index}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold break-words transition-colors group-hover:text-accent">
                    {link.label || "Untitled link"}
                  </h3>
                  {link.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {link.description}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

export function SectionHeaderBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <SectionHeading
      props={props}
      defaultAlignment="center"
      className="py-4"
      titleClassName="text-3xl font-heading font-bold"
      fallbackTitle="Section Title"
    />
  );
}

export function RichTextBlock({ props }: { props: Record<string, unknown> }) {
  const align = str(props.alignment) || "left";
  const textAlign =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return (
    <div>
      <SectionHeading
        props={props}
        defaultAlignment={align === "right" ? "right" : align === "center" ? "center" : "left"}
        className="mb-6"
      />
      <div
        className={`prose prose-sm max-w-none ${textAlign} text-foreground`}
        dangerouslySetInnerHTML={{ __html: str(props.content) || "<p>No content.</p>" }}
      />
    </div>
  );
}

export function TextImageBlock({ props }: { props: Record<string, unknown> }) {
  const imageRight = str(props.imagePosition) !== "left";
  const hasImage = !!str(props.imageUrl);
  const mobileImageStyles = getMobileImageStyles(props);
  const align = str(props.alignment) || "left";
  const bodyAlign =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <div
      className={`flex flex-col ${imageRight ? "md:flex-row" : "md:flex-row-reverse"} gap-8 py-4 md:items-stretch`}
    >
      <div className="min-w-0 flex-1 space-y-3">
        <SectionHeading
          props={props}
          defaultAlignment={align === "center" ? "center" : align === "right" ? "right" : "left"}
          className="mb-4"
        />
        {str(props.body) && (
          <div
            className={`prose prose-sm max-w-none text-foreground ${bodyAlign}`}
            dangerouslySetInnerHTML={{ __html: str(props.body) }}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 self-stretch flex-col">
        {hasImage ? (
          <div className="flex h-full flex-col">
            <div className="relative min-h-72 md:h-full md:min-h-0 md:flex-1">
              <img
                src={str(props.imageUrl)}
                alt={str(props.imageAlt)}
                style={mobileImageStyles}
                className="w-full rounded-xl [height:var(--mobile-image-height)] [object-fit:var(--mobile-image-fit)] [object-position:var(--mobile-image-position)] md:absolute md:inset-0 md:h-full md:w-full md:object-cover md:object-center"
              />
            </div>
            {str(props.imageCaption) && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {str(props.imageCaption)}
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed bg-muted/40">
            <span className="text-muted-foreground text-sm">Image placeholder</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CtaBlock({ props }: { props: Record<string, unknown> }) {
  const variant = str(props.variant) || "dark";
  const bgClass =
    variant === "dark"
      ? "bg-foreground text-background"
      : variant === "accent"
        ? "bg-accent text-accent-foreground"
        : "bg-muted/40 border";
  return (
    <div className={`px-4 py-10 text-center sm:px-8 sm:py-14 ${bgClass}`}>
      <h2 className="mb-3 text-2xl font-heading font-bold leading-tight sm:text-3xl md:text-4xl">
        {str(props.heading) || "Ready to Get Started?"}
      </h2>
      {str(props.subheading) && (
        <div
          className={`mb-8 mx-auto max-w-xl text-sm leading-relaxed sm:text-base [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:opacity-80 [&_p]:m-0 ${variant === "light" ? "text-muted-foreground [&_a]:text-primary" : "opacity-80 [&_a]:text-current"}`}
          dangerouslySetInnerHTML={{ __html: str(props.subheading) }}
        />
      )}
      <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
        {str(props.primaryText) && (
          <FormModalButton
            label={str(props.primaryText)}
            action={props.primaryAction}
            href={props.primaryLink}
            openInNewTab={props.primaryOpenInNewTab}
            formSlug={props.primaryFormSlug}
            modalTitle={props.primaryModalTitle}
            modalDescription={props.primaryModalDescription}
            size="lg"
            variant={variant === "dark" ? "secondary" : "default"}
            className="w-full sm:w-auto"
            testId="cta-primary"
          />
        )}
        {str(props.secondaryText) && (
          <FormModalButton
            label={str(props.secondaryText)}
            action={props.secondaryAction}
            href={props.secondaryLink}
            openInNewTab={props.secondaryOpenInNewTab}
            formSlug={props.secondaryFormSlug}
            modalTitle={props.secondaryModalTitle}
            modalDescription={props.secondaryModalDescription}
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
            testId="cta-secondary"
          />
        )}
      </div>
    </div>
  );
}

export function CardsGridBlock({ props }: { props: Record<string, unknown> }) {
  const cols = str(props.columns) || "3";
  const colsClass =
    cols === "2" ? "md:grid-cols-2" : cols === "4" ? "md:grid-cols-4" : "md:grid-cols-3";
  const cards = arr<{ title: string; description: string; icon: string }>(props.cards);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      <div className={`grid grid-cols-1 ${colsClass} gap-4 sm:gap-6`}>
        {cards.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">
            Add cards to display here
          </div>
        ) : (
          cards.map((card, i) => (
            <Card
              key={i}
              className="h-full overflow-hidden text-center transition-shadow hover:shadow-md"
            >
              <CardContent className="px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-8">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <LucideIcon name={card.icon || "Globe"} className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-base font-semibold leading-snug break-words">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export function FaqBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ question: string; answer: string }>(props.items);
  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="left" className="mb-8" />
      <Accordion type="single" collapsible className="space-y-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground">Add FAQ items to display here.</p>
        ) : (
          items.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
              <AccordionTrigger className="font-medium text-left">{item.question}</AccordionTrigger>
              <AccordionContent>
                <div
                  className="text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80 [&_p]:m-0"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </AccordionContent>
            </AccordionItem>
          ))
        )}
      </Accordion>
    </div>
  );
}

export function TestimonialsBlock({ props }: { props: Record<string, unknown> }) {
  const items = arr<{ quote: string; name: string; role: string; location: string }>(props.items);
  const shouldCarousel = items.length > 2;

  const renderCard = (
    item: { quote: string; name: string; role: string; location: string },
    i: number,
  ) => (
    <Card key={i} className="bg-muted/30 h-full">
      <CardContent className="pt-6">
        <Quote className="h-5 w-5 text-accent mb-3" />
        <p className="text-sm leading-relaxed mb-4 italic">"{item.quote}"</p>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-accent">{item.name?.[0] ?? "?"}</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {item.role}
              {item.location ? ` · ${item.location}` : ""}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-8" />
      {items.length === 0 ? (
        <p className="text-muted-foreground">Add testimonials to display here.</p>
      ) : shouldCarousel ? (
        <div>
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-6">
              {items.map((item, i) => (
                <CarouselItem key={i} className="pl-6 basis-full md:basis-1/2">
                  {renderCard(item, i)}
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="mt-6 flex items-center justify-center gap-3">
              <CarouselPrevious className="static h-9 w-9 translate-x-0 translate-y-0 border-border/70 bg-background/95" />
              <CarouselNext className="static h-9 w-9 translate-x-0 translate-y-0 border-border/70 bg-background/95" />
            </div>
          </Carousel>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item, i) => renderCard(item, i))}
        </div>
      )}
    </div>
  );
}
