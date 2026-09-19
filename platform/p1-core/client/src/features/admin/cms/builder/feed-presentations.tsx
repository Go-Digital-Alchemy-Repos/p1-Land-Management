import React from "react";
import { CalendarDays, BookOpen } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  FormModalButton,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Link,
} from "./static-renderer-host";
import { getImageObjectPositionStyle } from "../../../../lib/image-focus";
import { getEventPath } from "../../../../../../shared/event-url";
import { SectionHeading } from "./section-heading";
import { str, num } from "./block-renderer.shared";
export function EventsPreviewBlockPresentation({
  props,
  events,
}: {
  props: Record<string, unknown>;
  events: any[];
}) {
  const limit = num(props.limit, 4);
  const ctaText = str(props.ctaText);
  const ctaLink = str(props.ctaLink);
  const visible = (events ?? []).filter((e) => new Date(e.date) > new Date()).slice(0, limit);
  const shouldCarousel = visible.length > 4;

  const renderEventCard = (e: {
    id: string;
    slug?: string | null;
    title: string;
    date: string;
    isVirtual: boolean;
    imageUrl?: string | null;
    imagePositionX?: number | null;
    imagePositionY?: number | null;
  }) => (
    <Link key={e.id} href={getEventPath(e)} className="w-full max-w-[13.5rem]">
      <Card
        className="mx-auto h-full w-full max-w-[13.5rem] overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
        data-testid={`event-preview-${e.id}`}
      >
        {e.imageUrl && (
          <div className="aspect-[16/10] overflow-hidden" data-testid={`img-event-preview-${e.id}`}>
            <img
              src={e.imageUrl}
              alt={e.title}
              className="h-full w-full object-cover"
              style={getImageObjectPositionStyle(e.imagePositionX, e.imagePositionY)}
            />
          </div>
        )}
        <CardContent className={e.imageUrl ? "p-3.5" : "pt-3.5"}>
          <p className="mb-1 text-xs font-medium text-accent">
            {new Date(e.date).toLocaleDateString()}
          </p>
          <p className="line-clamp-2 text-sm font-semibold">{e.title}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {e.isVirtual ? "Virtual" : "In Person"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      {visible.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Upcoming events will appear here</p>
        </div>
      ) : shouldCarousel ? (
        <div>
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {visible.map((e) => (
                <CarouselItem
                  key={e.id}
                  className="pl-4 basis-[70%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  {renderEventCard(e)}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((e) => renderEventCard(e))}
        </div>
      )}
      {ctaText && (
        <div className="mt-6 flex justify-center">
          <FormModalButton
            label={ctaText}
            action={props.ctaAction}
            href={ctaLink}
            openInNewTab={props.ctaOpenInNewTab}
            formSlug={props.ctaFormSlug}
            modalTitle={props.ctaModalTitle}
            modalDescription={props.ctaModalDescription}
          />
        </div>
      )}
    </div>
  );
}

export function BlogPreviewBlockPresentation({
  props,
  posts,
}: {
  props: Record<string, unknown>;
  posts: any[];
}) {
  const limit = num(props.limit, 5);
  const enableHoverMotion = props.enableHoverMotion !== false;
  const visible = (posts ?? []).filter((p) => p.isPublished).slice(0, limit);
  const shouldCarousel = visible.length > 5;

  const renderBlogCard = (p: {
    id: string;
    title: string;
    excerpt: string;
    slug: string;
    coverImageUrl?: string | null;
    coverImagePositionX?: number | null;
    coverImagePositionY?: number | null;
  }) => (
    <Link key={p.id} href={`/insights/${p.slug}`} className="w-full max-w-[13.5rem]">
      <Card
        className={`mx-auto h-full w-full max-w-[13.5rem] overflow-hidden cursor-pointer ${enableHoverMotion ? "blog-card-motion" : ""}`}
        data-testid={`blog-preview-${p.id}`}
      >
        {p.coverImageUrl && (
          <div className="aspect-[16/10] overflow-hidden">
            <img
              src={p.coverImageUrl}
              alt={p.title}
              className="h-full w-full object-cover"
              style={getImageObjectPositionStyle(p.coverImagePositionX, p.coverImagePositionY)}
              data-blog-card-image
              data-testid={`img-blog-preview-${p.id}`}
            />
          </div>
        )}
        <CardContent className={p.coverImageUrl ? "p-3.5" : "pt-3.5"}>
          <p className="mb-1 line-clamp-2 text-sm font-semibold">{p.title}</p>
          <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
            {p.excerpt}
          </p>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="py-4">
      <SectionHeading props={props} defaultAlignment="center" className="mb-6" />
      {visible.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p className="text-sm">Blog articles will appear here</p>
        </div>
      ) : shouldCarousel ? (
        <div>
          <Carousel
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {visible.map((p) => (
                <CarouselItem
                  key={p.id}
                  className="pl-4 basis-[70%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/5"
                >
                  {renderBlogCard(p)}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {visible.map((p) => renderBlogCard(p))}
        </div>
      )}
      {visible.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Link href="/insights">
            <Button variant="outline" size="lg">
              Read More Articles
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
