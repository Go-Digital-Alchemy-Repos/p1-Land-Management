import { CommercialContextPanel } from "./CommercialContextPanel";
import { CommercialAssessmentPanel } from "./CommercialAssessmentPanel";
import type { ContextTransport } from "./commercial-context.types";
import {
  listCommercialInquiries,
  getCommercialInquiry,
  updateCommercialFollowUp,
} from "@workspace/api-client-react/dashboard";
import { useEffect, useRef, useState } from "react";
import { EmailLink, PhoneLink } from "./contact-links";
import { RichTextEditor } from "./RichTextEditor";
import "./commercial-inbox.css";
const statuses = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;
type Staff = { id: string; name: string; role: string };
type Inquiry = Awaited<ReturnType<typeof getCommercialInquiry>>;
type InquiryRow = Awaited<
  ReturnType<typeof listCommercialInquiries>
>["items"][number];
type Filters = NonNullable<Parameters<typeof listCommercialInquiries>[0]>;
export type CommercialInboxApi = {
  list: typeof listCommercialInquiries;
  get: typeof getCommercialInquiry;
  update: typeof updateCommercialFollowUp;
};
const defaultApi: CommercialInboxApi = {
  list: listCommercialInquiries,
  get: getCommercialInquiry,
  update: updateCommercialFollowUp,
};
const dateInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function CommercialInbox({
  staff,
  api = defaultApi,
  contextApi,
}: {
  staff: Staff[];
  api?: CommercialInboxApi;
  contextApi?: ContextTransport;
}) {
  const [status, setStatus] = useState<Filters["status"] | "">(""),
    [owner, setOwner] = useState(""),
    [overdue, setOverdue] = useState(false);
  const [rows, setRows] = useState<InquiryRow[]>([]),
    [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Inquiry | null>(null),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [detailLoading, setDetailLoading] = useState(false),
    [revision, setRevision] = useState(0),
    [detailRevision, setDetailRevision] = useState(0);
  const detailElement = useRef<HTMLElement>(null);
  // Synchronous gate prevents detail loads and saves overlapping before React renders.
  const interactionBusy = useRef(false);
  const [contextBusy, setContextBusy] = useState(false);
  const detailsBusy = saving || detailLoading || contextBusy;
  const generation = useRef(0),
    detailGeneration = useRef(0);
  const owners = staff.filter((person) =>
    ["owner", "manager", "sales"].includes(person.role),
  );
  function query(next?: string): Filters {
    return {
      limit: 50,
      ...(status ? { status } : {}),
      ...(owner ? { ownerId: owner } : {}),
      ...(overdue ? { overdue: "true" as const } : {}),
      ...(next ? { cursor: next } : {}),
    };
  }
  useEffect(() => {
    const current = ++generation.current;
    setRows([]);
    setCursor(null);
    setLoading(true);
    setError("");
    api
      .list(query())
      .then((page) => {
        if (current === generation.current) {
          setRows(page.items);
          setCursor(page.nextCursor);
        }
      })
      .catch((e) => {
        if (current === generation.current) setError(e.message);
      })
      .finally(() => {
        if (current === generation.current) setLoading(false);
      });
    return () => {
      generation.current++;
    };
  }, [status, owner, overdue, revision, api]);
  useEffect(
    () => () => {
      detailGeneration.current++;
    },
    [],
  );
  async function more() {
    if (!cursor || loading) return;
    const current = generation.current;
    setLoading(true);
    setError("");
    try {
      const page = await api.list(query(cursor));
      if (current === generation.current) {
        setRows((old) => [
          ...old,
          ...page.items.filter(
            (item: InquiryRow) => !old.some((row) => row.id === item.id),
          ),
        ]);
        setCursor(page.nextCursor);
      }
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  async function select(id: string) {
    if (interactionBusy.current) return;
    interactionBusy.current = true;
    setDetailLoading(true);
    const current = ++detailGeneration.current;
    setError("");
    try {
      const detail = await api.get(id);
      if (current === detailGeneration.current) {
        setSelected(detail);
        setDetailRevision((v) => v + 1);
        requestAnimationFrame(() => {
          if (current === detailGeneration.current) {
            detailElement.current?.focus({ preventScroll: true });
            detailElement.current?.scrollIntoView({ block: "nearest" });
          }
        });
      }
    } catch (e) {
      if (current === detailGeneration.current) setError((e as Error).message);
    } finally {
      interactionBusy.current = false;
      if (current === detailGeneration.current) setDetailLoading(false);
    }
  }
  async function save(form: HTMLFormElement) {
    if (!selected || interactionBusy.current) return;
    interactionBusy.current = true;
    const current = ++detailGeneration.current;
    const data = new FormData(form),
      id = selected.id;
    setSaving(true);
    setError("");
    try {
      const due = String(data.get("due") || "");
      await api.update(id, {
        expectedVersion: selected.version,
        ownerId: String(data.get("owner") || "") || null,
        status: String(data.get("status")) as NonNullable<Filters["status"]>,
        nextAction: String(data.get("action") || ""),
        nextActionDueAt: due ? new Date(due).toISOString() : null,
      });
      const fresh = await api.get(id);
      if (current === detailGeneration.current) {
        setSelected(fresh);
        setDetailRevision((v) => v + 1);
        setRevision((v) => v + 1);
      }
    } catch (e) {
      if (current === detailGeneration.current)
        setError(
          (e as Error).message +
            ". Refresh the inquiry to confirm its current state before retrying.",
        );
    } finally {
      interactionBusy.current = false;
      if (current === detailGeneration.current) setSaving(false);
    }
  }
  return (
    <section
      className="panel commercial-inbox"
      aria-label="Commercial inquiry inbox"
    >
      <div className="panel-heading">
        <h2>Commercial inquiries</h2>
        <button
          disabled={loading || saving}
          onClick={() => setRevision((v) => v + 1)}
        >
          Refresh inbox
        </button>
      </div>
      <p>
        Assign an owner and record the next action for each site assessment
        inquiry.
      </p>
      <div className="commercial-filters">
        <label>
          Status
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as Filters["status"] | "")
            }
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Owner
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">All owners</option>
            <option value="unassigned">Unassigned</option>
            {owners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => setOverdue(e.target.checked)}
          />{" "}
          Overdue follow-ups only
        </label>
      </div>
      {detailLoading && <p role="status">Loading inquiry details…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="commercial-columns">
        <div>
          {rows.map((row) => (
            <button
              key={row.id}
              className="commercial-summary"
              aria-pressed={selected?.id === row.id}
              disabled={detailsBusy}
              onClick={() => void select(row.id)}
            >
              <strong>{row.reported_company_name || row.name}</strong>
              <span>{row.reported_property_name || row.location}</span>
              <small>
                {row.status} ·{" "}
                {owners.find((p) => p.id === row.owner_id)?.name ||
                  (row.owner_id ? "Previous staff owner" : "Unassigned")}
              </small>
              {row.next_action && <span>{row.next_action}</span>}
              {row.next_action_due_at && (
                <small>
                  Due {new Date(row.next_action_due_at).toLocaleString()}
                </small>
              )}
            </button>
          ))}
          {!loading && !rows.length && !error && (
            <p>No inquiries match these filters.</p>
          )}
          {loading && <p role="status">Loading inquiries…</p>}
          {cursor && (
            <button disabled={loading} onClick={() => void more()}>
              Load more inquiries
            </button>
          )}
        </div>
        {selected ? (
          <article
            ref={detailElement}
            tabIndex={-1}
            aria-label="Selected commercial inquiry"
          >
            <h3>{selected.reported_company_name || selected.name}</h3>
            <p>
              {selected.name}
              {selected.contact_title ? " · " + selected.contact_title : ""}
            </p>
            <p>
              {selected.email ? <EmailLink email={selected.email} /> : "No email provided"}
              <br />
              {selected.phone ? <PhoneLink phone={selected.phone} /> : "No phone provided"}
            </p>
            <dl>
              {[
                ["Property", selected.reported_property_name],
                ["Location", selected.location],
                ["Property type", selected.property_type],
                ["Acreage", selected.acreage_description],
                ["Project stage", selected.project_stage],
                ["Timing", selected.service_timing],
                ["Services", selected.services?.join(", ")],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || "Not provided"}</dd>
                </div>
              ))}
            </dl>
            <p className="commercial-message">{selected.description}</p>
            <form
              key={selected.id + ":" + detailRevision}
              onSubmit={(e) => {
                e.preventDefault();
                void save(e.currentTarget);
              }}
            >
              <label>
                Owner
                <select
                  name="owner"
                  defaultValue={selected.owner_id || ""}
                  disabled={detailsBusy}
                >
                  <option value="">Unassigned</option>
                  {selected.owner_id &&
                    !owners.some((p) => p.id === selected.owner_id) && (
                      <option value={selected.owner_id} disabled>
                        Previous staff owner — choose an active owner
                      </option>
                    )}
                  {owners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  name="status"
                  defaultValue={selected.status}
                  disabled={detailsBusy}
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Next action
                <RichTextEditor name="action" defaultValue={selected.next_action || ""} maxLength={2000} disabled={detailsBusy} ariaLabel="Next action" placeholder="Record the next action and owner." />
              </label>
              <label>
                Follow-up due (device timezone)
                <input
                  name="due"
                  type="datetime-local"
                  defaultValue={dateInput(selected.next_action_due_at)}
                  disabled={detailsBusy}
                />
              </label>
              <button className="primary" disabled={detailsBusy}>
                {saving ? "Saving…" : "Save follow-up"}
              </button>
              <button
                type="button"
                disabled={detailsBusy}
                onClick={() => void select(selected.id)}
              >
                Reload inquiry and discard draft
              </button>
            </form>
            <CommercialContextPanel
              key={selected.id}
              leadId={selected.id}
              leadVersion={selected.version}
              api={contextApi}
              disabled={saving || detailLoading}
              onBusyChange={(busy) => { interactionBusy.current = busy; setContextBusy(busy); }}
              onMutationAck={({leadId: id, expectedVersion, newVersion}) => {
                setSelected((current) => current?.id === id && current.version === expectedVersion ? {...current, version: newVersion} : current);
                setRows((current) => current.map(row => row.id === id && row.version === expectedVersion ? {...row, version: newVersion} : row));
              }}
            />
            <CommercialAssessmentPanel
              key={selected.id + ":" + selected.version}
              leadId={selected.id}
              leadVersion={selected.version}
              disabled={saving || detailLoading || contextBusy}
              onLeadMutationAck={({ expectedVersion, newVersion }) => {
                setSelected((current) => current?.id === selected.id && current.version === expectedVersion ? { ...current, version: newVersion } : current);
                setRows((current) => current.map((row) => row.id === selected.id && row.version === expectedVersion ? { ...row, version: newVersion } : row));
              }}
            />
          </article>
        ) : (
          <p>Select an inquiry to review its details.</p>
        )}
      </div>
    </section>
  );
}
