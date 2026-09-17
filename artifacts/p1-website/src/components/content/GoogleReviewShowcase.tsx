import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Star } from "lucide-react";
import { GOOGLE_BUSINESS_URL } from "@/lib/site";

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
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/p1/google-reviews", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Reviews unavailable");
        return response.json();
      })
      .then(payload => setData(payload))
      .catch(error => { if (error.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, []);

  const scroll = (direction: -1 | 1) => {
    track.current?.scrollBy({ left: direction * 340, behavior: "smooth" });
  };

  if (failed || !data || !Array.isArray(data.reviews) || data.reviews.length === 0 || !Number.isFinite(data.averageRating) || !data.totalReviewCount) return <VerifiedGoogleRating />;

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
              {data?.totalReviewCount != null && <p className="mt-1 text-sm font-semibold text-secondary">Based on {data.totalReviewCount} reviews</p>}
            </div>
            <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              View our Google profile <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </article>

          {!data && Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="min-h-72 w-[17rem] shrink-0 animate-pulse snap-start border border-border bg-background p-6 sm:w-[18rem]" aria-hidden="true">
              <div className="h-10 w-10 rounded-full bg-muted" /><div className="mt-6 h-4 w-28 bg-muted" /><div className="mt-7 h-3 w-full bg-muted" /><div className="mt-3 h-3 w-5/6 bg-muted" /><div className="mt-3 h-3 w-2/3 bg-muted" />
            </div>
          ))}

          {data?.reviews.map(review => (
            <article key={review.id} className="flex min-h-72 w-[17rem] shrink-0 snap-start flex-col border border-border bg-background p-6 sm:w-[18rem]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary" aria-hidden="true">{initials(review.author)}</div>
                <div className="min-w-0"><h3 className="truncate font-bold text-secondary">{review.author}</h3>{reviewDate(review.updateTime) && <p className="text-xs text-secondary/55">{reviewDate(review.updateTime)}</p>}</div>
              </div>
              <div className="mt-5"><ReviewStars /></div>
              <blockquote className="mt-5 line-clamp-6 flex-1 text-[15px] leading-relaxed text-secondary/75">“{review.comment}”</blockquote>
              <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                View on Google <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


/** Manually verified on the public Google profile; never presented as a live feed. */
function VerifiedGoogleRating() {
  return (
    <section className="border-y border-border bg-white py-10" aria-labelledby="google-rating-heading">
      <div className="site-shell flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-clay-ink">Customer feedback</p>
          <h2 id="google-rating-heading" className="mt-2 font-display text-2xl font-semibold text-secondary">Rated 5.0 on Google</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3"><ReviewStars /><span className="text-sm font-semibold text-secondary">7 five-star reviews</span></div>
          <p className="mt-3 text-xs text-secondary/65">Google profile rating as of September 17, 2026.</p>
        </div>
        <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-primary px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Read all reviews on Google <ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
      </div>
    </section>
  );
}
