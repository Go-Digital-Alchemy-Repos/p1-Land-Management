import { useEffect, useMemo, useState } from "react";
import {
  canPrepareServiceRequestDraft,
  serviceRequestTransitionTargets,
  serviceRequestUiPolicy,
} from "./service-request-triage.policy";
import "./service-request-triage.css";
import { RichTextEditor } from "./RichTextEditor";

type Api = (
  path: string,
  body?: unknown,
  method?: "POST" | "PATCH",
) => Promise<any>;

type RequestRow = {
  id: string;
  property_name?: string;
  description: string;
  status: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
};

const readable = (value: string) => value.replaceAll("_", " ");
const stamp = (value?: string) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

export function ServiceRequestTriage({
  records,
  role,
  api,
  onRefresh,
}: {
  records: RequestRow[];
  role: string | null | undefined;
  api: Api;
  onRefresh: () => Promise<void>;
}) {
  const policy = serviceRequestUiPolicy(role);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequestRow | null>(null);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const [conversionOpen, setConversionOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = useMemo(
    () => records.find((record) => record.id === selectedId) || null,
    [records, selectedId],
  );
  const current = detail || selected;
  const targets = serviceRequestTransitionTargets(current?.status || "");
  const canConvert = canPrepareServiceRequestDraft(role, current?.status);

  useEffect(() => {
    if (policy !== "read" && policy !== "manage") return;
    if (!selectedId && records[0]) setSelectedId(records[0].id);
    if (selectedId && !records.some((record) => record.id === selectedId)) {
      setSelectedId(records[0]?.id || null);
      setDetail(null);
    }
  }, [policy, records, selectedId]);

  useEffect(() => {
    if (!selectedId || (policy !== "read" && policy !== "manage")) return;
    let active = true;
    setError("");
    void api(`/service-requests/${selectedId}`)
      .then((next) => {
        if (active) setDetail(next);
      })
      .catch((cause) => {
        if (active) setError((cause as Error).message);
      });
    return () => {
      active = false;
    };
  }, [api, policy, selectedId]);

  useEffect(() => {
    if (!current) return;
    setTarget(serviceRequestTransitionTargets(current.status)[0] || "");
    setReason("");
    setConversionOpen(false);
    setPreview(null);
    setTitle(current.description.slice(0, 500));
    setScope("");
    setOperationId(crypto.randomUUID());
  }, [current?.id, current?.status]);

  async function mutate(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await onRefresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (policy === "none") {
    return (
      <section className="panel request-triage" aria-label="Service requests">
        <h2>Service requests</h2>
        <p className="muted">
          Crew accounts work from assigned work orders. Service-request triage
          is handled by the office.
        </p>
      </section>
    );
  }

  if (policy === "minimized") {
    return (
      <section
        className="panel request-triage"
        aria-label="Your service requests"
      >
        <div className="panel-heading">
          <div>
            <h2>Your service requests</h2>
            <p>Follow the office review of requests for your properties.</p>
          </div>
        </div>
        {!records.length ? (
          <p className="muted">No service requests yet.</p>
        ) : (
          <div className="request-card-list">
            {records.map((record) => (
              <article className="request-card" key={record.id}>
                <div>
                  <p className="eyebrow">
                    {record.property_name || "Property"}
                  </p>
                  <h3>{record.description}</h3>
                  <p className="muted">Received {stamp(record.created_at)}</p>
                </div>
                <span className="badge">{readable(record.status)}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      className="panel request-triage"
      aria-label="Service request triage"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Office review</p>
          <h2>Service-request triage</h2>
          <p>Review requests before creating any work plan.</p>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {!records.length ? (
        <p className="muted">No service requests require review.</p>
      ) : (
        <div className="request-triage-layout">
          <div className="request-list" aria-label="Service request list">
            {records.map((record) => (
              <button
                type="button"
                key={record.id}
                className={
                  record.id === selectedId
                    ? "request-summary selected"
                    : "request-summary"
                }
                aria-pressed={record.id === selectedId}
                onClick={() => {
                  setSelectedId(record.id);
                  setDetail(null);
                }}
              >
                <span>{record.property_name || "Property"}</span>
                <strong>{record.description}</strong>
                <small>
                  {readable(record.status)} ·{" "}
                  {stamp(record.updated_at || record.created_at)}
                </small>
              </button>
            ))}
          </div>
          {current && (
            <article className="request-detail">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    {current.property_name || "Property"}
                  </p>
                  <h3>{current.description}</h3>
                  <p className="muted">
                    Received {stamp(current.created_at)} · Updated{" "}
                    {stamp(current.updated_at)}
                  </p>
                </div>
                <span className="badge">{readable(current.status)}</span>
              </div>

              {policy === "read" && (
                <p className="muted">
                  This role can review request details but cannot change triage,
                  create work, or schedule service.
                </p>
              )}

              {policy === "manage" && targets.length > 0 && (
                <form
                  className="request-transition"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!current.version || !target) return;
                    void mutate(async () => {
                      const result = await api(
                        `/service-requests/${current.id}/transitions`,
                        {
                          expectedVersion: current.version,
                          status: target,
                          reason: reason.trim(),
                        },
                      );
                      setDetail({
                        ...current,
                        status: result.status,
                        version: result.version,
                      });
                      setNotice(`Request moved to ${readable(result.status)}.`);
                    });
                  }}
                >
                  <label>
                    Triage outcome
                    <select
                      value={target}
                      onChange={(event) => setTarget(event.target.value)}
                      disabled={busy}
                    >
                      {targets.map((status) => (
                        <option key={status} value={status}>
                          {readable(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reason for this update
                    <input
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={10000}
                      required
                      disabled={busy}
                    />
                  </label>
                  <button
                    className="secondary"
                    disabled={busy || !reason.trim() || !target}
                  >
                    {busy ? "Saving…" : "Record triage update"}
                  </button>
                </form>
              )}

              {canConvert && (
                <div className="request-conversion">
                  <div className="request-conversion-heading">
                    <div>
                      <h4>Create a planning draft</h4>
                      <p>
                        Draft only. This does not assign a crew, select a date,
                        publish material, bill, or notify anyone.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setConversionOpen((open) => !open)}
                      disabled={busy}
                    >
                      {conversionOpen ? "Close draft" : "Prepare draft"}
                    </button>
                  </div>
                  {conversionOpen && (
                    <div className="request-conversion-form">
                      <label>
                        Work title
                        <input
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          maxLength={500}
                          disabled={busy}
                        />
                      </label>
                      <label>
                        Draft scope
                        <RichTextEditor value={scope} onChange={setScope} maxLength={10000} disabled={busy} ariaLabel="Draft scope" placeholder="Describe the planned scope." />
                      </label>
                      <div className="request-conversion-actions">
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy || !title.trim()}
                          onClick={() =>
                            void mutate(async () => {
                              const next = await api(
                                `/service-requests/${current.id}/conversion-preview`,
                                {
                                  title: title.trim(),
                                  scope,
                                  checklist: [],
                                  prerequisites: [],
                                },
                              );
                              setPreview(next);
                              setNotice(
                                "Draft preview prepared. Review it before creating the planning record.",
                              );
                            })
                          }
                        >
                          Preview draft
                        </button>
                        {preview && (
                          <button
                            type="button"
                            className="primary"
                            disabled={busy}
                            onClick={() =>
                              void mutate(async () => {
                                const receipt = await api(
                                  `/service-requests/${current.id}/conversions`,
                                  {
                                    operationId,
                                    expectedRequestVersion: current.version,
                                    title: title.trim(),
                                    scope,
                                    checklist: [],
                                    prerequisites: [],
                                  },
                                );
                                setDetail({
                                  ...current,
                                  status: "converted",
                                  version: current.version! + 1,
                                });
                                setConversionOpen(false);
                                setPreview(null);
                                setNotice(
                                  receipt.created
                                    ? "Planning draft created without a crew or date."
                                    : "Existing planning draft was restored from the safe retry receipt.",
                                );
                              })
                            }
                          >
                            Create planning draft
                          </button>
                        )}
                      </div>
                      {preview && (
                        <p className="request-preview" role="status">
                          Preview: <strong>{preview.workOrder.title}</strong>{" "}
                          will be a {preview.workOrder.status} work order with
                          no assigned crew or scheduled date.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </article>
          )}
        </div>
      )}
    </section>
  );
}
