import {
  CareerJobsTable,
  CareerCard,
} from "../../../../platform/p1-core/client/src/components/shared/career-admin-presentation";
import {
  CAREER_JOB_STATUS_LABELS,
  CAREER_EMPLOYMENT_TYPE_LABELS,
} from "../../../../platform/p1-core/shared/careers-display";
import { careerUI } from "./career-primitives";
import "./career-admin.css";
import CareerSettings from "./CareerSettings";
import CareerApplications from "./CareerApplications";
import { useEffect, useRef, useState } from "react";
import {
  listMarketingCareerJobs,
  getMarketingCareerJob,
} from "@workspace/api-client-react/dashboard";
import type { MarketingCareerJob } from "../../../../lib/api-client-react/src/dashboard/models";
import CareerJobEditor, { careerError } from "./CareerJobEditor";
import "../agreements/template-library.css";
export default function CareerManager({
  isOwner = false,
}: {
  isOwner?: boolean;
}) {
  const [settings, setSettings] = useState(false);
  const [jobs, setJobs] = useState<MarketingCareerJob[]>([]),
    [selected, setSelected] = useState<MarketingCareerJob | "new" | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [search, setSearch] = useState(""),
    [revision, setRevision] = useState(0);
  const [applications, setApplications] = useState(false);
  const alive = useRef(true);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const rows = await listMarketingCareerJobs();
      if (alive.current) setJobs(rows);
    } catch (e) {
      if (alive.current) {
        setJobs([]);
        setError(careerError(e));
      }
    } finally {
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
  if (settings && isOwner)
    return <CareerSettings close={() => setSettings(false)} />;
  if (applications)
    return <CareerApplications close={() => setApplications(false)} />;
  return (
    <section className="career-admin" aria-label="Careers">
      <h1>Careers</h1>
      <button onClick={() => setApplications(true)}>Applications</button>
      {isOwner && (
        <button onClick={() => setSettings(true)}>Careers settings</button>
      )}
      <p>
        Manage website recruiting posts. Availability follows the website’s
        Careers feature setting.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="template-actions">
        <button disabled={loading} onClick={() => void load()}>
          Refresh jobs
        </button>
        <button
          disabled={loading || Boolean(error)}
          onClick={() => setSelected("new")}
        >
          New job
        </button>
      </div>
      <label>
        Search loaded jobs
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {loading && <p role="status">Loading jobs…</p>}
      {!loading && !error && !jobs.length && <p>No jobs yet.</p>}
      <CareerCard
        ui={careerUI}
        title="Jobs"
        description="Create and publish Career Center listings."
      >
        <CareerJobsTable
          ui={careerUI}
          jobs={jobs.filter((job) =>
            `${job.title} ${job.department || ""} ${job.location || ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )}
          statusLabel={(value) =>
            CAREER_JOB_STATUS_LABELS[
              value as keyof typeof CAREER_JOB_STATUS_LABELS
            ] || value
          }
          employmentLabel={(value) =>
            CAREER_EMPLOYMENT_TYPE_LABELS[
              value as keyof typeof CAREER_EMPLOYMENT_TYPE_LABELS
            ] || value
          }
          actions={(job) => (
            <>
              {" "}
              <button
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const row = await getMarketingCareerJob(job.id);
                    if (alive.current) {
                      setSelected(row);
                      setRevision((n) => n + 1);
                    }
                  } catch (e) {
                    if (alive.current) setError(careerError(e));
                  } finally {
                    if (alive.current) setLoading(false);
                  }
                }}
              >
                Edit {job.title}
              </button>
            </>
          )}
        />
      </CareerCard>
      {selected && (
        <CareerJobEditor
          key={`${selected === "new" ? "new" : selected.id}:${revision}`}
          job={selected}
          close={() => {
            setSelected(null);
            void load();
          }}
          saved={(row) => {
            setSelected(row);
            setRevision((n) => n + 1);
          }}
        />
      )}
    </section>
  );
}
