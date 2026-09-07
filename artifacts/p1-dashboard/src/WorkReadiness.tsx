import { useState } from "react";
import "./work-readiness.css";
export type ReadinessItem = { label: string; done: boolean };
export type ReadinessUpdate = {
  version: number;
  prerequisites: ReadinessItem[];
  reason: string;
};
export function WorkReadiness({
  work,
  save,
  onChanged,
  online = true,
}: {
  work: {
    id: string;
    version: number;
    status: string;
    prerequisites: ReadinessItem[];
    override_reason?: string | null;
  };
  save: (id: string, input: ReadinessUpdate) => Promise<unknown>;
  onChanged: () => Promise<void>;
  online?: boolean;
}) {
  const [items, setItems] = useState(work.prerequisites),
    [label, setLabel] = useState(""),
    [category, setCategory] = useState("Equipment");
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const editable =
    ["draft", "scheduled", "delayed"].includes(work.status) && online;
  async function submit() {
    if (busy || !editable) return;
    setBusy(true);
    setError("");
    try {
      await save(work.id, {
        version: work.version,
        prerequisites: items,
        reason,
      });
      await onChanged();
    } catch (e) {
      setError(
        (e as Error).message +
          ". If the job changed, reopen its calendar details before retrying. Your unsaved changes remain here until then.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Job readiness" className="work-readiness">
      <h4>Dispatch requirements</h4>
      {JSON.stringify(items) !== JSON.stringify(work.prerequisites) && (
        <p role="status">Unsaved changes. Save before dispatch.</p>
      )}
      <p>
        {items.filter((item) => item.done).length} of {items.length}{" "}
        requirements ready.
      </p>
      {work.override_reason && (
        <p>
          A management override is recorded: {work.override_reason}. Saving
          readiness changes clears that override so new requirements cannot
          inherit it.
        </p>
      )}
      {!online && <p>Reconnect to edit dispatch requirements.</p>}
      {!editable && online && (
        <p>
          Readiness is locked once work starts. Record new concerns as a field
          issue.
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {items.map((item, index) => (
          <div key={index} className="readiness-item">
            <label>
              <input
                type="checkbox"
                checked={item.done}
                disabled={!editable || busy}
                onChange={(e) =>
                  setItems((old) =>
                    old.map((row, i) =>
                      i === index ? { ...row, done: e.target.checked } : row,
                    ),
                  )
                }
              />
              {item.label}
            </label>
            {editable && (
              <button
                type="button"
                disabled={busy}
                aria-label={"Remove requirement: " + item.label}
                onClick={() =>
                  setItems((old) => old.filter((_, i) => i !== index))
                }
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {!items.length && (
          <p>
            No requirements recorded. Confirm what this job needs before
            dispatch.
          </p>
        )}
        {editable && (
          <>
            <div className="readiness-add">
              <label>
                Requirement type
                <select
                  value={category}
                  disabled={busy}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {[
                    "Equipment",
                    "Access",
                    "Materials",
                    "Permit",
                    "Deposit",
                    "Other",
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Requirement
                <input
                  value={label}
                  maxLength={1900}
                  disabled={busy}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Confirm mower is ready"
                />
              </label>
              <button
                type="button"
                disabled={busy || !label.trim() || items.length >= 50}
                onClick={() => {
                  const value = category + ": " + label.trim();
                  if (
                    items.some(
                      (item) =>
                        item.label.toLowerCase() === value.toLowerCase(),
                    )
                  ) {
                    setError("This requirement is already listed");
                    return;
                  }
                  setItems((old) => [...old, { label: value, done: false }]);
                  setLabel("");
                  setError("");
                }}
              >
                Add requirement
              </button>
            </div>
            <label>
              Reason for this update
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                maxLength={1000}
                disabled={busy}
              />
            </label>
            <button
              disabled={
                busy ||
                !reason.trim() ||
                JSON.stringify(items) === JSON.stringify(work.prerequisites)
              }
            >
              {busy ? "Saving…" : "Save readiness"}
            </button>
          </>
        )}
      </form>
    </section>
  );
}
