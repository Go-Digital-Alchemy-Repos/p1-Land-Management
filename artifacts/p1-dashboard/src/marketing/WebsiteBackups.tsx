import React, { useEffect, useRef, useState } from "react";
import { Archive, Clock, Database, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import {
  getWebsiteBackupStatus,
  restoreWebsiteBackup,
  runWebsiteBackup,
} from "@workspace/api-client-react/dashboard";
import { scheduleDateTime } from "../schedule-dates";
import "./website-backups.css";

type Status = Awaited<ReturnType<typeof getWebsiteBackupStatus>>;
type Summary = Awaited<ReturnType<typeof runWebsiteBackup>>;
function BackupDetails({ backup }: { backup: Summary }) {
  return (
    <dl className="backup-details">
      <div>
        <dt>Created · Eastern time</dt>
        <dd>{scheduleDateTime(backup.createdAt)}</dd>
      </div>
      <div>
        <dt>Reason</dt>
        <dd>{backup.reason}</dd>
      </div>
      <div>
        <dt>Tables / rows / media records</dt>
        <dd>
          {backup.tableCount.toLocaleString()} /{" "}
          {backup.totalRowCount.toLocaleString()} /{" "}
          {backup.mediaAssetCount.toLocaleString()}
        </dd>
      </div>
      <div>
        <dt>Stack provenance</dt>
        <dd>
          {backup.clientStackId ||
            "Legacy archive — stack identity unavailable"}
        </dd>
      </div>
      <div>
        <dt>Revision / application</dt>
        <dd>
          {backup.gitCommitSha || "Revision unavailable"} / {backup.appVersion}
        </dd>
      </div>
      <div>
        <dt>Environment / storage source</dt>
        <dd>
          {backup.environment} / {backup.storageSource}
        </dd>
      </div>
      <div className="backup-key">
        <dt>Archive key</dt>
        <dd>{backup.key}</dd>
      </div>
    </dl>
  );
}
export default function WebsiteBackups() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<Summary | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [inspected, setInspected] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Summary | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [restoreCompleted, setRestoreCompleted] = useState<Summary | null>(null);
  const [restoreUncertain, setRestoreUncertain] = useState(false);
  const [restoreRefreshed, setRestoreRefreshed] = useState(false);
  const [restoreInspected, setRestoreInspected] = useState(false);
  const gate = useRef(false),
    live = useRef(true),
    request = useRef<AbortController | null>(null);
  const restoreDialog = useRef<HTMLDialogElement | null>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  function closeRestore() {
    setRestoreTarget(null);
    setRestoreConfirmation("");
    queueMicrotask(() => restoreFocus.current?.focus());
  }
  function openRestore(backup: Summary, trigger: HTMLElement) {
    restoreFocus.current = trigger;
    setRestoreTarget(backup);
    setRestoreConfirmation("");
  }
  useEffect(() => {
    if (!restoreTarget) return;
    const dialog = restoreDialog.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input")?.focus();
  }, [restoreTarget]);
  function options(timeoutMs = 30000) {
    request.current = new AbortController();
    return {
      signal: AbortSignal.any([
        request.current.signal,
        AbortSignal.timeout(timeoutMs),
      ]),
    };
  }
  async function refresh() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setFresh(false);
    setError("");
    if (uncertain) {
      setRefreshed(false);
      setInspected(false);
    }
    if (restoreUncertain) {
      setRestoreRefreshed(false);
      setRestoreInspected(false);
    }
    try {
      const next = await getWebsiteBackupStatus(options());
      if (live.current) {
        setStatus(next);
        setFresh(true);
        if (uncertain) setRefreshed(true);
        if (restoreUncertain) setRestoreRefreshed(true);
      }
    } catch {
      if (live.current)
        setError(
          "Backup status is unavailable. Previously displayed status may be stale. Refresh to try again.",
        );
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  async function create() {
    if (
      gate.current ||
      !status?.configured ||
      !fresh ||
      (uncertain && !(refreshed && inspected))
      || (restoreUncertain && !(restoreRefreshed && restoreInspected))
    )
      return;
    if (
      !window.confirm(
        "Create a manual database backup? This uploads an archive and applies retention, which can delete older backups. Media records are included, but media files are not. Continue?",
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setFresh(false);
    setError("");
    setCompleted(null);
    setUncertain(false);
    setRefreshed(false);
    setInspected(false);
    try {
      const result = await runWebsiteBackup(options());
      if (live.current) {
        setCompleted(result);
        // Retention may have removed older entries; never invent the remaining history.
        setStatus(null);
      }
    } catch {
      if (live.current) {
        setUncertain(true);
        setError(
          "Backup completion could not be confirmed. It may still be running or may have completed. Do not repeat the request until you inspect refreshed history and confirm its outcome.",
        );
      }
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  async function restore() {
    if (
      gate.current || !restoreTarget || !restoreTarget.clientStackId || !fresh || !status?.configured ||
      restoreUncertain && !(restoreRefreshed && restoreInspected) ||
      restoreConfirmation !== `RESTORE ${restoreTarget.key}`
    ) return;
    const key = restoreTarget.key;
    gate.current = true;
    setBusy(true);
    setFresh(false);
    setError("");
    setRestoreCompleted(null);
    setRestoreUncertain(false);
    setRestoreRefreshed(false);
    setRestoreInspected(false);
    try {
      const result = await restoreWebsiteBackup({ key, confirmation: restoreConfirmation }, options(300000));
      if (live.current) {
        setRestoreCompleted(result.manifest);
        setStatus(null);
        closeRestore();
      }
    } catch {
      if (live.current) {
        setRestoreUncertain(true);
        closeRestore();
        setError("Restore outcome could not be confirmed. It may still be running or may have completed. Do not retry or change content until you inspect refreshed history, verify the live site, and confirm recovery with the operations team.");
      }
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  useEffect(() => {
    live.current = true;
    void refresh();
    return () => {
      live.current = false;
      request.current?.abort();
    };
  }, []);
  return (
    <section className="website-backups" aria-busy={busy}>
      <header>
        <h2>
          <Archive color="#7c3aed" aria-hidden="true" /> Website backups
        </h2>
        <p>Database snapshots, retention policy and recovery provenance.</p>
      </header>
      <div className="backup-toolbar">
        <button disabled={busy} onClick={() => void refresh()}>
          <RefreshCw size={16} aria-hidden="true" />
          Refresh status
        </button>
        <button
          disabled={
            busy ||
            !status?.configured ||
            !fresh ||
            (uncertain && !(refreshed && inspected))
            || (restoreUncertain && !(restoreRefreshed && restoreInspected))
          }
          onClick={() => void create()}
        >
          Create manual backup
        </button>
        {busy && <span role="status">Request in progress…</span>}
      </div>
      {error && (
        <p role="alert" className="backup-warning">
          {error}
        </p>
      )}
      {uncertain && (
        <div className="backup-panel">
          <h3>Review the uncertain request</h3>
          <p>
            A status refresh does not cancel an in-flight backup or prove it has
            stopped. Inspect the latest archive and its timestamp before
            deciding whether another backup is needed.
          </p>
          <label>
            <input
              type="checkbox"
              disabled={!refreshed || busy}
              checked={inspected}
              onChange={(event) => setInspected(event.target.checked)}
            />{" "}
            I inspected the refreshed history and confirmed the earlier
            request’s outcome before another backup.
          </label>
        </div>
      )}
      {restoreUncertain && (
        <div className="backup-panel">
          <h3>Verify the uncertain restore</h3>
          <p>Refreshing history does not cancel an in-flight restore or prove which database state is live. Verify the live site, recovery logs, and other serving replicas before any further change.</p>
          <label>
            <input type="checkbox" disabled={!restoreRefreshed || busy} checked={restoreInspected} onChange={(event) => setRestoreInspected(event.target.checked)} />{" "}
            I verified the restored database state and confirmed the earlier request’s outcome with the operations team.
          </label>
        </div>
      )}
      {restoreCompleted && (
        <section className="backup-panel" role="status">
          <h3><ShieldCheck color="#16803d" aria-hidden="true" /> Restore completed</h3>
          <BackupDetails backup={restoreCompleted} />
          <p>Refresh history and verify live CMS content. Other serving replicas may hold pre-restore settings caches and require a controlled restart or expiry.</p>
        </section>
      )}
      {completed && (
        <section className="backup-panel" role="status">
          <h3>
            <ShieldCheck color="#16803d" aria-hidden="true" /> Manual backup
            completed
          </h3>
          <BackupDetails backup={completed} />
          <p>
            Refresh status to inspect history after retention has been applied.
          </p>
        </section>
      )}
      {status ? (
        <>
          <div className="backup-grid">
            <section className="backup-panel">
              <h3>
                <Clock color="#0891b2" aria-hidden="true" /> Schedule &
                retention
              </h3>
              <p>
                Scheduler:{" "}
                <strong>{status.enabled ? "Enabled" : "Disabled"}</strong>
              </p>
              <p>Interval: every {status.intervalHours} hours</p>
              <p>
                Retention: {status.retentionDays} days, up to{" "}
                {status.maxSnapshots} snapshots. Older archives may be deleted
                when a backup runs.
              </p>
            </section>
            <section className="backup-panel">
              <h3>
                <Database color="#2563eb" aria-hidden="true" /> Storage
              </h3>
              <p>
                Storage configuration:{" "}
                <strong>
                  {status.configured ? "Configured" : "Unavailable"}
                </strong>
              </p>
              {status.storage && (
                <dl>
                  <dt>Source</dt>
                  <dd>{status.storage.source}</dd>
                  <dt>Bucket</dt>
                  <dd>{status.storage.bucketName}</dd>
                  <dt>Prefix</dt>
                  <dd>{status.storage.prefix}</dd>
                </dl>
              )}
              <p>
                Configuration presence alone does not prove a successful backup.
              </p>
            </section>
          </div>
          <section className="backup-panel">
            <h3>Latest backup</h3>
            {status.latest ? (
              <BackupDetails backup={status.latest} />
            ) : (
              <p>No readable backup is available.</p>
            )}
          </section>
          <section className="backup-panel">
            <h3>Recent backups</h3>
            {status.recent.length ? (
              status.recent.map((backup) => (
                <details key={backup.key}>
                  <summary>
                    {scheduleDateTime(backup.createdAt)} Eastern ·{" "}
                    {backup.reason} · {backup.totalRowCount.toLocaleString()}{" "}
                    rows
                  </summary>
                  <BackupDetails backup={backup} />
                  <button type="button" disabled={busy || !fresh || !status.configured || !backup.clientStackId || restoreUncertain && !(restoreRefreshed && restoreInspected)} onClick={(event) => openRestore(backup, event.currentTarget)}>
                    <RotateCcw size={16} aria-hidden="true" /> {backup.clientStackId ? "Restore this archive" : "Legacy archive requires separate recovery review"}
                  </button>
                </details>
              ))
            ) : (
              <p>No recent backup history.</p>
            )}
          </section>
        </>
      ) : (
        !busy && !completed && !restoreCompleted && <p>Backup status has not loaded.</p>
      )}
      <p className="backup-note">
        Media counts describe database records, not backed-up media files.
        Separate media recovery and an isolated restore rehearsal are required.
        A database restore does not recover missing media files.
      </p>
      {restoreTarget && (
        <div className="backup-restore-overlay" role="presentation">
          <dialog ref={restoreDialog} className="backup-panel backup-restore-dialog" aria-labelledby="backup-restore-title" onCancel={(event) => {
            event.preventDefault();
            if (!busy) closeRestore();
          }}>
            <h3 id="backup-restore-title">Restore this database archive?</h3>
            <p>This replaces the live Core database. Changes made after {scheduleDateTime(restoreTarget.createdAt)} Eastern may be lost. Create and verify a fresh backup first, account for newer writes, and confirm the selected stack and archive provenance. Media files are separate.</p>
            <BackupDetails backup={restoreTarget} />
            <label htmlFor="backup-restore-confirmation">Type RESTORE followed by the complete archive key:</label>
            <code className="backup-confirmation-key">RESTORE {restoreTarget.key}</code>
            <input id="backup-restore-confirmation" type="text" autoComplete="off" spellCheck={false} value={restoreConfirmation} onChange={(event) => setRestoreConfirmation(event.target.value)} />
            <div className="backup-toolbar">
              <button type="button" disabled={busy} onClick={closeRestore}>Cancel</button>
              <button type="button" disabled={busy || restoreConfirmation !== `RESTORE ${restoreTarget.key}`} onClick={() => void restore()}>Restore database</button>
            </div>
          </dialog>
        </div>
      )}
    </section>
  );
}
