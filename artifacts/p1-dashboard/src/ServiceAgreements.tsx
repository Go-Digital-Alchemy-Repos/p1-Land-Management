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
  listDashboardProperties,
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
  userId,
  selectedAgreementId,
  onSelect,
}: {
  role: string;
  userId?: string;
  selectedAgreementId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <AgreementWorkspace
      key={`${userId || "session"}:${role}`}
      role={role}
      selectedAgreementId={selectedAgreementId}
      onSelect={onSelect}
    />
  );
}
function AgreementWorkspace({
  role,
  selectedAgreementId,
  onSelect,
}: {
  role: string;
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
  const manage = ["owner", "manager"].includes(role),
    financial = manage || role === "finance",
    allowed = financial || role === "dispatch";
  const [rows, setRows] = useState<ServiceAgreement[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [properties, setProperties] = useState<DashboardProperty[]>([]),
    [recurrences, setRecurrences] = useState<AgreementRecurrenceOption[]>([]),
    [estimates, setEstimates] = useState<AgreementEstimateOption[]>([]);
  const [selected, setSelected] = useState<ServiceAgreement | null>(null),
    [editor, setEditor] = useState<{
      existing?: ServiceAgreementFinancial;
      predecessor?: ServiceAgreementFinancial;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
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
    generation = useRef(0);
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
        const [p, r, e] = await Promise.all([
          listDashboardProperties(),
          manage ? listAgreementRecurrences() : Promise.resolve([]),
          manage ? listAgreementEstimates() : Promise.resolve([]),
        ]);
        if (n === generation.current) {
          setProperties(p);
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
    if (selectedAgreementId && selectedAgreementId !== selected?.id && !busy) {
      void open(selectedAgreementId);
    }
  }, [selectedAgreementId, selected?.id, busy]);
  async function open(id: string) {
    if (pending.current || childPending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const n = ++generation.current;
    try {
      const row = await getServiceAgreement(id);
      if (n === generation.current) {
        setSelected(row);
        setEditor(null);
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
            disabled={busy || childBusy || !!editor || !online}
            onClick={() => void load()}
          >
            Refresh agreements
          </button>
          {manage && (
            <button
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
                {!busy && !rows.length && (
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
