import "./page-presentation.css";
import React, { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Layers,
  Settings,
  Globe,
  Sparkles,
  Check,
  AlertTriangle,
  Plus,
  Pencil,
  CalendarClock,
  Copy,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import type { CmsPageQualityIssue } from "../../lib/cms-page-quality";

export type PageEditorTab = "builder" | "settings" | "seo" | "quality";
export function PageEditorPresentation({
  title,
  lastSaved,
  status,
  scheduledAt,
  dirty,
  busy,
  saveDisabled,
  onBack,
  onSave,
  actions,
  banners,
  builder,
  settings,
  references,
  seo,
  previewActions,
  templates,
  qualityIssues,
}: {
  title: string;
  lastSaved?: string | Date | null;
  status: string;
  scheduledAt?: string | Date | null;
  dirty: boolean;
  busy: boolean;
  saveDisabled?: boolean;
  onBack: () => void;
  onSave: () => void;
  actions: ReactNode;
  banners: ReactNode;
  builder: ReactNode;
  settings: ReactNode;
  references: ReactNode;
  seo: ReactNode;
  previewActions: ReactNode;
  templates: ReactNode;
  qualityIssues: CmsPageQualityIssue[];
}) {
  const [tab, setTab] = useState<PageEditorTab>("builder");
  const totals = {
    error: qualityIssues.filter((x) => x.severity === "error").length,
    warning: qualityIssues.filter((x) => x.severity === "warning").length,
    info: qualityIssues.filter((x) => x.severity === "info").length,
  };
  const tabs = [
    { id: "builder", label: "Builder", Icon: Layers },
    { id: "settings", label: "Page Settings", Icon: Settings },
    { id: "seo", label: "SEO", Icon: Globe },
    { id: "quality", label: "Quality", Icon: Sparkles },
  ] as const;
  return (
    <div className={`cms-page-presentation ${tab === "builder" ? "cms-page-wide" : ""}`}>
      {banners}
      <div className="cms-page-editor-header">
        <div className="cms-page-title">
          <button type="button" aria-label="Back to CMS pages" onClick={onBack} disabled={busy}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{title}</h1>
            {lastSaved && <p>Last saved {new Date(lastSaved).toLocaleString()}</p>}
          </div>
        </div>
        <div className="cms-page-toolbar">
          {actions}
          <span className={`cms-page-badge status-${status}`}>
            {status === "scheduled" ? <CalendarClock size={14} /> : <Globe size={14} />} {status}
            {scheduledAt && <> · {new Date(scheduledAt).toLocaleString()}</>}
          </span>
          <span
            className={`cms-page-badge ${qualityIssues.length ? "quality-warning" : "quality-ready"}`}
          >
            {qualityIssues.length ? <AlertTriangle size={14} /> : <Check size={14} />}{" "}
            {qualityIssues.length
              ? `${totals.error + totals.warning} quality issues`
              : "Ready to publish"}
          </span>
          <button
            type="button"
            className="cms-page-primary"
            onClick={onSave}
            disabled={saveDisabled ?? busy}
          >
            {busy ? "Saving…" : "Save Page"}
          </button>
          <small role="status">
            {dirty ? "Unsaved changes" : lastSaved ? "All changes saved" : "Not saved yet"}
          </small>
        </div>
      </div>
      <div className="cms-page-tabs" role="tablist" aria-label="Page editor">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`cms-page-tab-${id}`}
            aria-controls={`cms-page-panel-${id}`}
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const idx = tabs.findIndex((x) => x.id === id);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (idx + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
              setTab(tabs[next].id);
              document.getElementById(`cms-page-tab-${tabs[next].id}`)?.focus();
            }}
          >
            <Icon size={16} className={`tab-icon-${id}`} />
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`cms-page-panel-${tab}`} aria-labelledby={`cms-page-tab-${tab}`}>
        {tab === "builder" && builder}
        {tab === "settings" && (
          <div className="cms-page-settings-grid">
            <div>{settings}</div>
            <aside>{references}</aside>
          </div>
        )}
        {tab === "seo" && <div className="cms-page-seo">{seo}</div>}
        {tab === "quality" && (
          <div className="cms-page-quality-grid">
            <section className="cms-page-card">
              <h2>Publication Checklist</h2>
              <div className="cms-page-card-body">
                {!qualityIssues.length ? (
                  <div className="cms-page-quality-success">
                    <Check size={18} />
                    <strong>This page looks ready for publishing</strong>
                    <p>
                      We did not detect any obvious content, SEO, or structural issues in the
                      current draft.
                    </p>
                  </div>
                ) : (
                  qualityIssues.map((issue) => (
                    <article key={issue.id} className={`cms-page-issue severity-${issue.severity}`}>
                      <div>
                        <strong>{issue.title}</strong>
                        <span className="cms-page-badge">{issue.severity}</span>
                      </div>
                      <p>{issue.description}</p>
                      <button type="button" onClick={() => setTab(issue.tab)}>
                        Open{" "}
                        {issue.tab === "builder"
                          ? "Builder"
                          : issue.tab === "seo"
                            ? "SEO"
                            : "Settings"}
                      </button>
                    </article>
                  ))
                )}
              </div>
            </section>
            <aside className="cms-page-card">
              <h2>Preview &amp; Readiness</h2>
              <div className="cms-page-card-body">
                <div className="cms-page-quality-totals">
                  {Object.entries(totals).map(([key, count]) => (
                    <div key={key}>
                      <strong>{count}</strong>
                      <small>
                        {key === "error" ? "Errors" : key === "warning" ? "Warnings" : "Notes"}
                      </small>
                    </div>
                  ))}
                </div>
                {previewActions}
                <p>
                  Preview links open the real frontend renderer with the current saved draft, so
                  editors can review layout and content before publishing.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
      {templates}
      <div className="cms-page-mobile-actions">
        <button type="button" disabled={busy} onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="cms-page-primary"
          disabled={saveDisabled ?? busy}
          onClick={onSave}
        >
          Save Page
        </button>
      </div>
    </div>
  );
}

export interface PageListRow {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  status: string;
  updatedAt?: string | Date | null;
  scheduledAt?: string | Date | null;
}
export function PageListPresentation({
  pages,
  loading,
  error,
  filters,
  onNew,
  onEdit,
  onAction,
  locks = {},
  busy = false,
}: {
  pages: PageListRow[];
  loading: boolean;
  error?: string;
  filters: ReactNode;
  onNew: () => void;
  onEdit: (id: string) => void;
  onAction?: (id: string, action: "duplicate" | "publish" | "unpublish" | "delete") => void;
  locks?: Record<string, { name: string; owned: boolean }>;
  busy?: boolean;
}) {
  return (
    <div className="cms-page-presentation">
      <div className="cms-page-editor-header">
        <div>
          <h1>Pages</h1>
          <p>Manage your public-facing website pages</p>
        </div>
        <button type="button" className="cms-page-primary" onClick={onNew} disabled={busy}>
          <Plus size={16} />
          New Page
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {filters}
      <section className="cms-page-card cms-page-table-wrap">
        {loading ? (
          <p role="status">Loading CMS pages…</p>
        ) : !pages.length ? (
          <div className="cms-page-empty">
            <Globe size={40} />
            <h2>No pages yet</h2>
            <p>Create your first CMS page to get started</p>
            <button type="button" onClick={onNew} disabled={busy}>
              <Plus size={16} />
              Create Page
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Slug</th>
                <th>Type</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const lock = locks[page.id];
                const blocked = busy || Boolean(lock && !lock.owned);
                return (
                  <tr key={page.id}>
                    <td>
                      <button
                        className="cms-page-title-link"
                        type="button"
                        disabled={blocked}
                        onClick={() => onEdit(page.id)}
                      >
                        {page.title}
                      </button>
                      {lock && (
                        <small>
                          {lock.owned ? "You’re editing" : `Being edited by ${lock.name}`}
                        </small>
                      )}
                    </td>
                    <td>
                      <code>{page.slug}</code>
                    </td>
                    <td>
                      <span className={`cms-page-badge type-${page.pageType}`}>
                        {page.pageType}
                      </span>
                    </td>
                    <td>
                      <span className={`cms-page-badge status-${page.status}`}>
                        {page.status === "scheduled" && <CalendarClock size={13} />} {page.status}
                      </span>
                      {page.scheduledAt && (
                        <small>{new Date(page.scheduledAt).toLocaleString()}</small>
                      )}
                    </td>
                    <td>{page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : "—"}</td>
                    <td>
                      <div className="cms-page-row-actions">
                        <button
                          type="button"
                          disabled={blocked}
                          aria-label={`Edit ${page.title}`}
                          onClick={() => onEdit(page.id)}
                        >
                          <Pencil size={16} />
                        </button>
                        {onAction && (
                          <>
                            <button
                              type="button"
                              disabled={blocked}
                              aria-label={`Duplicate ${page.title}`}
                              onClick={() => onAction(page.id, "duplicate")}
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              type="button"
                              disabled={blocked}
                              aria-label={
                                page.status === "published" || page.status === "scheduled"
                                  ? `Move ${page.title} to draft`
                                  : `Publish ${page.title}`
                              }
                              onClick={() =>
                                onAction(
                                  page.id,
                                  page.status === "published" || page.status === "scheduled"
                                    ? "unpublish"
                                    : "publish",
                                )
                              }
                            >
                              {page.status === "published" || page.status === "scheduled" ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={blocked}
                              aria-label={`Delete ${page.title}`}
                              onClick={() => onAction(page.id, "delete")}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
