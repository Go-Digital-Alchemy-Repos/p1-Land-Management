import { useEffect, useRef, useState } from "react";
import {
  getClientCrmArchive,
  getLeadCrmArchive,
  listClientCrmArchive,
  listLeadCrmArchive,
} from "@workspace/api-client-react/dashboard";
import "./crm-archive.css";
type RecordInfo = Awaited<
  ReturnType<typeof listLeadCrmArchive>
>["items"][number];
type Detail = Awaited<ReturnType<typeof getLeadCrmArchive>>;
const labels: Record<string, string> = {
  leads: "Inquiry",
  clients: "Customer",
  leadNotes: "Inquiry note",
  clientNotes: "Customer note",
  leadTasks: "Inquiry task",
  clientTasks: "Customer task",
};
const recordKey = (r: RecordInfo) =>
  JSON.stringify([r.sourceInstanceId, r.collection, r.sourceId]);
export function CrmArchive({
  kind,
  parentId,
}: {
  kind: "lead" | "client";
  parentId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="crm-archive">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Imported CRM history
      </button>
      {open && (
        <ArchiveHistory key={kind + parentId} kind={kind} parentId={parentId} />
      )}
    </div>
  );
}
function ArchiveHistory({
  kind,
  parentId,
}: {
  kind: "lead" | "client";
  parentId: string;
}) {
  const [items, setItems] = useState<RecordInfo[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [detail, setDetail] = useState<Detail | null>(null);
  const active = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  function options() {
    controller.current = new AbortController();
    return {
      signal: AbortSignal.any([
        controller.current.signal,
        AbortSignal.timeout(30000),
      ]),
    };
  }
  async function load(append = false) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await (
        kind === "lead" ? listLeadCrmArchive : listClientCrmArchive
      )(parentId, append && cursor ? { cursor } : {}, options());
      if (active.current) {
        setItems((old) =>
          append
            ? [
                ...old,
                ...result.items.filter(
                  (n) => !old.some((p) => recordKey(p) === recordKey(n)),
                ),
              ]
            : result.items,
        );
        setCursor(result.nextCursor);
        setLoaded(true);
      }
    } catch {
      if (active.current)
        setError("Could not load imported history. Try again.");
    } finally {
      gate.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function view(record: RecordInfo) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    setDetail(null);
    try {
      const result = await (
        kind === "lead" ? getLeadCrmArchive : getClientCrmArchive
      )(
        parentId,
        {
          sourceInstanceId: record.sourceInstanceId,
          collection: record.collection,
          sourceId: record.sourceId,
        },
        options(),
      );
      if (active.current) setDetail(result);
    } catch {
      if (active.current)
        setError(
          "Could not load this imported record. Select it again to retry.",
        );
    } finally {
      gate.current = false;
      if (active.current) setBusy(false);
    }
  }
  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, [kind, parentId]);
  return (
    <section aria-label="Imported CRM history" aria-busy={busy}>
      <h3>Original CRM records</h3>
      <p>
        Read-only snapshots from the former admin. These show imported values,
        which may differ from the current inquiry, customer, notes or tasks.
      </p>
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={busy} onClick={() => void load()}>
        Refresh imported history
      </button>
      {loaded && !items.length && (
        <p>
          No imported CRM records for this{" "}
          {kind === "lead" ? "inquiry" : "customer"}.
        </p>
      )}
      <ul>
        {items.map((record) => (
          <li key={recordKey(record)}>
            <button
              type="button"
              disabled={busy}
              aria-pressed={
                detail ? recordKey(detail) === recordKey(record) : false
              }
              onClick={() => void view(record)}
            >
              {labels[record.collection] || record.collection} ·{" "}
              {record.sourceId}
            </button>
            <small>
              Source {record.sourceInstanceId} · Imported{" "}
              <time dateTime={record.importedAt}>
                {new Date(record.importedAt).toLocaleString()}
              </time>
            </small>
          </li>
        ))}
      </ul>
      {cursor && (
        <button type="button" disabled={busy} onClick={() => void load(true)}>
          Load more imported records
        </button>
      )}
      {busy && <p role="status">Loading imported history…</p>}
      {detail && (
        <section aria-label="Original imported record">
          <h4>
            {labels[detail.collection] || detail.collection} · {detail.sourceId}
          </h4>
          <p>Source: {detail.sourceInstanceId}</p>
          <p>
            All original fields are shown below. Empty values and original
            identifiers are retained.
          </p>
          <pre tabIndex={0} aria-label="Original CRM fields">
            {detail.sourceJson}
          </pre>
          <details>
            <summary>Preservation reference</summary>
            <p>
              Source content SHA-256: <code>{detail.sourceSha256}</code>
            </p>
          </details>
        </section>
      )}
    </section>
  );
}
