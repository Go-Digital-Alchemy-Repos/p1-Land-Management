import { PipelineStage, usePipelineStages } from "./PipelineSettings";
import { listSalesInquiries } from "@workspace/api-client-react/dashboard";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  onOpen,
}: {
  inquiry: Inquiry;
  onOpen: (id: string) => void;
}) {
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen(inquiry.id);
  }
  return (
    <article className="sales-pipeline-card">
      <a className="sales-pipeline-card-link" href={`/sales/leads/${encodeURIComponent(inquiry.id)}`} onClick={open} aria-label={`${inquiry.name} — open inquiry profile`}>
        <h4>{inquiry.name}</h4><ArrowUpRight size={17} aria-hidden="true" />
      </a>
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
      </small>
      {inquiry.next_action_due_at && <small className="sales-pipeline-due"><CalendarDays size={14} aria-hidden="true" /> Due {new Date(inquiry.next_action_due_at).toLocaleString()}</small>}
    </article>
  );
}

export function SalesPipelineBoard({
  onCreate,
  onOpen,
}: {
  onCreate: () => void;
  onOpen: (id: string) => void;
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
            Scan each stage, then open an inquiry profile to record its next step.
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
                  onOpen={onOpen}
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
