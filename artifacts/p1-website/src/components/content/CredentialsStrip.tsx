import { siteFacts } from "@/content/site-facts";

export function CredentialsStrip() {
  const rating = Number(siteFacts.GOOGLE_RATING);
  const reviewCount = Number(siteFacts.GOOGLE_REVIEW_COUNT);
  const items = [
    siteFacts.LICENSE_LIST && ["Licensed in NC and SC", siteFacts.LICENSE_LIST],
    siteFacts.INSURANCE_SUMMARY && ["Fully insured", siteFacts.INSURANCE_SUMMARY],
    siteFacts.COI_TURNAROUND && ["COI on request", siteFacts.COI_TURNAROUND],
    ["Close to 30 years in Carolina land work", ""],
    Number.isFinite(rating) && reviewCount >= 20 && [`${siteFacts.GOOGLE_RATING} on Google (${siteFacts.GOOGLE_REVIEW_COUNT} reviews)`, ""],
  ].filter(Boolean) as [string, string][];

  return <section data-component="credentials-strip" className="border-y border-border bg-muted/60">
    <div className="site-shell grid gap-5 py-7 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, detail]) => <div key={label}>
        <p className="font-serif font-bold text-secondary">{label}</p>
        {detail && <p className="mt-1 text-sm text-secondary/70">{detail}</p>}
      </div>)}
    </div>
  </section>;
}
