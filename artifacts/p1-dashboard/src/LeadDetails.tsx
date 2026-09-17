import { useEffect, useRef, useState } from "react";
import {
  getLeadDetails,
  updateLeadDetails,
  getLeadDetailHistory,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./marketing/useCmsUnsavedChanges";
import "./lead-follow-up.css";
type Details = Awaited<ReturnType<typeof getLeadDetails>>;
type History = Awaited<ReturnType<typeof getLeadDetailHistory>>;
const fields = [
  ["name", "Contact name", 200],
  ["email", "Contact email", 320],
  ["phone", "Contact phone", 100],
  ["reported_company_name", "Company", 300],
  ["location", "Inquiry location", 2000],
  ["description", "Inquiry message", 10000],
] as const;
type Draft = Record<(typeof fields)[number][0], string>;
const draftOf = (row: Details): Draft =>
  Object.fromEntries(fields.map(([key]) => [key, row[key] || ""])) as Draft;
export function LeadDetails({
  leadId,
  onSaved,
}: {
  leadId: string;
  onSaved?: (row: Details) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lead-follow-up">
      <button
        type="button"
        disabled={open}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Contact & inquiry details
      </button>
      {open && <Editor key={leadId} leadId={leadId} onSaved={onSaved} />}
    </div>
  );
}
function Editor({
  leadId,
  onSaved,
}: {
  leadId: string;
  onSaved?: (row: Details) => void;
}) {
  const [saved, setSaved] = useState<Details | null>(null),
    [draft, setDraft] = useState<Draft | null>(null),
    [history, setHistory] = useState<History>({
      items: [],
      nextBeforeVersion: null,
    }),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const alive = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  const dirty = !!(
    saved &&
    draft &&
    JSON.stringify(draft) !== JSON.stringify(draftOf(saved))
  );
  useCmsUnsavedChanges(
    dirty || uncertain,
    "Leave these contact changes? Reload the saved inquiry after an unconfirmed save.",
  );
  const options = () => {
    controller.current = new AbortController();
    return {
      signal: AbortSignal.any([
        controller.current.signal,
        AbortSignal.timeout(30000),
      ]),
    };
  };
  function apply(row: Details) {
    setSaved(row);
    setDraft(draftOf(row));
    setUncertain(false);
    onSaved?.(row);
  }
  async function load() {
    if (
      gate.current ||
      ((dirty || uncertain) &&
        !confirm("Discard local contact changes and reload the saved inquiry?"))
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const opt = options();
      const [row, past] = await Promise.all([
        getLeadDetails(leadId, opt),
        getLeadDetailHistory(leadId, undefined, opt),
      ]);
      if (alive.current) {
        apply(row);
        setHistory(past);
      }
    } catch {
      if (alive.current)
        setError(
          "Could not load inquiry details. Your local changes are retained.",
        );
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, [leadId]);
  async function save() {
    if (gate.current || !saved || !draft || uncertain) return;
    gate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const row = await updateLeadDetails(
        leadId,
        { ...draft, expectedVersion: saved.version },
        options(),
      );
      if (alive.current) {
        apply(row);
        setNotice(
          "Inquiry details saved. Reload details to see updated history. Refresh the inbox to reconcile search results.",
        );
      }
    } catch {
      if (alive.current) {
        setUncertain(true);
        setError(
          "The inquiry may have changed or the save could not be confirmed. Reload its saved details before another edit.",
        );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function older() {
    if (gate.current || !history.nextBeforeVersion) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const past = await getLeadDetailHistory(
        leadId,
        { beforeVersion: history.nextBeforeVersion },
        options(),
      );
      if (alive.current)
        setHistory((old) => ({
          items: [
            ...old.items,
            ...past.items.filter(
              (row) =>
                !old.items.some((prior) => prior.version === row.version),
            ),
          ],
          nextBeforeVersion: past.nextBeforeVersion,
        }));
    } catch {
      if (alive.current)
        setError(
          "Could not load older detail history. Existing details and drafts are retained.",
        );
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section aria-label="Inquiry contact details">
      <h3>Contact & inquiry details</h3>
      <p>
        Corrections apply to this inquiry. Linked customer and property records
        and saved agreements are updated separately.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <button type="button" disabled={busy} onClick={() => void load()}>
        Reload inquiry details
      </button>
      {saved && draft && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy || uncertain}>
            {fields.map(([key, label, max]) => (
              <label key={key}>
                {label}
                {key === "description" ? (
                  <textarea
                    aria-label={label}
                    value={draft[key]}
                    maxLength={max}
                    rows={4}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    aria-label={label}
                    type={key === "email" ? "email" : "text"}
                    value={draft[key]}
                    maxLength={max}
                    required={key === "name"}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
          </fieldset>
          <button
            type="submit"
            disabled={busy || uncertain || !dirty || !draft.name.trim()}
          >
            Save inquiry details
          </button>
          <small>Version {saved.version}</small>
        </form>
      )}
      <h4>Detail history</h4>
      <p>
        Baseline entries show values when history tracking began; created
        entries show values recorded on creation.
      </p>
      {history.items.map((row) => (
        <details key={row.version}>
          <summary>
            Version {row.version} · {row.kind} ·{" "}
            {new Date(row.recorded_at).toLocaleString()} ·{" "}
            {row.actor_name || "Author unavailable"}
          </summary>
          <dl>
            {fields.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {row.fields[key] || "Not provided"}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ))}
      {history.nextBeforeVersion && (
        <button type="button" disabled={busy} onClick={() => void older()}>
          Load older detail history
        </button>
      )}
    </section>
  );
}
