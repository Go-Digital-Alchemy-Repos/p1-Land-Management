import {
  canManageServiceAgreements,
  hasCapability,
} from "@workspace/api-zod/business-access";
import type {
  ServiceAgreement,
  ServiceAgreementFinancial,
  DashboardProperty,
  AgreementRecurrenceOption,
  AgreementEstimateOption,
} from "../../../lib/api-client-react/src/dashboard/models";
import { useEffect, useRef, useState } from "react";
import {
  listServiceAgreements,
  getServiceAgreement,
  listAgreementRecurrences,
  listAgreementEstimates,
} from "@workspace/api-client-react/dashboard";
import { AgreementEditor } from "./AgreementEditor";
import { AgreementDetail } from "./AgreementDetail";
import { AgreementQueue } from "./AgreementQueue";
import { AgreementPreparationQueue } from "./AgreementPreparationQueue";
import "./service-agreements.css";
export function ServiceAgreements({
  role,
  capabilities,
  properties,
  userId,
  selectedAgreementId,
  onSelect,
}: {
  role: string;
  capabilities?: readonly string[];
  properties: Pick<DashboardProperty, "id" | "name">[];
  userId?: string;
  selectedAgreementId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <AgreementWorkspace
      key={`${userId || "session"}:${role}:${(capabilities || []).join(",")}`}
      role={role}
      capabilities={capabilities}
      properties={properties}
      selectedAgreementId={selectedAgreementId}
      onSelect={onSelect}
    />
  );
}
function AgreementWorkspace({
  role,
  capabilities,
  properties,
  selectedAgreementId,
  onSelect,
}: {
  role: string;
  capabilities?: readonly string[];
  properties: Pick<DashboardProperty, "id" | "name">[];
  selectedAgreementId?: string;
  onSelect?: (id: string) => void;
}) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const subject = { role, capabilities };
  const manage = canManageServiceAgreements(subject),
    financial = hasCapability(subject, "revenue.billing"),
    allowed = hasCapability(subject, "revenue.agreements") || financial;
  const [rows, setRows] = useState<ServiceAgreement[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [recurrences, setRecurrences] = useState<AgreementRecurrenceOption[]>([]),
    [estimates, setEstimates] = useState<AgreementEstimateOption[]>([]);
  const [selected, setSelected] = useState<ServiceAgreement | null>(null),
    [editor, setEditor] = useState<{
      existing?: ServiceAgreementFinancial;
      predecessor?: ServiceAgreementFinancial;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [detailFailure, setDetailFailure] = useState<{ id: string; message: string } | null>(null),
    [queueRevision, setQueueRevision] = useState(0),
    [online, setOnline] = useState(navigator.onLine);
  const [childBusy, setChildBusy] = useState(false);
  const childPending = useRef(false);
  function childActivity(value: boolean) {
    if (!mounted.current) return;
    childPending.current = value;
    setChildBusy(value);
  }
  const pending = useRef(false),
    generation = useRef(0),
    lastRouteAttempt = useRef<string | undefined>(undefined);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  async function load(more = false) {
    if (pending.current || !allowed) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const n = ++generation.current;
    try {
      const page = await listServiceAgreements({
        limit: 30,
        ...(more && cursor ? { after: cursor } : {}),
      });
      if (n !== generation.current) return;
      setRows((old) =>
        more
          ? [
              ...old,
              ...page.items.filter((p) => !old.some((r) => r.id === p.id)),
            ]
          : page.items,
      );
      setCursor(page.nextCursor);
      if (!more) {
        const [r, e] = await Promise.all([
          manage ? listAgreementRecurrences() : Promise.resolve([]),
          manage ? listAgreementEstimates() : Promise.resolve([]),
        ]);
        if (n === generation.current) {
          setRecurrences(r);
          setEstimates(e);
        }
      }
    } catch (e) {
      if (n === generation.current) setError((e as Error).message);
    } finally {
      if (n === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
      pending.current = false;
    };
  }, [role]);
  useEffect(() => {
    if (!selectedAgreementId) {
      lastRouteAttempt.current = undefined;
      setDetailFailure(null);
      return;
    }
    if (
      selectedAgreementId !== selected?.id &&
      lastRouteAttempt.current !== selectedAgreementId &&
      !busy &&
      !childBusy &&
      !pending.current &&
      !childPending.current
    ) {
      // A failed deep link waits for an explicit retry instead of refetching on every busy change.
      lastRouteAttempt.current = selectedAgreementId;
      setSelected(null);
      setEditor(null);
      void open(selectedAgreementId);
    }
  }, [selectedAgreementId, selected?.id, busy, childBusy]);
  async function open(id: string) {
    if (pending.current || childPending.current) return;
    pending.current = true;
    setBusy(true);
    setDetailFailure(null);
    const n = ++generation.current;
    try {
      const row = await getServiceAgreement(id);
      if (n === generation.current) {
        setSelected(row);
        setEditor(null);
      }
    } catch (e) {
      if (n === generation.current)
        setDetailFailure({ id, message: (e as Error).message });
    } finally {
      if (n === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }
  function saved(row: ServiceAgreementFinancial) {
    if (!mounted.current) return;
    setSelected(row);
    setEditor(null);
    setQueueRevision((n) => n + 1);
    void load();
  }
  if (!allowed) return null;
  return (
    <section
      className="panel service-agreements"
      aria-label="Service agreements"
    >
      <div className="panel-heading">
        <div>
          <h2>Service agreements</h2>
          <p>Approved scope, dated terms, and billing preparation.</p>
        </div>
        <div className="agreement-actions">
          <button
            className="secondary"
            disabled={busy || childBusy || !!editor || !online}
            onClick={() => void load()}
          >
            Refresh agreements
          </button>
          {manage && (
            <button
              className="primary"
              disabled={busy || childBusy || !!editor || !online}
              onClick={() => setEditor({})}
            >
              New agreement
            </button>
          )}
        </div>
      </div>
      {!online && (
        <p role="status">
          Connect to manage agreements. Your current entries are retained.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <fieldset className="agreement-workspace" disabled={!online}>
        {editor ? (
          <AgreementEditor
            key={editor.existing?.id || editor.predecessor?.id || "new"}
            {...editor}
            properties={properties}
            recurrences={recurrences}
            estimates={estimates}
            onSaved={saved}
            onCancel={() => setEditor(null)}
          />
        ) : (
          <>
            <div className="agreement-columns">
              <div className="agreement-list">
                <h3>Agreements</h3>
                {!busy && !error && !selectedAgreementId && !rows.length && (
                  <p>No service agreements have been recorded.</p>
                )}
                {rows.map((row) => (
                  <button
                    key={row.id}
                    disabled={busy || childBusy}
                    aria-pressed={selected?.id === row.id}
                    onClick={() => (onSelect ? onSelect(row.id) : void open(row.id))}
                  >
                    <strong>{row.title}</strong>
                    <span>
                      {properties.find((p) => p.id === row.propertyId)?.name ||
                        "Property"}
                    </span>
                    <small>
                      {row.startsOn} — {row.endsOn} · {row.status}
                    </small>
                  </button>
                ))}
                {cursor && (
                  <button disabled={busy} onClick={() => void load(true)}>
                    Load more agreements
                  </button>
                )}
              </div>
              {selected ? (
                <AgreementDetail
                  key={
                    selected.id +
                    ("version" in selected ? ":" + selected.version : "")
                  }
                  agreement={selected}
                  manage={manage}
                  onBusy={childActivity}
                  onChanged={saved}
                  onEdit={(a) => setEditor({ existing: a })}
                  onRenew={(a) => setEditor({ predecessor: a })}
                  onReload={() => void open(selected.id)}
                />
              ) : detailFailure ? (
                <div>
                  <p role="alert" className="error">
                    Could not load this agreement: {detailFailure.message}
                  </p>
                  <button disabled={busy} onClick={() => void open(detailFailure.id)}>
                    Retry agreement details
                  </button>
                </div>
              ) : (
                <p>Select an agreement to review its terms.</p>
              )}
            </div>
            {financial && (
              <>
                <AgreementQueue
                  properties={properties}
                  revision={queueRevision}
                  onOpen={(id) => (onSelect ? onSelect(id) : void open(id))}
                />
                <AgreementPreparationQueue
                  revision={queueRevision}
                  onOpen={(id) => (onSelect ? onSelect(id) : void open(id))}
                />
              </>
            )}
          </>
        )}
      </fieldset>
    </section>
  );
}
