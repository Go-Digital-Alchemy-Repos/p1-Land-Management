import { useEffect, useRef, useState } from "react";
import {
  listAgreementTemplates,
  getAgreementTemplate,
} from "@workspace/api-client-react/dashboard";
import type {
  AgreementTemplate,
  AgreementTemplateKind,
} from "../../../../lib/api-client-react/src/dashboard/models";
import TemplateEditor from "./TemplateEditor";
import { labels, message } from "./template-draft";
import "./template-library.css";
export default function TemplateLibrary({
  canUseClauses = false,
  canViewAgreements = false,
}: {
  canUseClauses?: boolean;
  canViewAgreements?: boolean;
}) {
  const [editorRevision, setEditorRevision] = useState(0);
  const [rows, setRows] = useState<AgreementTemplate[]>([]),
    [selected, setSelected] = useState<AgreementTemplate | null>(null),
    [newKind, setNewKind] = useState<AgreementTemplateKind | null>(null),
    [kind, setKind] = useState<AgreementTemplateKind>("msa");
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [notice, setNotice] = useState("");
  const alive = useRef(true),
    gate = useRef(false);
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
    void listAgreementTemplates(
      { kind: "all", state: "all" },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setRows(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  async function open(id: string) {
    if (gate.current) return;
    gate.current = true;
    setLoading(true);
    setError("");
    try {
      const row = await getAgreementTemplate(id);
      if (alive.current) {
        setSelected(row);
        setNotice("");
      }
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setLoading(false);
    }
  }
  function changed(row: AgreementTemplate) {
    setEditorRevision((value) => value + 1);
    setSelected(row);
    setNewKind(null);
    setNotice("Template version loaded.");
    setAttempt((n) => n + 1);
  }
  const visible = rows.filter(
    (row) =>
      row.kind === kind &&
      (status === "all" || row.status === status) &&
      `${row.name} ${row.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (selected || newKind)
    return (
      <>
        <p role="status">{notice}</p>
        <TemplateEditor
          key={
            selected
              ? `${selected.id}:${selected.edit_version}:${editorRevision}`
              : `new:${newKind}`
          }
          row={selected}
          kind={selected?.kind || newKind!}
          close={() => {
            setSelected(null);
            setNewKind(null);
            setNotice("");
          }}
          changed={changed}
          canUseClauses={canUseClauses}
        />
      </>
    );
  return (
    <section className="template-library" aria-label="Agreement templates">
      <nav aria-label="Agreement workspace">
        {canViewAgreements && <a href="/agreements">Agreements</a>}{" "}
        <span aria-current="page">Templates</span>
      </nav>
      <p>
        Save reusable agreement terms, scope, cost rows and packages. Review a
        draft before publishing it for client proposals.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="template-actions">
        <label>
          Template type
          <select
            aria-label="Template type"
            value={kind}
            onChange={(e) => setKind(e.target.value as AgreementTemplateKind)}
          >
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button disabled={loading} onClick={() => setNewKind(kind)}>
          Create template
        </button>
        <button disabled={loading} onClick={() => setAttempt((n) => n + 1)}>
          Refresh templates
        </button>
      </div>
      <label>
        Search templates
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <label>
        Status
        <select
          aria-label="Template status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["all", "draft", "published", "archived"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {loading ? (
        <p role="status">Loading templates…</p>
      ) : (
        <div className="template-grid">
          {!error && !visible.length && <p>No matching templates.</p>}
          {visible.map((row) => (
            <article key={row.id}>
              <h2>{row.name}</h2>
              <p>
                {row.status} · v{row.version}
              </p>
              <p>{row.description}</p>
              <button onClick={() => void open(row.id)}>
                Open {row.name} v{row.version}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
