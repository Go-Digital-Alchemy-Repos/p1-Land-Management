import { CmsRichTextEditor } from "./CmsRichTextEditor";
import { useEffect, useRef, useState } from "react";
import {
  createMarketingCareerJob,
  deleteMarketingCareerJob,
  updateMarketingCareerJob,
  getMarketingCareerJob,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingCareerJob,
  MarketingCareerJobInput,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
export const careerError = (error: unknown) =>
  (error as { data?: { message?: string; error?: string } }).data?.message ||
  (error as { data?: { error?: string } }).data?.error ||
  (error as Error).message ||
  "Careers request failed";
const textFields = [
  "title",
  "slug",
  "department",
  "location",
  "locationAddress",
  "salaryCurrency",
  "salaryPeriod",
  "summary",
  "description",
  "requirements",
  "benefits",
  "applicationInstructions",
  "metaTitle",
  "metaDescription",
] as const;
const choices = {
  status: ["draft", "published", "closed", "archived"],
  visibility: ["public", "internal"],
  employmentType: [
    "full_time",
    "part_time",
    "contract",
    "temporary",
    "internship",
    "volunteer",
  ],
  workMode: ["on_site", "hybrid", "remote"],
} as const;
const labels: Record<string, string> = {
  locationAddress: "Location address",
  salaryCurrency: "Salary currency",
  salaryPeriod: "Salary period",
  applicationInstructions: "Application instructions",
  metaTitle: "SEO title",
  metaDescription: "SEO description",
  employmentType: "Employment type",
  workMode: "Work mode",
  salaryMin: "Minimum salary",
  salaryMax: "Maximum salary",
  publishedAt: "Publish date",
  closesAt: "Closing date",
  salaryVisible: "Show salary",
  noindex: "Exclude from search engines",
};
const label = (key: string) =>
  labels[key] || key[0].toUpperCase() + key.slice(1);
function initial(job: MarketingCareerJob | "new"): MarketingCareerJobInput {
  if (job === "new")
    return {
      title: "",
      slug: "",
      status: "draft",
      visibility: "public",
      employmentType: "full_time",
      workMode: "on_site",
      salaryCurrency: "USD",
      salaryPeriod: "year",
      salaryVisible: false,
      noindex: false,
    };
  const keys = [
    ...textFields,
    ...Object.keys(choices),
    "salaryMin",
    "salaryMax",
    "salaryVisible",
    "noindex",
    "publishedAt",
    "closesAt",
    "directoryProfileId",
    "integrationMetadata",
  ];
  return {
    title: job.title,
    ...Object.fromEntries(
      keys
        .filter((key) => job[key] !== undefined)
        .map((key) => [key, structuredClone(job[key])]),
    ),
  } as MarketingCareerJobInput;
}
export default function CareerJobEditor({
  job,
  close,
  saved,
}: {
  job: MarketingCareerJob | "new";
  close: () => void;
  saved: (job: MarketingCareerJob) => void;
}) {
  const [value, setValue] = useState(() => initial(job)),
    [baseline] = useState(() => JSON.stringify(initial(job))),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const [deleteUncertain, setDeleteUncertain] = useState(false);
  const alive = useRef(true),
    gate = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const dirty = JSON.stringify(value) !== baseline;
  useCmsUnsavedChanges(dirty || busy);
  const change = (key: string, v: unknown) =>
    setValue((row) => ({ ...row, [key]: v }));
  const existing = job !== "new";
  async function save() {
    if (gate.current || deleteUncertain || (!existing && uncertain)) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await (existing
        ? updateMarketingCareerJob(job.id, {
            ...value,
            expectedUpdatedAt: job.updatedAt,
          })
        : createMarketingCareerJob(value));
      if (alive.current) saved(result);
    } catch (e) {
      if (alive.current) {
        setError(careerError(e));
        if (!existing) setUncertain(true);
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function remove() {
    if (!existing || !job.updatedAt || dirty || gate.current || deleteUncertain)
      return;
    if (
      !confirm(
        `Delete “${job.title}”? Jobs with applications cannot be deleted. Archive the job instead to keep its recruiting history.`,
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      await deleteMarketingCareerJob(job.id, {
        expectedUpdatedAt: job.updatedAt,
      });
      if (alive.current) close();
    } catch (cause) {
      if (alive.current) {
        setError(careerError(cause));
        const status = (cause as { status?: number }).status;
        if (![400, 403, 409].includes(status ?? 0)) setDeleteUncertain(true);
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="template-library" aria-label="Career job editor">
      <h2>{existing ? "Edit job" : "New job"}</h2>
      <p>
        Published public jobs appear on the website when their publish date
        arrives. Internal, draft, closed and archived jobs are not public
        listings.
      </p>
      {error && <p role="alert">{error} Your edits have been kept.</p>}
      {deleteUncertain && (
        <p role="alert">
          The deletion result is uncertain. Reload the saved job or return to
          the job list to check before making further changes.
        </p>
      )}
      {uncertain && (
        <p role="alert">
          The creation result is uncertain. Return to the job list and refresh
          to check for the saved job before creating another.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy}>
          <legend>Job details</legend>
          {textFields
            .filter(
              (key) =>
                ![
                  "description",
                  "requirements",
                  "benefits",
                  "applicationInstructions",
                ].includes(key),
            )
            .map((key) => (
              <label key={key}>
                {label(key)}
                {[
                  "summary",
                  "description",
                  "requirements",
                  "benefits",
                  "applicationInstructions",
                  "metaDescription",
                ].includes(key) ? (
                  <textarea
                    aria-label={label(key)}
                    value={String(value[key] || "")}
                    onChange={(e) => change(key, e.target.value)}
                  />
                ) : (
                  <input
                    required={key === "title"}
                    value={String(value[key] || "")}
                    onChange={(e) => change(key, e.target.value)}
                  />
                )}
              </label>
            ))}
          {(
            [
              "description",
              "requirements",
              "benefits",
              "applicationInstructions",
            ] as const
          ).map((key) => (
            <section key={key}>
              <h3>{label(key)}</h3>
              <CmsRichTextEditor
                label={label(key)}
                value={value[key] || ""}
                onChange={(html) => change(key, html)}
                disabled={busy}
              />
            </section>
          ))}
          {Object.entries(choices).map(([key, options]) => (
            <label key={key}>
              {label(key)}
              <select
                value={String(
                  value[key as keyof MarketingCareerJobInput] || options[0],
                )}
                onChange={(e) => change(key, e.target.value)}
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {(["salaryMin", "salaryMax"] as const).map((key) => (
            <label key={key}>
              {label(key)}
              <input
                type="number"
                step="1"
                min="0"
                value={value[key] ?? ""}
                onChange={(e) =>
                  change(
                    key,
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </label>
          ))}
          {(["publishedAt", "closesAt"] as const).map((key) => (
            <label key={key}>
              {label(key)} (UTC)
              <input
                type="datetime-local"
                step="1"
                value={
                  value[key]
                    ? new Date(value[key]!).toISOString().slice(0, 19)
                    : ""
                }
                onChange={(e) =>
                  change(
                    key,
                    e.target.value
                      ? new Date(e.target.value + "Z").toISOString()
                      : null,
                  )
                }
              />
            </label>
          ))}
          {(["salaryVisible", "noindex"] as const).map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={Boolean(value[key])}
                onChange={(e) => change(key, e.target.checked)}
              />
              {label(key)}
            </label>
          ))}
          {existing && job.directoryProfileId && (
            <p>The existing directory location link is retained.</p>
          )}
          <button
            disabled={
              busy ||
              deleteUncertain ||
              (!existing && uncertain) ||
              (existing && !job.updatedAt)
            }
          >
            {busy ? "Saving…" : existing ? "Save job" : "Create job"}
          </button>
          {existing && (
            <button
              type="button"
              onClick={async () => {
                if (
                  dirty &&
                  !confirm("Discard these edits and reload the saved job?")
                )
                  return;
                setBusy(true);
                try {
                  saved(await getMarketingCareerJob(job.id));
                } catch (e) {
                  setError(careerError(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Reload saved job
            </button>
          )}
          {existing && (
            <div>
              <p>
                To retain recruiting history, set Status to Archived and save.
                Save or discard local edits before deleting a job.
              </p>
              <button
                type="button"
                disabled={dirty || !job.updatedAt || deleteUncertain}
                onClick={() => void remove()}
              >
                Delete job
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (
                !dirty ||
                confirm("Leave this job editor and discard local edits?")
              )
                close();
            }}
          >
            Back to jobs
          </button>
        </fieldset>
      </form>
    </section>
  );
}
