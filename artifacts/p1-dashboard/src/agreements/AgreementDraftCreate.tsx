import { useEffect, useRef, useState } from "react";
import {
  createAgreementDraft,
  listAgreementTemplates,
} from "@workspace/api-client-react/dashboard";
import type {
  AgreementDraft,
  AgreementDraftContext,
  AgreementDraftSelection,
  AgreementTemplate,
  CreateAgreementDraft,
} from "../../../../lib/api-client-react/src/dashboard/models";
import AgreementContextFields from "./AgreementContextFields";
import { labels, message } from "./template-draft";
import { useCmsUnsavedChanges } from "../marketing/useCmsUnsavedChanges";
export default function AgreementDraftCreate({
  created,
  close,
}: {
  created: (row: AgreementDraft) => void;
  close: () => void;
}) {
  const [title, setTitle] = useState("");
  const [context, setContext] = useState<AgreementDraftContext>(() => ({
    clientId: new URLSearchParams(location.search).get("clientId"),
    leadId: new URLSearchParams(location.search).get("leadId"),
    propertyId: new URLSearchParams(location.search).get("propertyId"),
    sourceEstimateId: new URLSearchParams(location.search).get("estimateId"),
  }));
  const [contextReady, setContextReady] = useState(false),
    [selection, setSelection] = useState<AgreementDraftSelection>({}),
    [mode, setMode] = useState("package");
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]),
    [catalogError, setCatalogError] = useState(""),
    [catalogReady, setCatalogReady] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  // Once attempted, retain the exact request until success or an explicit restart.
  // A response may be lost after the server committed; retry must find that draft.
  const request = useRef<CreateAgreementDraft | null>(null),
    [attempted, setAttempted] = useState(false),
    gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useCmsUnsavedChanges(
    Boolean(title) || attempted,
    "Leave this agreement draft setup? If a save response was lost, check the draft list before creating another.",
  );
  useEffect(() => {
    const controller = new AbortController();
    setCatalogReady(false);
    setCatalogError("");
    void listAgreementTemplates(
      { kind: "all", state: "published" },
      { signal: controller.signal },
    )
      .then((rows) => {
        if (!controller.signal.aborted) {
          setTemplates(rows);
          setCatalogReady(true);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCatalogError(message(error));
      });
    return () => controller.abort();
  }, [attempt]);
  async function submit() {
    if (gate.current) return;
    if (!request.current)
      request.current = {
        operationId: crypto.randomUUID(),
        title,
        context,
        selection,
      };
    gate.current = true;
    setBusy(true);
    setAttempted(true);
    setError("");
    try {
      const row = await createAgreementDraft(request.current);
      if (alive.current) created(row);
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section
      className="template-library"
      aria-label="New client agreement draft"
    >
      <h2>New client agreement draft</h2>
      <p>
        Choose published template versions, then tailor their copied terms,
        scope and cost rows for this agreement.
      </p>
      {error && (
        <p role="alert">
          {error} Retry uses the same request to avoid creating a second draft.
        </p>
      )}
      {catalogError && <p role="alert">{catalogError}</p>}
      <button disabled={busy} onClick={() => setAttempt((n) => n + 1)}>
        Refresh published templates
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <fieldset disabled={busy || attempted}>
          <legend>Draft setup</legend>
          <label>
            Agreement title
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <AgreementContextFields
            value={context}
            change={setContext}
            ready={setContextReady}
          />
          <label>
            Template selection
            <select
              aria-label="Template selection"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setSelection({});
              }}
            >
              <option value="package">Agreement package</option>
              <option value="components">Individual templates</option>
              <option value="blank">Start blank</option>
            </select>
          </label>
          {(mode === "package"
            ? (["package"] as const)
            : mode === "components"
              ? (["msa", "scope", "cost"] as const)
              : []
          ).map((kind) => {
            const key = `${kind}Id` as keyof AgreementDraftSelection;
            return (
              <label key={kind}>
                {labels[kind]}
                <select
                  aria-label={labels[kind]}
                  value={selection[key] || ""}
                  required={kind === "package"}
                  onChange={(e) =>
                    setSelection({
                      ...selection,
                      [key]: e.target.value || null,
                    })
                  }
                >
                  <option value="">
                    {kind === "package"
                      ? "Choose a published package"
                      : "No template"}
                  </option>
                  {templates
                    .filter((row) => row.kind === kind)
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name} · v{row.version}
                      </option>
                    ))}
                </select>
              </label>
            );
          })}
        </fieldset>
        <button
          disabled={
            busy ||
            (!attempted &&
              (!contextReady ||
                !catalogReady ||
                !(context.clientId || context.leadId)))
          }
        >
          {busy
            ? "Creating draft…"
            : attempted
              ? "Retry creating this draft"
              : "Create agreement draft"}
        </button>
      </form>
      {attempted && (
        <button
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                "Start a new request? If the previous response was lost, check the draft list first to avoid creating a duplicate.",
              )
            ) {
              request.current = null;
              setAttempted(false);
              setError("");
            }
          }}
        >
          Edit setup as a new request
        </button>
      )}
      <button
        disabled={busy}
        onClick={() => {
          if (
            (!title && !attempted) ||
            window.confirm(
              "Leave this setup and return to the saved draft list?",
            )
          )
            close();
        }}
      >
        Back to draft list
      </button>
    </section>
  );
}
