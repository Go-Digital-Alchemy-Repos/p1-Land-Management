import { LeadDetails } from "./LeadDetails";
import { useEffect, useRef, useState } from "react";
import { listSalesInquiries } from "@workspace/api-client-react/dashboard";
import { LeadFollowUp } from "./LeadFollowUp";
import { LeadNotes } from "./LeadNotes";
import { CrmTasks } from "./CrmTasks";
import "./inquiry-list.css";
type Inquiry = Awaited<ReturnType<typeof listSalesInquiries>>["items"][number];
type Query = NonNullable<Parameters<typeof listSalesInquiries>[0]>;
type Filters = {
  q: string;
  status: string;
  ownerId: string;
  kind: "all" | "general" | "commercial";
  overdue: boolean;
};
const emptyFilters: Filters = {
  q: "",
  status: "",
  ownerId: "",
  kind: "all",
  overdue: false,
};
export function InquiryList({
  onCreate,
  onConvert,
  revision,
  owners,
}: {
  onCreate: () => void;
  onConvert: (lead: Inquiry) => void;
  revision: number;
  owners: Array<{
    id: string;
    name: string;
    canOwnSales?: boolean;
    role?: string;
  }>;
}) {
  const [items, setItems] = useState<Inquiry[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [filters, setFilters] = useState(emptyFilters),
    [applied, setApplied] = useState(emptyFilters),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [loadedRevision, setLoadedRevision] = useState(revision),
    [needsRefresh, setNeedsRefresh] = useState(false);
  const alive = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  const changed = JSON.stringify(filters) !== JSON.stringify(applied);
  async function load(append = false, next = applied, confirmDiscard = true) {
    if (gate.current) return;
    if (
      !append &&
      confirmDiscard &&
      !window.dispatchEvent(
        new Event("p1:before-navigation", { cancelable: true }),
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    const query: Query = {
      kind: next.kind,
      ...(next.q.trim() ? { q: next.q.trim() } : {}),
      ...(next.status ? { status: next.status as Query["status"] } : {}),
      ...(next.ownerId ? { ownerId: next.ownerId } : {}),
      ...(next.overdue ? { overdue: "true" as const } : {}),
      ...(append && cursor ? { cursor } : {}),
    };
    try {
      const result = await listSalesInquiries(query, {
        signal: AbortSignal.any([
          controller.current.signal,
          AbortSignal.timeout(30000),
        ]),
      });
      if (alive.current) {
        setItems((old) =>
          append
            ? [
                ...old,
                ...result.items.filter(
                  (row) => !old.some((o) => o.id === row.id),
                ),
              ]
            : result.items,
        );
        setCursor(result.nextCursor);
        setApplied(next);
        setLoaded(true);
        if (!append) {
          setLoadedRevision(revision);
          setNeedsRefresh(false);
        }
      }
    } catch {
      if (alive.current)
        setError(
          "Could not load inquiries. Existing results and edits are retained; try again.",
        );
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load(false, emptyFilters, false);
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  function acknowledge(
    snapshot: Parameters<
      React.ComponentProps<typeof LeadFollowUp>["onSaved"]
    >[0],
  ) {
    if (
      items.some(
        (row) => row.id === snapshot.id && row.version < snapshot.version,
      )
    )
      setNeedsRefresh(true);
    setItems((old) =>
      old.map((row) =>
        row.id === snapshot.id && row.version <= snapshot.version
          ? {
              ...row,
              ...snapshot,
              owner_name:
                row.owner_id === snapshot.owner_id
                  ? row.owner_name
                  : owners.find((owner) => owner.id === snapshot.owner_id)
                      ?.name || null,
            }
          : row,
      ),
    );
  }
  return (
    <section className="panel inquiry-list" aria-label="Sales inquiry list">
      <div className="panel-heading">
        <h2>Inquiries</h2>
        <button type="button" onClick={onCreate}>
          Add inquiry
        </button>
      </div>
      <form
        className="inquiry-filters"
        onSubmit={(e) => {
          e.preventDefault();
          void load(false, filters);
        }}
      >
        <label>
          Search inquiries
          <input
            value={filters.q}
            maxLength={200}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="Name, email, phone, company, location or owner"
          />
        </label>
        <label>
          Stage
          <select
            aria-label="Filter inquiry stage"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All stages</option>
            {["new", "contacted", "qualified", "proposal", "won", "lost"].map(
              (status) => (
                <option key={status} value={status}>
                  {status[0].toUpperCase() + status.slice(1)}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Owner
          <select
            aria-label="Filter inquiry owner"
            value={filters.ownerId}
            onChange={(e) =>
              setFilters({ ...filters, ownerId: e.target.value })
            }
          >
            <option value="">All owners</option>
            <option value="unassigned">Unassigned</option>
            {owners
              .filter((o) => o.canOwnSales || o.role === "owner")
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Inquiry type
          <select
            aria-label="Filter inquiry type"
            value={filters.kind}
            onChange={(e) =>
              setFilters({
                ...filters,
                kind: e.target.value as Filters["kind"],
              })
            }
          >
            <option value="all">All inquiries</option>
            <option value="general">General inquiries</option>
            <option value="commercial">Commercial assessments</option>
          </select>
        </label>
        <label className="inquiry-overdue">
          <input
            type="checkbox"
            checked={filters.overdue}
            onChange={(e) =>
              setFilters({ ...filters, overdue: e.target.checked })
            }
          />
          Overdue follow-ups only
        </label>
        <div>
          <button type="submit" disabled={busy}>
            Apply filters
          </button>
          <button type="button" disabled={busy} onClick={() => void load()}>
            Refresh inquiries
          </button>
        </div>
      </form>
      {changed && (
        <p className="inquiry-list-notice">
          Filter changes are not applied yet.
        </p>
      )}
      {(revision !== loadedRevision || needsRefresh) && (
        <p className="inquiry-list-notice" role="status">
          An inquiry was saved. Refresh this list to see the latest results.
        </p>
      )}
      {error && (
        <p className="error inquiry-list-notice" role="alert">
          {error}
        </p>
      )}
      {busy && (
        <p className="inquiry-list-notice" role="status">
          Loading inquiries…
        </p>
      )}
      <div inert={busy}>
        {items.map((lead) => (
          <div className="schedule-row" key={lead.id}>
            <div>
              <strong>{lead.name}</strong>
              <small>{lead.reported_company_name || lead.location}</small>
              <p>{lead.description}</p>
              <small>
                Owner:{" "}
                {lead.owner_name ||
                  (lead.owner_id ? "Previous owner" : "Unassigned")}
                {lead.next_action_due_at
                  ? " · Due " +
                    new Date(lead.next_action_due_at).toLocaleString()
                  : ""}
              </small>
            </div>
            <span className="badge">{lead.status}</span>
            {!lead.converted_property_id && (
              <button type="button" onClick={() => onConvert(lead)}>
                Convert inquiry
              </button>
            )}
            <LeadFollowUp leadId={lead.id} onSaved={acknowledge} />
            <LeadDetails
              leadId={lead.id}
              onSaved={(snapshot) => {
                if (lead.version < snapshot.version) setNeedsRefresh(true);
                setItems((old) =>
                  old.map((row) =>
                    row.id === snapshot.id && row.version <= snapshot.version
                      ? { ...row, ...snapshot }
                      : row,
                  ),
                );
              }}
            />
            <LeadNotes leadId={lead.id} />
            <CrmTasks kind="lead" parentId={lead.id} />
          </div>
        ))}
      </div>
      {loaded && !items.length && (
        <p className="empty">No inquiries match these filters.</p>
      )}
      {cursor && (
        <div className="inquiry-list-notice">
          <button
            type="button"
            disabled={busy || changed}
            onClick={() => void load(true)}
          >
            Load older inquiries
          </button>
        </div>
      )}
    </section>
  );
}
