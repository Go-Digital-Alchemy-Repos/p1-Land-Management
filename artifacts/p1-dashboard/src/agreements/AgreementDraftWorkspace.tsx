import { useEffect, useRef, useState } from "react";
import {
  getAgreementDraft,
  listAgreementDrafts,
} from "@workspace/api-client-react/dashboard";
import type {
  AgreementDraft,
  AgreementDraftSummary,
} from "../../../../lib/api-client-react/src/dashboard/models";
import AgreementDraftCreate from "./AgreementDraftCreate";
import AgreementDraftEditor from "./AgreementDraftEditor";
import { message } from "./template-draft";
import "./template-library.css";
export default function AgreementDraftWorkspace({
  id,
  canEdit,
  canManageTemplates,
  canViewAgreements,
  opened,
}: {
  id?: string;
  canEdit: boolean;
  canManageTemplates: boolean;
  canViewAgreements: boolean;
  opened: (id: string) => void;
}) {
  const [rows, setRows] = useState<AgreementDraftSummary[]>([]),
    [row, setRow] = useState<AgreementDraft | null>(null),
    [cursor, setCursor] = useState<string | null>(null);
  const [creating, setCreating] = useState(
      () => canEdit && new URLSearchParams(location.search).get("new") === "1",
    ),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [editorRevision, setEditorRevision] = useState(0);
  const gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void (
      id
        ? getAgreementDraft(id, { signal: controller.signal }).then((set) => {
            if (!controller.signal.aborted) setRow(set);
          })
        : listAgreementDrafts(
            { limit: 50 },
            { signal: controller.signal },
          ).then((data) => {
            if (!controller.signal.aborted) {
              setRows(data.items);
              setCursor(data.nextCursor);
            }
          })
    )
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);
  async function more() {
    if (!cursor || gate.current) return;
    gate.current = true;
    setLoading(true);
    setError("");
    try {
      const data = await listAgreementDrafts({ limit: 50, cursor });
      if (alive.current) {
        setRows((current) => [
          ...current,
          ...data.items.filter(
            (row) => !current.some((item) => item.id === row.id),
          ),
        ]);
        setCursor(data.nextCursor);
      }
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setLoading(false);
    }
  }
  if (id && row)
    return (
      <AgreementDraftEditor
        key={`${row.id}:${row.version}:${editorRevision}`}
        row={row}
        canEdit={canEdit}
        changed={(saved) => {
          setRow(saved);
          setEditorRevision((n) => n + 1);
        }}
      />
    );
  if (!id && creating && canEdit)
    return (
      <AgreementDraftCreate
        created={(saved) => opened(saved.id)}
        close={() => {
          setCreating(false);
          setAttempt((n) => n + 1);
        }}
      />
    );
  return (
    <section className="template-library" aria-label="Agreement drafts">
      <nav aria-label="Agreement workspace">
        {canViewAgreements && <a href="/agreements">Agreements</a>}{" "}
        <span aria-current="page">Drafts</span>{" "}
        {canManageTemplates && <a href="/agreements/templates">Templates</a>}
      </nav>
      <p>
        Private agreement drafts hold client-specific terms, scope and costs.
        Saving a draft does not send it or activate an agreement.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="template-actions">
        {canEdit && !id && (
          <button onClick={() => setCreating(true)}>New agreement draft</button>
        )}
        <button disabled={loading} onClick={() => setAttempt((n) => n + 1)}>
          Refresh drafts
        </button>
      </div>
      {loading && <p role="status">Loading agreement drafts…</p>}
      {!loading && !error && !rows.length && <p>No agreement drafts yet.</p>}
      <div className="template-grid">
        {rows.map((row) => (
          <article key={row.id}>
            <h2>{row.title}</h2>
            <p>
              {row.status} · v{row.version}
            </p>
            <p>Updated {new Date(row.updated_at).toLocaleString()}</p>
            <a href={`/agreements/drafts/${encodeURIComponent(row.id)}`}>
              Open {row.title}
            </a>
          </article>
        ))}
      </div>
      {cursor && (
        <button disabled={loading} onClick={() => void more()}>
          Load more drafts
        </button>
      )}
    </section>
  );
}
