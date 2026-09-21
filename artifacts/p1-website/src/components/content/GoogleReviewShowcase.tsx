import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Star } from "lucide-react";
import { useSiteIdentity } from "@/lib/use-site-identity";

type Review = {
  id: string;
  author: string;
  comment: string;
  createTime: string | null;
  updateTime: string | null;
};

type ReviewResponse = {
  averageRating: number | null;
  totalReviewCount: number | null;
  reviews: Review[];
};

/**
 * Manually verified against P1's public Google Business Profile on September 21,
 * 2026. Keep this fallback until the Business Profile API waiting period ends;
 * a successful API response replaces it without changing the presentation.
 */
const STATIC_GOOGLE_REVIEWS: ReviewResponse = {
  averageRating: 5,
  totalReviewCount: 6,
  reviews: [
    {
      id: "google-static-dalton-spiker",
      author: "Dalton Spiker",
      comment: "Great guy to work with! Had a pond with a lot of growth and Duke and his crew cleaned it up fast!",
      createTime: "2026-09-16T12:00:00-04:00",
      updateTime: "2026-09-16T12:00:00-04:00",
    },
    {
      id: "google-static-mark-webster",
      author: "Mark Webster",
      comment: "P1 did a great job",
      createTime: "2026-09-16T12:00:00-04:00",
      updateTime: "2026-09-16T12:00:00-04:00",
    },
    {
      id: "google-static-duke-seiler",
      author: "Duke Seiler",
      comment: "Does great drainage work. Property is dry even through the heaviest of rains",
      createTime: "2026-09-16T12:00:00-04:00",
      updateTime: "2026-09-16T12:00:00-04:00",
    },
    {
      id: "google-static-kt-hope",
      author: "KT Hope",
      comment: "P1 Land Management did an excellent job! They were professional, dependable, and great to work with from start to finish. The quality of their work really shows, and they took the time to make sure everything was done right. I highly recommend P1 Land Management to anyone looking for reliable, high-quality land management services!",
      createTime: "2026-09-15T12:00:00-04:00",
      updateTime: "2026-09-15T12:00:00-04:00",
    },
    {
      id: "google-static-brandon-nash",
      author: "Brandon Nash",
      comment: "I would highly recommend the staff at P1! Not only is their work top notch, their communication is great as well. The young lady in the office is the best person to get the job done and handled efficiently. She is the glue that makes them the best!",
      createTime: "2026-09-15T12:00:00-04:00",
      updateTime: "2026-09-15T12:00:00-04:00",
    },
  ],
};

function ReviewStars() {
  return (
    <div className="flex gap-1" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden="true" />
      ))}
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "P1";
}

function reviewDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

export function GoogleReviewShowcase() {
  const identity = useSiteIdentity();
  const [data, setData] = useState<ReviewResponse>(STATIC_GOOGLE_REVIEWS);
  const [usingLiveFeed, setUsingLiveFeed] = useState(false);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/p1/google-reviews", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Reviews unavailable");
        return response.json();
      })
      .then((payload: ReviewResponse) => {
        if (!Array.isArray(payload.reviews) || payload.reviews.length === 0 || !Number.isFinite(payload.averageRating) || !payload.totalReviewCount) return;
        setData(payload);
        setUsingLiveFeed(true);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const scroll = (direction: -1 | 1) => {
    track.current?.scrollBy({ left: direction * 340, behavior: "smooth" });
  };

  return (
    <section className="border-y border-border bg-white py-16" aria-labelledby="customer-reviews-heading">
      <div className="site-shell">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase text-clay-ink" style={{ letterSpacing: "0.22em" }}>Customer feedback</p>
            <h2 id="customer-reviews-heading" className="mt-3 font-display text-2xl font-semibold text-secondary md:text-3xl">
              What Do Our Customers Think About Us?
            </h2>
          </div>
          <div className="hidden shrink-0 gap-2 sm:flex" aria-label="Review carousel controls">
            <button type="button" onClick={() => scroll(-1)} className="inline-flex h-10 w-10 items-center justify-center border border-border text-secondary transition-colors hover:border-primary hover:text-primary" aria-label="Previous reviews">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => scroll(1)} className="inline-flex h-10 w-10 items-center justify-center border border-border text-secondary transition-colors hover:border-primary hover:text-primary" aria-label="Next reviews">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div ref={track} className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
          <article className="flex min-h-72 w-[17rem] shrink-0 snap-start flex-col justify-between border border-border bg-muted p-6 sm:w-[18rem]">
            <div>
              <p className="font-display text-5xl font-light text-secondary">{data?.averageRating?.toFixed(1) ?? "—"}</p>
              <div className="mt-4"><ReviewStars /></div>
              <p className="mt-4 text-sm text-secondary/70">Rating on Google</p>
              <p className="mt-1 text-sm font-semibold text-secondary">Based on {data.totalReviewCount} reviews</p>
              {!usingLiveFeed && <p className="mt-2 text-xs leading-relaxed text-secondary/55">Reviews verified on Google September 21, 2026.</p>}
            </div>
            <a href={identity.googleBusinessUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              View our Google profile <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </article>

          {data.reviews.map(review => (
            <article key={review.id} className="flex min-h-72 w-[17rem] shrink-0 snap-start flex-col border border-border bg-background p-6 sm:w-[18rem]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary" aria-hidden="true">{initials(review.author)}</div>
                <div className="min-w-0"><h3 className="truncate font-bold text-secondary">{review.author}</h3>{reviewDate(review.updateTime) && <p className="text-xs text-secondary/55">{reviewDate(review.updateTime)}</p>}</div>
              </div>
              <div className="mt-5"><ReviewStars /></div>
              <blockquote className="mt-5 flex-1 text-[15px] leading-relaxed text-secondary/75">“{review.comment}”</blockquote>
              <a href={identity.googleBusinessUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                View on Google <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
