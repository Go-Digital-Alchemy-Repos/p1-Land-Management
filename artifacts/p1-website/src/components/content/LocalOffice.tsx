import { siteFacts } from "@/content/site-facts";

export function LocalOffice({ slug }: { slug: string }) {
  const office = siteFacts.offices.find((item) => item.slug === slug);
  if (!office) return null;
  return <section className="rounded-xl border border-border bg-card p-7">
    <h2 className="font-display text-2xl text-secondary">P1 {office.town} office</h2>
    <p className="mt-3 text-secondary/80">{office.street}, {office.town}, {office.state} {office.zip}</p>
    <p className="text-secondary/80">{office.phone} · {office.hours}</p>
    <p className="mt-4 text-secondary/80">Our {office.town} crew handles work across {office.coverage}.</p>
  </section>;
}
