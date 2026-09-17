import { useEffect, useRef, useState } from "react";
import {
  listLeadTasks,
  listClientTasks,
  listLeadTaskAssignees,
  listClientTaskAssignees,
  getLeadTask,
  getClientTask,
  createLeadTask,
  createClientTask,
  updateLeadTask,
  updateClientTask,
  getLeadTaskHistory,
  getClientTaskHistory,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./marketing/useCmsUnsavedChanges";
import "./crm-tasks.css";
type Task = Awaited<ReturnType<typeof getLeadTask>>;
type Revision = Awaited<ReturnType<typeof getLeadTaskHistory>>["items"][number];
type Assignee = Awaited<ReturnType<typeof listLeadTaskAssignees>>[number];
type Values = {
  title: string;
  dueAt: string | null;
  assignedToId: string | null;
  completed: boolean;
};
const displayDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "No due date";
function localInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function CrmTasks({
  kind,
  parentId,
}: {
  kind: "lead" | "client";
  parentId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="crm-tasks">
      <button
        type="button"
        aria-expanded={open}
        disabled={open}
        onClick={() => setOpen(true)}
      >
        Follow-up tasks
      </button>
      {open && (
        <TaskManager key={kind + parentId} kind={kind} parentId={parentId} />
      )}
    </div>
  );
}
function TaskManager({
  kind,
  parentId,
}: {
  kind: "lead" | "client";
  parentId: string;
}) {
  const api =
    kind === "lead"
      ? {
          list: listLeadTasks,
          assignees: listLeadTaskAssignees,
          get: getLeadTask,
          create: createLeadTask,
          update: updateLeadTask,
          history: getLeadTaskHistory,
        }
      : {
          list: listClientTasks,
          assignees: listClientTaskAssignees,
          get: getClientTask,
          create: createClientTask,
          update: updateClientTask,
          history: getClientTaskHistory,
        };
  const [items, setItems] = useState<Task[]>([]),
    [assignees, setAssignees] = useState<Assignee[]>([]),
    [state, setState] = useState<"open" | "completed" | "all">("open"),
    [cursor, setCursor] = useState<string | null>(null),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Task | "new" | null>(null),
    [title, setTitle] = useState(""),
    [due, setDue] = useState(""),
    [assigned, setAssigned] = useState(""),
    [completed, setCompleted] = useState(false),
    [pending, setPending] = useState<{ id: string; body: Values } | null>(null),
    [uncertain, setUncertain] = useState(false),
    [history, setHistory] = useState<Revision[] | null>(null),
    [before, setBefore] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);
  const alive = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  const dirty = Boolean(
    editing &&
    (editing === "new"
      ? title.trim() || due || assigned || completed
      : title !== editing.title ||
        due !== localInput(editing.dueAt) ||
        assigned !== (editing.assignedToId || "") ||
        completed !== editing.completed),
  );
  useCmsUnsavedChanges(
    dirty || Boolean(pending) || uncertain,
    "Leave these task changes? An unconfirmed save may already be recorded; reload its history before trying again.",
  );
  function options() {
    controller.current = new AbortController();
    return {
      signal: AbortSignal.any([
        controller.current.signal,
        AbortSignal.timeout(30000),
      ]),
    };
  }
  async function load(append = false, filter = state) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const opts = options();
      const [page, people] = await Promise.all([
        api.list(
          parentId,
          { state: filter, ...(append && cursor ? { cursor } : {}) },
          opts,
        ),
        api.assignees(parentId, opts),
      ]);
      if (alive.current) {
        setItems((old) =>
          append
            ? [
                ...old,
                ...page.items.filter((n) => !old.some((p) => p.id === n.id)),
              ]
            : page.items,
        );
        setCursor(page.nextCursor);
        setAssignees(people);
        setLoaded(true);
        setState(filter);
      }
    } catch {
      if (alive.current)
        setError("Could not load tasks. Retry to refresh the saved list.");
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
  }, [kind, parentId]);
  function reset(task: Task | "new" | null) {
    setEditing(task);
    setTitle(task && task !== "new" ? task.title : "");
    setDue(task && task !== "new" ? localInput(task.dueAt) : "");
    setAssigned(task && task !== "new" ? task.assignedToId || "" : "");
    setCompleted(task && task !== "new" ? task.completed : false);
    setPending(null);
    setUncertain(false);
    setHistory(null);
    setBefore(null);
    setError("");
  }
  function mayDiscard() {
    return (
      !(dirty || pending || uncertain) ||
      window.confirm(
        "Discard local task changes? An unconfirmed save may already be recorded.",
      )
    );
  }
  async function edit(taskId: string, reload = false) {
    if (gate.current || !mayDiscard()) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.get(parentId, taskId, options());
      if (alive.current) {
        reset(result);
        if (reload)
          setMessage(
            "Saved task reloaded. Review its current values before editing.",
          );
      }
    } catch {
      if (alive.current)
        setError(
          "Could not load the saved task. Your local changes are still here.",
        );
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function save() {
    if (gate.current || !editing || uncertain) return;
    let body: Values;
    try {
      if (due && localInput(new Date(due).toISOString()) !== due)
        throw new Error("Invalid local time");
      body = pending?.body || {
        title: title.trim(),
        dueAt:
          editing !== "new" && due === localInput(editing.dueAt)
            ? editing.dueAt
            : due
              ? new Date(due).toISOString()
              : null,
        assignedToId: assigned || null,
        completed,
      };
    } catch {
      setError(
        "Enter a valid local due date and time. Times skipped by daylight saving are unavailable.",
      );
      return;
    }
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    let saved = false;
    try {
      if (editing === "new") {
        const input = pending || { id: crypto.randomUUID(), body };
        setPending(input);
        await api.create(parentId, { id: input.id, ...input.body }, options());
      } else
        await api.update(
          parentId,
          editing.id,
          { expectedVersion: editing.version, ...body },
          options(),
        );
      if (alive.current) {
        reset(null);
        setMessage("Task saved.");
        saved = true;
      }
    } catch {
      if (alive.current) {
        if (editing === "new")
          setError(
            "Creation could not be confirmed. Retry the same task to check or finish saving it.",
          );
        else {
          setUncertain(true);
          setError(
            "The task may have changed or the save could not be confirmed. Reload the saved task before another edit.",
          );
        }
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
    if (saved) await load();
  }
  async function loadHistory(append = false) {
    if (gate.current || !editing || editing === "new") return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.history(
        parentId,
        editing.id,
        append && before ? { beforeVersion: before } : {},
        options(),
      );
      if (alive.current) {
        setHistory((old) =>
          append ? [...(old || []), ...result.items] : result.items,
        );
        setBefore(result.nextBeforeVersion);
      }
    } catch {
      if (alive.current) setError("Could not load task history. Try again.");
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section aria-label="Follow-up task manager">
      <h3>Follow-up tasks</h3>
      <p>
        {kind === "lead"
          ? "Internal Sales follow-ups."
          : "Internal customer follow-ups."}{" "}
        Completed work stays in the task history.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className="crm-task-actions">
        <label>
          Task status
          <select
            value={state}
            disabled={busy}
            onChange={(e) => void load(false, e.target.value as typeof state)}
          >
            <option value="open">Open</option>
            <option value="completed">Completed</option>
            <option value="all">All tasks</option>
          </select>
        </label>
        <button type="button" disabled={busy} onClick={() => void load()}>
          Refresh tasks
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (mayDiscard()) reset("new");
          }}
        >
          New task
        </button>
      </div>
      {loaded && !items.length && <p>No tasks in this view.</p>}
      <ul className="crm-task-list">
        {items.map((task) => (
          <li key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <small>
                {task.completed ? "Completed" : "Open"} ·{" "}
                {displayDate(task.dueAt)}
              </small>
              <small>
                {task.assigneeName ||
                  (task.assignedToId
                    ? "Historical assignee unavailable"
                    : "Unassigned")}
                {task.imported ? " · Imported" : ""}
              </small>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void edit(task.id)}
            >
              Open task: {task.title}
            </button>
          </li>
        ))}
      </ul>
      {cursor && (
        <button type="button" disabled={busy} onClick={() => void load(true)}>
          Load older tasks
        </button>
      )}
      {editing && (
        <div className="crm-task-editor" ref={editorRef} tabIndex={-1}>
          <h4>
            {editing === "new" ? "New follow-up task" : "Edit follow-up task"}
          </h4>
          {editing !== "new" && (
            <p>
              Created by{" "}
              {editing.creatorName || "historical author unavailable"} ·{" "}
              {displayDate(editing.createdAt)} · Version {editing.version}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={busy || Boolean(pending) || uncertain}>
              <label>
                Task title
                <textarea
                  required
                  maxLength={2000}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  rows={2}
                />
              </label>
              <label>
                Due date and time (
                {Intl.DateTimeFormat().resolvedOptions().timeZone})
                <input
                  type="datetime-local"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                />
              </label>
              <label>
                Assigned to
                <select
                  aria-label="Assigned to"
                  value={assigned}
                  onChange={(e) => setAssigned(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {assigned && !assignees.some((p) => p.id === assigned) && (
                    <option value={assigned}>
                      Previous assignee — keep or replace
                    </option>
                  )}
                  {assignees.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crm-task-completed">
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                />
                Completed
              </label>
            </fieldset>
            <div className="crm-task-actions">
              <button
                type="submit"
                disabled={busy || uncertain || !title.trim()}
              >
                {busy
                  ? "Working…"
                  : pending
                    ? "Retry task creation"
                    : "Save task"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (mayDiscard()) reset(null);
                }}
              >
                Close task editor
              </button>
              {editing !== "new" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void edit(editing.id, true)}
                >
                  Reload saved task
                </button>
              )}
            </div>
          </form>
          {editing !== "new" && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void loadHistory()}
              >
                Show task history
              </button>
              {history && (
                <ol className="crm-task-history">
                  {history.map((r) => (
                    <li key={r.version}>
                      <strong>
                        Version {r.version} ·{" "}
                        {r.completed ? "Completed" : "Open"}
                      </strong>
                      <p>{r.title}</p>
                      <small>
                        Due: {displayDate(r.dueAt)} ·{" "}
                        {r.assigneeName ||
                          (r.assignedToId
                            ? "Historical assignee unavailable"
                            : "Unassigned")}
                      </small>
                      <small>
                        Recorded by{" "}
                        {r.changedByName || "historical actor unavailable"} ·{" "}
                        {displayDate(r.recordedAt)}
                      </small>
                    </li>
                  ))}
                </ol>
              )}
              {before && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void loadHistory(true)}
                >
                  Load older task history
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
