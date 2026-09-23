import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Result = { kind: string; id: string; title: string; subtitle: string; href: string };

export function GlobalSearch({ userId, onNavigate }: { userId: string; onNavigate: (href: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [recent, setRecent] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const recentCache = useRef<Result[]>([]);
  const close = () => { setOpen(false); window.requestAnimationFrame(() => trigger.current?.focus()); };
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen(true);
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { recentCache.current = []; setRecent([]); setResults([]); setQuery(""); }, [userId]);
  useEffect(() => {
    if (!open || !recentCache.current.length) return;
    // Re-check previous selections against current server permissions before
    // rendering their names after a role or grant change.
    const controller = new AbortController();
    setRecent([]);
    void Promise.all(recentCache.current.map(async (item) => {
      const response = await fetch(`/api/v1/search?q=${encodeURIComponent(item.title)}`, { signal: controller.signal });
      if (!response.ok) return null;
      const rows = await response.json() as Result[];
      return rows.find((row) => row.kind === item.kind && row.id === item.id) || null;
    })).then((items) => { if (!controller.signal.aborted) setRecent(items.filter((item): item is Result => Boolean(item))); })
      .catch(() => { if (!controller.signal.aborted) setRecent([]); });
    return () => controller.abort();
  }, [open, userId]);
  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); setState("idle"); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState("loading");
      void fetch(`/api/v1/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then(async (response) => { if (!response.ok) throw new Error("search_failed"); return response.json(); })
        .then((rows: Result[]) => { setResults(rows); setActive(0); setState("ready"); })
        .catch(() => { if (!controller.signal.aborted) setState("failed"); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, query, userId]);
  const options = query.trim() ? results : recent;
  const choose = (item: Result) => {
    recentCache.current = [item, ...recentCache.current.filter((entry) => entry.kind !== item.kind || entry.id !== item.id)].slice(0, 5);
    close(); setQuery(""); onNavigate(item.href);
  };
  const grouped = options.reduce<Record<string, Result[]>>((groups, item) => {
    (groups[item.kind] ||= []).push(item); return groups;
  }, {});
  const resultGroups = query.trim() ? Object.entries(grouped) : [["recent", options] as [string, Result[]]];
  return <>
    <button ref={trigger} type="button" className="global-search-trigger" onClick={() => setOpen(true)} aria-label="Search workspace">
      <Search size={17} aria-hidden="true" /><span>Search workspace</span><kbd>⌘ K</kbd>
    </button>
    {open && <div className="global-search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="global-search-dialog" role="dialog" aria-modal="true" aria-label="Search workspace"
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); close(); }
          if (event.key !== "Tab") return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button:not([disabled])'));
          const first = controls[0], last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <div className="global-search-input-row"><Search size={18} aria-hidden="true" />
          <input ref={input} type="search" value={query} role="combobox" aria-expanded="true" aria-controls="global-search-results"
            aria-activedescendant={options[active] ? `search-result-${options[active].kind}-${options[active].id}` : undefined}
            aria-label="Search clients, properties and work"
            placeholder="Search clients, properties and work…"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") { event.preventDefault(); close(); }
              if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, options.length - 1)); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
              if (event.key === "Enter" && options[active]) { event.preventDefault(); choose(options[active]); }
            }} />
          <button type="button" className="quiet-action" onClick={close} aria-label="Close search"><X size={17} /></button>
        </div>
        <div id="global-search-results" className="global-search-results" role="listbox" aria-label="Search results">
          {query.trim().length === 1 && <p>Type at least two characters.</p>}
          {state === "loading" && <p role="status">Searching…</p>}
          {state === "failed" && <p role="alert">Search is unavailable. Try again shortly.</p>}
          {state === "ready" && !results.length && <p>No matching records.</p>}
          {!query.trim() && !recent.length && <p>Search clients, properties, jobs, agreements, inquiries and requests.</p>}
          {!query.trim() && recent.length > 0 && <p className="global-search-group">Recently opened</p>}
          {resultGroups.map(([kind, items]) => <div key={kind}>
            {query.trim() && <p className="global-search-group">{kind.replaceAll("-", " ")}</p>}
            {items.map((item) => <button type="button" role="option" id={`search-result-${item.kind}-${item.id}`} aria-selected={options[active] === item}
              key={`${kind}:${item.id}`} className={options[active] === item ? "selected" : ""} onClick={() => choose(item)}>
              <strong>{item.title}</strong><small>{item.subtitle}</small>
            </button>)}
          </div>)}
        </div>
      </div>
    </div>}
  </>;
}
