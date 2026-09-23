import { ArrowUpRight } from "lucide-react";

export type NeedsYouItem = {
  kind: "completed-work" | "old-requests" | "agreement-charges" | "unassigned-work" | "new-inquiries" | "client-estimates";
  count: number;
  href: string;
};

const language: Record<NeedsYouItem["kind"], { message: (count: number) => string; action: string }> = {
  "completed-work": { message: (n) => `${n} finished ${n === 1 ? "job is" : "jobs are"} waiting for your review`, action: "Review" },
  "old-requests": { message: (n) => `${n} ${n === 1 ? "request has" : "requests have"} had no reply in 2+ days`, action: "Reply" },
  "agreement-charges": { message: (n) => `${n} cancelled ${n === 1 ? "agreement has a charge" : "agreements have charges"} to settle`, action: "Review" },
  "unassigned-work": { message: (n) => `Tomorrow: ${n} ${n === 1 ? "job has" : "jobs have"} no crew`, action: "Assign" },
  "new-inquiries": { message: (n) => `${n} new commercial ${n === 1 ? "inquiry" : "inquiries"}`, action: "Open" },
  "client-estimates": { message: (n) => `${n === 1 ? "An estimate is" : `${n} estimates are`} waiting for your approval`, action: "Review estimate" },
};

export function OverviewMetrics({ items, onNavigate }: {
  items: { label: string; value: number; detail: string; href: string }[];
  onNavigate: (href: string) => void;
}) {
  return <div className="metrics">{items.map((item) => <a key={item.href + item.label} className="metric metric-link" href={item.href}
    aria-label={`${item.label}: ${item.value}. Open list.`}
    onClick={(event) => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onNavigate(item.href); } }}>
    <p>{item.label}<ArrowUpRight size={17} aria-hidden="true" /></p>
    <strong>{item.value}</strong><small>{item.detail}</small>
  </a>)}</div>;
}

export function NeedsYouList({ items, loading, error, onNavigate }: {
  items: NeedsYouItem[];
  loading: boolean;
  error: boolean;
  onNavigate: (href: string) => void;
}) {
  return <section className="panel needs-you" aria-label="Needs you">
    <div className="panel-heading"><h2>Needs you</h2></div>
    {loading ? <p role="status">Checking what needs your attention…</p>
      : error ? <p role="alert">Priorities could not load. Refresh to try again.</p>
      : items.length ? <ul>{items.map((item) => <li key={item.kind}>
          <span>{language[item.kind].message(item.count)}</span>
          <a href={item.href} onClick={(event) => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onNavigate(item.href); } }}>{language[item.kind].action}<ArrowUpRight size={15} aria-hidden="true" /></a>
        </li>)}</ul>
      : <p>You're caught up. Nothing needs you right now.</p>}
  </section>;
}
