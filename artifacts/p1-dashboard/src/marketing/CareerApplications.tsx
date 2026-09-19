import {
  CareerApplicationsTable,
  CareerApplicationWorkspace,
} from "../../../../platform/p1-core/client/src/components/shared/career-admin-presentation";
import { CAREER_APPLICATION_STATUS_LABELS } from "../../../../platform/p1-core/shared/careers-display";
import { careerUI } from "./career-primitives";
import "./career-admin.css";
import { useEffect, useRef, useState } from "react";
import {
  listMarketingCareerApplications,
  getMarketingCareerApplication,
  updateMarketingCareerApplication,
} from "@workspace/api-client-react/dashboard";
import type { MarketingCareerApplication } from "../../../../lib/api-client-react/src/dashboard/models";
import { MarketingCareerApplicationStatus } from "../../../../lib/api-client-react/src/dashboard/models";
import { CareerResumeDownload } from "./CareerResumeDownload";
import { careerError } from "./CareerJobEditor";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
function jobTitle(row: MarketingCareerApplication) {
  const job = row.job;
  return job &&
    typeof job === "object" &&
    "title" in job &&
    typeof job.title === "string"
    ? job.title
    : "Job title unavailable";
}
function safeLink(value: string | null | undefined) {
  try {
    const url = new URL(value || "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function Review({
  row,
  changed,
  close,
  onBusyChange,
}: {
  row: MarketingCareerApplication;
  changed: (row: MarketingCareerApplication) => void;
  close: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [status, setStatus] = useState(row.status),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const alive = useRef(true),
    gate = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  const dirty = status !== row.status || Boolean(note);
  useCmsUnsavedChanges(dirty || busy);
  async function run(save: boolean) {
    if (gate.current) return;
    if (
      !save &&
      dirty &&
      !confirm("Discard local review edits and reload the saved application?")
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      if (save)
        await updateMarketingCareerApplication(row.id, {
          status,
          note,
          expectedUpdatedAt: row.updatedAt,
        });
      const fresh = await getMarketingCareerApplication(row.id);
      if (alive.current) changed(fresh);
    } catch (e) {
      if (alive.current) setError(careerError(e));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="career-review" aria-label="Application review">
      <h2>
        {row.firstName} {row.lastName}
      </h2>
      <p>Applied for: {jobTitle(row)}</p>
      <p>
        {row.email} · {row.phone || "No phone provided"}
      </p>
      <p>
        Received{" "}
        {row.createdAt
          ? new Date(row.createdAt).toLocaleString()
          : "Date unavailable"}{" "}
        · Source: {row.source || "Unavailable"}
      </p>
      {error && (
        <p role="alert">
          {error} Your review edits have been retained. Reload the saved
          application to check whether a previous attempt completed.
        </p>
      )}
      <CareerResumeDownload
        key={row.id}
        id={row.id}
        fileName={row.resumeFileName || "resume"}
      />
      {(["linkedinUrl", "portfolioUrl"] as const).map((key) =>
        safeLink(row[key]) ? (
          <p key={key}>
            <a href={safeLink(row[key])!} target="_blank" rel="noreferrer">
              {key === "linkedinUrl" ? "LinkedIn profile" : "Portfolio"}
            </a>
          </p>
        ) : null,
      )}
      <h3>Cover letter</h3>
      <p className="agreement-text">
        {row.coverLetter || "No cover letter provided."}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(true);
        }}
      >
        <fieldset disabled={busy}>
          <legend>Review decision and note</legend>
          <label>
            Status
            <select
              aria-label="Application status"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as MarketingCareerApplication["status"],
                )
              }
            >
              {Object.values(MarketingCareerApplicationStatus).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Review note
            <textarea
              aria-label="Review note"
              maxLength={50000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <p>
            Saving records the status and note together in the application
            history.
          </p>
          <button disabled={!dirty || !row.updatedAt}>
            {busy ? "Saving…" : "Save review"}
          </button>
          <button type="button" onClick={() => void run(false)}>
            Reload saved application
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                !dirty ||
                confirm(
                  "Discard local review edits and return to applications?",
                )
              )
                close();
            }}
          >
            Back to applications
          </button>
        </fieldset>
      </form>
      <h3>Application history</h3>
      {!row.notes?.length ? (
        <p>No review notes yet.</p>
      ) : (
        <ol>
          {row.notes.map((item, index) => (
            <li key={item.id || index}>
              <p>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : "Date unavailable"}{" "}
                · {item.statusFrom || "—"} → {item.statusTo || "—"}
              </p>
              <p className="agreement-text">{item.note}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
export default function CareerApplications({ close }: { close: () => void }) {
  const [rows, setRows] = useState<MarketingCareerApplication[]>([]),
    [selected, setSelected] = useState<MarketingCareerApplication | null>(null),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all");
  const [reviewBusy, setReviewBusy] = useState(false);
  const alive = useRef(true),
    gate = useRef(false);
  async function load() {
    if (gate.current) return;
    gate.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await listMarketingCareerApplications();
      if (alive.current) setRows(result);
    } catch (e) {
      if (alive.current) {
        setRows([]);
        setError(careerError(e));
      }
    } finally {
      gate.current = false;
      if (alive.current) setLoading(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, []);
  return (
    <section className="career-admin" aria-label="Career applications">
      <h1>Careers</h1>
      <button
        disabled={reviewBusy}
        onClick={() => {
          if (
            window.dispatchEvent(
              new Event("p1:before-navigation", { cancelable: true }),
            )
          )
            close();
        }}
      >
        Job postings
      </button>
      <button disabled={loading || reviewBusy} onClick={() => void load()}>
        Refresh applications
      </button>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Loading applications…</p>}
      <label>
        Search loaded applications
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <label>
        Filter by status
        <select
          aria-label="Filter application status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {Object.values(MarketingCareerApplicationStatus).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {!loading && !error && !rows.length && <p>No applications yet.</p>}
      <CareerApplicationWorkspace
        ui={careerUI}
        list={
          <CareerApplicationsTable
            ui={careerUI}
            applications={rows.filter(
              (row) =>
                (status === "all" || row.status === status) &&
                `${row.firstName} ${row.lastName} ${row.email}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )}
            jobTitle={jobTitle}
            statusLabel={(value) =>
              CAREER_APPLICATION_STATUS_LABELS[
                value as keyof typeof CAREER_APPLICATION_STATUS_LABELS
              ] || value
            }
            disabled={loading || reviewBusy}
            onSelect={async (row) => {
              if (
                reviewBusy ||
                !window.dispatchEvent(
                  new Event("p1:before-navigation", { cancelable: true }),
                )
              )
                return;
              if (gate.current) return;
              gate.current = true;
              setLoading(true);
              try {
                const detail = await getMarketingCareerApplication(row.id);
                if (alive.current) {
                  setSelected(detail);
                  setRevision((n) => n + 1);
                }
              } catch (e) {
                if (alive.current) setError(careerError(e));
              } finally {
                gate.current = false;
                if (alive.current) setLoading(false);
              }
            }}
          />
        }
        detail={
          selected ? (
            <Review
              key={`${selected.id}:${revision}`}
              row={selected}
              onBusyChange={setReviewBusy}
              changed={(row) => {
                setSelected(row);
                setRevision((n) => n + 1);
              }}
              close={() => {
                setSelected(null);
                void load();
              }}
            />
          ) : null
        }
      />
    </section>
  );
}
