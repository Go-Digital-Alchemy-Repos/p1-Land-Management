import { LeadOnboarding } from "./LeadOnboarding";
import { CrmArchive } from "./CrmArchive";
import { LeadDetails } from "./LeadDetails";
import { LeadFollowUp } from "./LeadFollowUp";
import { LeadNotes } from "./LeadNotes";
import { CrmTasks } from "./CrmTasks";
import { PipelineStage, usePipelineStages } from "./PipelineSettings";
import { listSalesInquiries } from "@workspace/api-client-react/dashboard";
import { useEffect, useMemo, useRef, useState } from "react";
import "./sales-pipeline.css";

type Inquiry = Awaited<ReturnType<typeof listSalesInquiries>>["items"][number];
type InquiryQuery = NonNullable<Parameters<typeof listSalesInquiries>[0]>;
type StageStatus = NonNullable<InquiryQuery["status"]>;
type Column = { items: Inquiry[]; cursor: string | null };
type Columns = Record<string, Column>;

function emptyColumns(keys: string[]): Columns {
  return Object.fromEntries(
    keys.map((key) => [key, { items: [], cursor: null }]),
  );
}

function PipelineCard({
  inquiry,
  canOnboard,
  onChanged,
}: {
  inquiry: Inquiry;
  canOnboard: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className="sales-pipeline-card">
      <h4>{inquiry.name}</h4>
      <p>
        {inquiry.reported_company_name ||
          inquiry.location ||
          "Location not provided"}
      </p>
      {inquiry.next_action && (
        <p className="sales-pipeline-next">{inquiry.next_action}</p>
      )}
      <small>
        {inquiry.owner_name ||
          (inquiry.owner_id ? "Previous owner" : "Unassigned")}
        {inquiry.next_action_due_at
          ? ` · Due ${new Date(inquiry.next_action_due_at).toLocaleString()}`
          : ""}
      </small>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`inquiry-tools-${inquiry.id}`}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Close inquiry workspace" : "Open inquiry workspace"}
      </button>
      {open && (
        <div
          id={`inquiry-tools-${inquiry.id}`}
          className="sales-pipeline-card-tools"
          aria-label={`Inquiry tools for ${inquiry.name}`}
        >
          <LeadFollowUp leadId={inquiry.id} onSaved={onChanged} />
          <LeadDetails leadId={inquiry.id} onSaved={onChanged} />
          <LeadNotes leadId={inquiry.id} />
          <CrmTasks kind="lead" parentId={inquiry.id} />
          <CrmArchive kind="lead" parentId={inquiry.id} />
          {canOnboard && (
            <LeadOnboarding leadId={inquiry.id} onSaved={onChanged} />
          )}
        </div>
      )}
    </article>
  );
}

export function SalesPipelineBoard({
  canOnboard = false,
  onCreate,
}: {
  canOnboard?: boolean;
  onCreate: () => void;
}) {
  const stages = usePipelineStages();
  const stageKeys = useMemo(() => stages.map((stage) => stage.key), [stages]);
  const [columns, setColumns] = useState<Columns>(() =>
    emptyColumns(stageKeys),
  );
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);

  async function load() {
    const id = ++generation.current;
    controller.current?.abort();
    controller.current = new AbortController();
    setLoading(true);
    setLoadingMore(null);
    setError("");
    try {
      const pages = await Promise.all(
        stageKeys.map((status) =>
          listSalesInquiries(
            { status: status as StageStatus, limit: 100 },
            {
              signal: AbortSignal.any([
                controller.current!.signal,
                AbortSignal.timeout(30000),
              ]),
            },
          ),
        ),
      );
      if (generation.current === id) {
        const next = emptyColumns(stageKeys);
        stageKeys.forEach((key, index) => {
          next[key] = {
            items: pages[index].items,
            cursor: pages[index].nextCursor,
          };
        });
        setColumns(next);
        setHasLoaded(true);
      }
    } catch (cause) {
      if (generation.current === id && (cause as Error).name !== "AbortError")
        setError(
          "Could not load the sales pipeline. Existing cards remain visible; retry to refresh.",
        );
    } finally {
      if (generation.current === id) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, [stageKeys.join(":")]);

  async function more(status: string) {
    const column = columns[status];
    const activeController = controller.current;
    const id = generation.current;
    if (!column?.cursor || loading || loadingMore || !activeController) return;
    setLoadingMore(status);
    setError("");
    try {
      const page = await listSalesInquiries(
        {
          status: status as StageStatus,
          limit: 100,
          cursor: column.cursor,
        },
        {
          signal: AbortSignal.any([
            activeController.signal,
            AbortSignal.timeout(30000),
          ]),
        },
      );
      if (generation.current !== id || controller.current !== activeController)
        return;
      setColumns((current) => ({
        ...current,
        [status]: {
          items: [
            ...current[status].items,
            ...page.items.filter(
              (item) =>
                !current[status].items.some((old) => old.id === item.id),
            ),
          ],
          cursor: page.nextCursor,
        },
      }));
    } catch (cause) {
      if (
        generation.current === id &&
        controller.current === activeController &&
        (cause as Error).name !== "AbortError"
      ) {
        setError(
          "Could not load older inquiries for this stage. Retry to keep the current cards.",
        );
      }
    } finally {
      if (generation.current === id && controller.current === activeController)
        setLoadingMore(null);
    }
  }

  return (
    <section className="panel sales-pipeline" aria-label="Sales pipeline">
      <div className="panel-heading">
        <div>
          <h2>Pipeline</h2>
          <p>
            Manage every inquiry in its current sales stage. Changing a stage
            uses the existing versioned follow-up workflow.
          </p>
        </div>
        <div className="sales-pipeline-actions">
          <button type="button" onClick={onCreate}>
            Add inquiry
          </button>
          <button type="button" disabled={loading} onClick={() => void load()}>
            {loading ? "Refreshing…" : "Refresh pipeline"}
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">Refreshing pipeline…</p>}
      <div className="sales-pipeline-grid">
        {stages.map((stage) => {
          const column = columns[stage.key] || { items: [], cursor: null };
          return (
            <section
              className="sales-pipeline-column"
              key={stage.key}
              aria-label={`${stage.label} inquiries`}
            >
              <h3>
                <PipelineStage value={stage.key} />{" "}
                <span>{column.items.length}</span>
              </h3>
              {column.items.map((inquiry) => (
                <PipelineCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  canOnboard={canOnboard}
                  onChanged={() => void load()}
                />
              ))}
              {!loading && !hasLoaded && (
                <p className="sales-pipeline-empty">
                  Pipeline unavailable. Retry to refresh.
                </p>
              )}
              {!loading && hasLoaded && !column.items.length && (
                <p className="sales-pipeline-empty">
                  No inquiries in this stage.
                </p>
              )}
              {column.cursor && (
                <button
                  type="button"
                  disabled={loading || Boolean(loadingMore)}
                  onClick={() => void more(stage.key)}
                >
                  {loadingMore === stage.key
                    ? "Loading…"
                    : "Load older inquiries"}
                </button>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
