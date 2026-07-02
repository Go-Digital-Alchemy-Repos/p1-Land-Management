import { Link, useLocation } from "wouter";

const CATALOG: [string, string][] = [
  ["Commercial Property Management", "/services/commercial-property-management"],
  ["Grading & Site Preparation", "/services/grading-site-preparation"],
  ["Drainage Solutions", "/services/drainage"],
  ["Land Clearing", "/services/land-clearing"],
  ["Ponds & Waterway Management", "/services/pond-waterway-management"],
  ["Tree Services", "/services/tree-services"],
  ["Turf & Seeding", "/services/turf-installation-seeding"],
  ["Industrial & Agricultural", "/services/industrial-agricultural"],
  ["Reconstruction", "/services/property-reconstruction"],
];

export function IndexOfWork() {
  const [rawLocation] = useLocation();
  const location = rawLocation.replace(/\/+$/, "") || "/";
  const current = CATALOG.find(([, href]) => href === location);
  const rest = CATALOG.filter(([, href]) => href !== location);
  const items = (current ? [current, ...rest] : rest).slice(0, 5);

  return (
    <div className="w-full max-w-[260px] border-l pl-6" style={{ borderColor: "hsl(40 30% 90% / 0.22)" }}>
      <div className="mb-5 font-sans text-[10px] font-bold uppercase text-tan" style={{ letterSpacing: "0.3em" }}>
        Index of Work
      </div>
      {items.map(([t, href], i) => {
        const isCurrent = current?.[1] === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className="group flex items-baseline gap-3 border-b py-2.5 transition-colors"
            style={{ borderColor: "hsl(40 30% 90% / 0.14)" }}
          >
            <span className="font-sans text-[11px] font-semibold tabular-nums text-tan">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={`font-sans text-sm font-medium transition-colors group-hover:text-tan ${
                isCurrent ? "text-tan" : "text-white/90"
              }`}
            >
              {t}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
