import { useEffect, useRef, useState } from "react";
import {
  listMarketingCareerJobs,
  getMarketingCareerJob,
} from "@workspace/api-client-react/dashboard";
import type { MarketingCareerJob } from "../../../../lib/api-client-react/src/dashboard/models";
import CareerJobEditor, { careerError } from "./CareerJobEditor";
import "../agreements/template-library.css";
export default function CareerManager() {
  const [jobs, setJobs] = useState<MarketingCareerJob[]>([]),
    [selected, setSelected] = useState<MarketingCareerJob | "new" | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [search, setSearch] = useState(""),
    [revision, setRevision] = useState(0);
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
  if (selected)
    return (
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
    );
  return (
    <section className="template-library" aria-label="Careers">
      <h2>Job postings</h2>
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
      <div className="template-grid">
        {jobs
          .filter((job) =>
            `${job.title} ${job.department || ""} ${job.location || ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((job) => (
            <article key={job.id}>
              <h3>{job.title}</h3>
              <p>
                {job.status} · {job.visibility} ·{" "}
                {job.location || "Location not set"}
              </p>
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
            </article>
          ))}
      </div>
    </section>
  );
}
