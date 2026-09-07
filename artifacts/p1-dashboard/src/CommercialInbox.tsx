import { useEffect, useRef, useState } from "react";
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
type Inquiry = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string;
  description: string;
  status: string;
  version: number;
  reported_company_name: string | null;
  reported_property_name: string | null;
  contact_title: string | null;
  property_type: string | null;
  acreage_description: string | null;
  project_stage: string | null;
  service_timing: string | null;
  services: string[];
  owner_id: string | null;
  next_action: string | null;
  next_action_due_at: string | null;
  received_at: string;
  submission_id: string;
};
type Request = (
  path: string,
  body?: unknown,
  method?: "POST" | "PATCH",
) => Promise<any>;
const dateInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function CommercialInbox({
  staff,
  request,
}: {
  staff: Staff[];
  request: Request;
}) {
  const [status, setStatus] = useState(""),
    [owner, setOwner] = useState(""),
    [overdue, setOverdue] = useState(false);
  const [rows, setRows] = useState<Inquiry[]>([]),
    [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Inquiry | null>(null),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [revision, setRevision] = useState(0),
    [detailRevision, setDetailRevision] = useState(0);
  const generation = useRef(0),
    detailGeneration = useRef(0);
  const owners = staff.filter((person) =>
    ["owner", "manager", "sales"].includes(person.role),
  );
  function query(next?: string) {
    const params = new URLSearchParams({ limit: "50" });
    if (status) params.set("status", status);
    if (owner) params.set("ownerId", owner);
    if (overdue) params.set("overdue", "true");
    if (next) params.set("cursor", next);
    return "/commercial-inquiries?" + params;
  }
  useEffect(() => {
    const current = ++generation.current;
    setRows([]);
    setCursor(null);
    setLoading(true);
    setError("");
    request(query())
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
  }, [status, owner, overdue, revision, request]);
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
      const page = await request(query(cursor));
      if (current === generation.current) {
        setRows((old) => [
          ...old,
          ...page.items.filter(
            (item: Inquiry) => !old.some((row) => row.id === item.id),
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
    const current = ++detailGeneration.current;
    setError("");
    try {
      const detail = await request("/commercial-inquiries/" + id);
      if (current === detailGeneration.current) {
        setSelected(detail);
        setDetailRevision((v) => v + 1);
      }
    } catch (e) {
      if (current === detailGeneration.current) setError((e as Error).message);
    }
  }
  async function save(form: HTMLFormElement) {
    if (!selected || saving) return;
    const data = new FormData(form),
      id = selected.id;
    setSaving(true);
    setError("");
    try {
      const due = String(data.get("due") || "");
      await request(
        "/commercial-inquiries/" + id + "/follow-up",
        {
          expectedVersion: selected.version,
          ownerId: data.get("owner") || null,
          status: data.get("status"),
          nextAction: data.get("action"),
          nextActionDueAt: due ? new Date(due).toISOString() : null,
        },
        "PATCH",
      );
      const fresh = await request("/commercial-inquiries/" + id);
      setSelected(fresh);
      setDetailRevision((v) => v + 1);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(
        (e as Error).message +
          ". Refresh the inquiry to confirm its current state before retrying.",
      );
    } finally {
      setSaving(false);
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
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
              disabled={saving}
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
          <article aria-label="Selected commercial inquiry">
            <h3>{selected.reported_company_name || selected.name}</h3>
            <p>
              {selected.name}
              {selected.contact_title ? " · " + selected.contact_title : ""}
            </p>
            <p>
              {selected.email || "No email provided"}
              <br />
              {selected.phone || "No phone provided"}
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
              key={selected.id + ":" + selected.version + ":" + detailRevision}
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
                  disabled={saving}
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
                  disabled={saving}
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Next action
                <textarea
                  name="action"
                  required
                  maxLength={2000}
                  defaultValue={selected.next_action || ""}
                  disabled={saving}
                />
              </label>
              <label>
                Follow-up due (device timezone)
                <input
                  name="due"
                  type="datetime-local"
                  defaultValue={dateInput(selected.next_action_due_at)}
                  disabled={saving}
                />
              </label>
              <button className="primary" disabled={saving}>
                {saving ? "Saving…" : "Save follow-up"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void select(selected.id)}
              >
                Reload inquiry and discard draft
              </button>
            </form>
          </article>
        ) : (
          <p>Select an inquiry to review its details.</p>
        )}
      </div>
    </section>
  );
}
