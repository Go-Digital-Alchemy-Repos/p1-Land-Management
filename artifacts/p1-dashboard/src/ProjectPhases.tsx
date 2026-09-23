import type { ProjectPhaseBillingIntentInput } from "../../../lib/api-client-react/src/dashboard/models";
import { useCmsUnsavedChanges } from "./marketing/useCmsUnsavedChanges";
import {
  BillingAllocationPicker,
  type BillingAllocationSelection,
} from "./BillingAllocationPicker";
import { hasCapability } from "@workspace/api-zod/business-access";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Api = (
  path: string,
  body?: unknown,
  method?: "POST" | "PATCH",
) => Promise<any>;
type Phase = {
  id: string;
  title: string;
  scope: string;
  status: string;
  position: number;
  version: number;
  prerequisites?: { label: string; done: boolean }[];
  planned_start?: string | null;
  planned_end?: string | null;
  published_at?: string | null;
  published_summary?: string | null;
};
const next: Record<string, string> = {
  planned: "ready",
  ready: "in_progress",
  in_progress: "manager_review",
  manager_review: "accepted",
  accepted: "archived",
  blocked: "ready",
  cancelled: "archived",
};
const label = (status: string) => status.replaceAll("_", " ");

export function ProjectPhases({
  projects,
  estimates,
  role,
  capabilities,
  api,
  refresh,
  onError,
}: {
  projects: any[];
  estimates: any[];
  role: string | null | undefined;
  capabilities?: readonly string[];
  api: Api;
  refresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [projectId, setProjectId] = useState("");
  const [phases, setPhases] = useState<Phase[]>([]);
  const [phaseLoad, setPhaseLoad] = useState<{
    projectId: string;
    status: "idle" | "loading" | "ready" | "error";
    message?: string;
  }>({ projectId: "", status: "idle" });
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [billingPhase, setBillingPhase] = useState<string | null>(null);
  const [estimateId, setEstimateId] = useState("");
  const [amount, setAmount] = useState("");
  const [billingTitle, setBillingTitle] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [publishingPhase, setPublishingPhase] = useState<string | null>(null);
  const [publishSummary, setPublishSummary] = useState("");
  const [billingAttempt, setBillingAttempt] = useState<{
    phaseId: string;
    body: ProjectPhaseBillingIntentInput;
  } | null>(null);
  useCmsUnsavedChanges(
    Boolean(billingAttempt),
    "A billing request is unresolved. Check existing drafts before starting another. Leave this screen?",
  );
  const billingGate = useRef(false);
  const loadSequence = useRef(0);
  useEffect(
    () => () => {
      loadSequence.current++;
    },
    [],
  );
  const [billingAllocation, setBillingAllocation] =
    useState<BillingAllocationSelection | null>(null);
  const selected = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId],
  );
  const subject = { role: role || null, capabilities };
  const canManage = hasCapability(subject, "operations.projects");
  const canBill = hasCapability(subject, "revenue.billing");
  const load = async (value = projectId) => {
    const sequence = ++loadSequence.current;
    if (!value) {
      setPhases([]);
      setPhaseLoad({ projectId: "", status: "idle" });
      return;
    }
    setPhaseLoad({ projectId: value, status: "loading" });
    try {
      const rows = await api(`/projects/${value}/phases`);
      if (sequence === loadSequence.current) {
        setPhases(rows);
        setPhaseLoad({ projectId: value, status: "ready" });
      }
    } catch (error) {
      if (sequence === loadSequence.current)
        setPhaseLoad({
          projectId: value,
          status: "error",
          message: (error as Error).message,
        });
    }
  };
  useEffect(() => {
    if (!projectId && projects[0]) setProjectId(projects[0].id);
  }, [projectId, projects]);
  useEffect(() => {
    void load();
  }, [projectId]);
  async function run(work: () => Promise<void>) {
    onError("");
    setBusy(true);
    try {
      await work();
      await load();
      await refresh();
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel project-phases">
      <div className="panel-heading project-phases-heading">
        <div>
          <p className="eyebrow">Project delivery</p>
          <h2>Phases and billing review</h2>
          <p className="muted">
            History is permanent. Billing preparation creates a reviewable draft
            only.
          </p>
        </div>
        {canManage && (
          <button
            className="secondary"
            disabled={
              !projectId || busy ||
              phaseLoad.projectId !== projectId ||
              phaseLoad.status !== "ready"
            }
            onClick={() => setShowCreate((value) => !value)}
          >
            Add phase
          </button>
        )}
      </div>
      {!projects.length ? (
        <p className="muted">
          Create a project to plan phases, prerequisites, review and billing
          intent.
        </p>
      ) : (
        <>
          <label className="project-phase-select">
            Project
            <select
              disabled={busy || Boolean(billingAttempt)}
              value={projectId}
              onChange={(event) => {
                loadSequence.current++;
                setPhases([]);
                setBillingPhase(null);
                setEstimateId("");
                setBillingAllocation(null);
                setPublishingPhase(null);
                setPublishSummary("");
                setProjectId(event.target.value);
              }}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} · {project.property_name}
                </option>
              ))}
            </select>
          </label>
          {showCreate && (
            <div className="phase-form">
              <label>
                Phase name
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={500}
                />
              </label>
              <label>
                Scope
                <textarea
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  maxLength={10000}
                />
              </label>
              <button
                className="primary"
                disabled={busy || !title.trim()}
                onClick={() =>
                  void run(async () => {
                    await api(`/projects/${projectId}/phases`, {
                      title,
                      scope,
                      prerequisites: [],
                    });
                    setTitle("");
                    setScope("");
                    setShowCreate(false);
                  })
                }
              >
                Create phase
              </button>
            </div>
          )}
          {phaseLoad.projectId === projectId && phaseLoad.status === "loading" && (
            <p role="status" className="muted">Loading project phases…</p>
          )}
          {phaseLoad.projectId === projectId && phaseLoad.status === "error" && (
            <div role="alert" className="error">
              Project phases could not be loaded. {phaseLoad.message}{" "}
              <button type="button" onClick={() => void load()}>
                Retry loading phases
              </button>
            </div>
          )}
          {phaseLoad.projectId === projectId && phaseLoad.status === "ready" && <div className="phase-list">
            {phases.map((phase) => {
              const target = next[phase.status];
              const needsOverride = Boolean(
                phase.prerequisites?.some((item) => !item.done) &&
                ["ready", "in_progress"].includes(target),
              );
              return (
                <article className="phase-card" key={phase.id}>
                  <div>
                    <p className="eyebrow">
                      Phase {phase.position + 1} · {label(phase.status)}
                    </p>
                    <h3>{phase.title}</h3>
                    {phase.scope && <p>{phase.scope}</p>}
                    {phase.planned_start && (
                      <p className="muted">
                        Planned {phase.planned_start}
                        {phase.planned_end ? ` to ${phase.planned_end}` : ""}
                      </p>
                    )}
                    {phase.prerequisites?.some((item) => !item.done) && (
                      <p className="warning">
                        Prerequisites need review before dispatch.
                      </p>
                    )}
                    {phase.published_at && (
                      <p className="muted">Client update published.</p>
                    )}
                  </div>
                  {canManage && needsOverride && (
                    <label className="phase-override">
                      Override reason required to move this phase
                      <input
                        value={overrides[phase.id] || ""}
                        onChange={(event) =>
                          setOverrides((current) => ({
                            ...current,
                            [phase.id]: event.target.value,
                          }))
                        }
                        maxLength={10000}
                      />
                    </label>
                  )}
                  <div className="phase-actions">
                    {canManage && target && (
                      <button
                        className="secondary"
                        disabled={
                          busy ||
                          (needsOverride && !overrides[phase.id]?.trim())
                        }
                        onClick={() =>
                          void run(() =>
                            api(`/project-phases/${phase.id}/transitions`, {
                              expectedVersion: phase.version,
                              status: target,
                              reason: `Moved phase to ${label(target)}`,
                              overrideReason:
                                overrides[phase.id]?.trim() || undefined,
                            }),
                          )
                        }
                      >
                        Move to {label(target)}
                      </button>
                    )}
                    {canManage &&
                      ["manager_review", "accepted"].includes(phase.status) && (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => {
                            setPublishingPhase(phase.id);
                            setPublishSummary(
                              phase.published_summary ||
                                `P1 has reviewed the ${phase.title} phase.`,
                            );
                          }}
                        >
                          {phase.published_at
                            ? "Update client note"
                            : "Review client note"}
                        </button>
                      )}
                    {canBill && phase.status === "accepted" && (
                      <button
                        className="secondary"
                        disabled={busy || Boolean(billingAttempt)}
                        onClick={() => {
                          setBillingPhase(phase.id);
                          setEstimateId("");
                          setBillingAllocation(null);
                          setBillingTitle(
                            `${selected?.name || "Project"} · ${phase.title}`,
                          );
                        }}
                      >
                        Prepare progress draft
                      </button>
                    )}
                  </div>
                  {canManage && publishingPhase === phase.id && (
                    <form
                      className="phase-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const summary = publishSummary.trim();
                        if (!summary) return;
                        void run(async () => {
                          await api(`/project-phases/${phase.id}/publish`, {
                            expectedVersion: phase.version,
                            summary,
                          });
                          setPublishingPhase(null);
                          setPublishSummary("");
                        });
                      }}
                    >
                      <label style={{ gridColumn: "1 / -1" }}>
                        Client-visible update for {phase.title}
                        <textarea
                          value={publishSummary}
                          onChange={(event) => setPublishSummary(event.target.value)}
                          maxLength={10000}
                          rows={4}
                          required
                          disabled={busy}
                        />
                      </label>
                      <p className="muted" style={{ gridColumn: "1 / -1" }}>
                        Review the exact text before making it visible to the client.
                      </p>
                      <button className="primary" type="submit" disabled={busy || !publishSummary.trim()}>
                        {phase.published_at ? "Save published note" : "Publish client note"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setPublishingPhase(null);
                          setPublishSummary("");
                        }}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                  {billingPhase === phase.id && (
                    <div className="phase-form billing-form">
                      <fieldset disabled={busy || Boolean(billingAttempt)}>
                        <legend>Progress billing details</legend>
                        <label>
                          Approved estimate
                          <select
                            value={estimateId}
                            onChange={(event) => {
                              setEstimateId(event.target.value);
                              setBillingAllocation(null);
                            }}
                          >
                            <option value="">Select estimate</option>
                            {estimates
                              .filter(
                                (estimate) =>
                                  estimate.property_id ===
                                    selected?.property_id &&
                                  estimate.status === "approved",
                              )
                              .map((estimate) => (
                                <option value={estimate.id} key={estimate.id}>
                                  {estimate.title}
                                </option>
                              ))}
                          </select>
                        </label>
                        <BillingAllocationPicker
                          key={estimateId}
                          estimateId={estimateId}
                          onChange={setBillingAllocation}
                        />
                        <label>
                          Draft title
                          <input
                            value={billingTitle}
                            onChange={(event) =>
                              setBillingTitle(event.target.value)
                            }
                          />
                        </label>
                        <label>
                          Amount (USD)
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                          />
                        </label>
                      </fieldset>
                      {billingAttempt && (
                        <p role="status">
                          These details are held for an exact retry. The
                          previous request may already have created a draft.
                        </p>
                      )}
                      <button
                        className="primary"
                        disabled={
                          busy ||
                          (!billingAttempt &&
                            (!billingAllocation?.ready ||
                              billingAllocation.estimateId !== estimateId))
                        }
                        onClick={() => {
                          if (billingGate.current) return;
                          const cents = Math.round(Number(amount) * 100);
                          if (
                            !billingAttempt &&
                            (!estimateId ||
                              !billingAllocation?.ready ||
                              billingAllocation.estimateId !== estimateId ||
                              !billingTitle.trim() ||
                              !Number.isSafeInteger(cents) ||
                              cents <= 0)
                          ) {
                            onError(
                              "Select an approved estimate and enter a positive draft amount.",
                            );
                            return;
                          }
                          const request = billingAttempt || {
                            phaseId: phase.id,
                            body: {
                              operationId: crypto.randomUUID(),
                              expectedPhaseVersion: phase.version,
                              estimateId,
                              estimateAllocationId:
                                billingAllocation?.allocationId || null,
                              title: billingTitle,
                              amountCents: cents,
                              kind: "progress" as const,
                            },
                          };
                          billingGate.current = true;
                          setBillingAttempt(request);
                          void run(async () => {
                            await api(
                              `/project-phases/${request.phaseId}/billing-intents`,
                              request.body,
                            );
                            setBillingAttempt(null);
                            setBillingPhase(null);
                            setEstimateId("");
                            setBillingAllocation(null);
                            setAmount("");
                            setBillingTitle("");
                          }).finally(() => {
                            billingGate.current = false;
                          });
                        }}
                      >
                        {billingAttempt ? "Retry same draft" : "Prepare draft"}
                      </button>
                      {billingAttempt && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Check existing billing drafts first: the previous request may already have succeeded. Start a different request with editable details?",
                              )
                            )
                              setBillingAttempt(null);
                          }}
                        >
                          Review different details
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {!phases.length && (
              <p className="muted">
                No normalized phases have been added. Existing legacy project
                notes remain unchanged.
              </p>
            )}
          </div>}
        </>
      )}
    </section>
  );
}
