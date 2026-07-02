import { Link } from "wouter";

const ITEMS: [string, string, string][] = [
  ["01", "Commercial Property Management", "/services/commercial-property-management"],
  ["02", "Grading", "/services/grading-site-preparation"],
  ["03", "Drainage", "/services/drainage"],
  ["04", "Clearing", "/services/land-clearing"],
  ["05", "Ponds", "/services/pond-waterway-management"],
];

export function IndexOfWork() {
  return (
    <div className="w-full max-w-[260px] border-l pl-6" style={{ borderColor: "hsl(40 30% 90% / 0.22)" }}>
      <div className="mb-5 font-sans text-[10px] font-bold uppercase text-tan" style={{ letterSpacing: "0.3em" }}>
        Index of Work
      </div>
      {ITEMS.map(([n, t, href]) => (
        <Link
          key={n}
          href={href}
          className="group flex items-baseline justify-between gap-3 border-b py-2.5 transition-colors"
          style={{ borderColor: "hsl(40 30% 90% / 0.14)" }}
        >
          <span className="font-sans text-[11px] font-semibold tabular-nums text-tan">{n}</span>
          <span className="font-sans text-sm font-medium text-white/90 transition-colors group-hover:text-tan">{t}</span>
        </Link>
      ))}
    </div>
  );
}
