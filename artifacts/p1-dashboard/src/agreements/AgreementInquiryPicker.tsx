import { useEffect, useRef, useState } from "react";
import { listSalesInquiries } from "@workspace/api-client-react/dashboard";
type Inquiry = Awaited<ReturnType<typeof listSalesInquiries>>["items"][number];
export default function AgreementInquiryPicker({
  value,
  change,
  ready,
  refreshToken,
}: {
  value: string | null | undefined;
  change: (id: string | null) => void;
  ready: (ready: boolean) => void;
  refreshToken: number;
}) {
  const [items, setItems] = useState<Inquiry[]>([]),
    [query, setQuery] = useState(""),
    [applied, setApplied] = useState(""),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(true),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const selected = useRef<Inquiry | undefined>(undefined);
  const current = items.find((row) => row.id === value);
  useEffect(() => {
    if (current) selected.current = current;
  }, [current]);
  useEffect(() => {
    ready(loaded && !busy);
  }, [loaded, busy, ready]);
  async function load(append = false, search = query) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    try {
      const result = await listSalesInquiries(
        {
          ...(search.trim() ? { q: search.trim() } : {}),
          ...(append && cursor ? { cursor } : {}),
        },
        {
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
        },
      );
      if (request.signal.aborted) return;
      setItems((old) =>
        append
          ? [
              ...old,
              ...result.items.filter(
                (row) => !old.some((prior) => prior.id === row.id),
              ),
            ]
          : result.items,
      );
      setCursor(result.nextCursor);
      setApplied(search.trim());
      setLoaded(true);
    } catch {
      if (!request.signal.aborted)
        setError(
          "Could not load inquiry choices. Your selection is retained; try again.",
        );
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    setQuery("");
    void load(false, "");
    return () => controller.current?.abort();
  }, [refreshToken]);
  const retained =
    selected.current?.id === value ? selected.current : undefined;
  const label = (row: Inquiry) =>
    [row.name, row.reported_company_name || row.location, row.email]
      .filter(Boolean)
      .join(" · ");
  return (
    <div className="agreement-inquiry-picker">
      <label>
        Search inquiry choices
        <input
          aria-label="Search agreement inquiries"
          maxLength={200}
          value={query}
          placeholder="Name, email, phone, company, location or owner"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (!busy) void load();
            }
          }}
        />
      </label>
      <div className="template-actions">
        <button type="button" disabled={busy} onClick={() => void load()}>
          Search inquiries
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setQuery("");
            void load(false, "");
          }}
        >
          Clear inquiry search
        </button>
      </div>
      {busy && <p role="status">Loading inquiry choices…</p>}
      {error && <p role="alert">{error}</p>}
      {query.trim() !== applied && <p>Search changes are not applied yet.</p>}
      <label>
        Inquiry
        <select
          aria-label="Agreement inquiry"
          value={value || ""}
          disabled={busy}
          onChange={(event) => change(event.target.value || null)}
        >
          <option value="">No inquiry attached</option>
          {value && !current && (
            <option value={value}>
              {retained
                ? label(retained)
                : "Selected inquiry (outside current results)"}
            </option>
          )}
          {items.map((row) => (
            <option key={row.id} value={row.id}>
              {label(row)}
            </option>
          ))}
        </select>
      </label>
      {loaded && !items.length && (
        <p>
          No inquiries match this search. Any selected inquiry remains attached.
        </p>
      )}
      {cursor && (
        <button
          type="button"
          disabled={busy || query.trim() !== applied}
          onClick={() => void load(true, applied)}
        >
          Load older inquiry choices
        </button>
      )}
      <p>Searching or loading choices does not change the attached inquiry.</p>
    </div>
  );
}
