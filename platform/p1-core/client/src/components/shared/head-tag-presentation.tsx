import React, { useId, type ReactNode } from "react";
import { Code2, Loader2, Save, RefreshCw } from "lucide-react";
import "./head-tag-presentation.css";

/** Presentation only: each host retains its own authorization and save/recovery lifecycle. */
export function HeadTagPresentation({
  html,
  onChange,
  onSave,
  busy,
  editorDisabled,
  saveDisabled,
  onReload,
  error,
  message,
  publicationNotice,
  limitNotice,
  saveLabel = "Save Head Tags",
  headingLevel = 2,
  managedScripts,
}: {
  html: string;
  onChange: (html: string) => void;
  onSave: () => void;
  busy: boolean;
  editorDisabled: boolean;
  saveDisabled: boolean;
  onReload?: () => void;
  error?: string;
  message?: string;
  publicationNotice?: ReactNode;
  limitNotice?: ReactNode;
  saveLabel?: string;
  headingLevel?: 1 | 2;
  managedScripts?: ReactNode;
}) {
  const id = useId();
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section
      className="head-tag-presentation"
      aria-label="Website head tag settings"
      aria-busy={busy}
    >
      <header>
        <Heading data-testid="text-head-tag-additions-heading">Head Tag Additions</Heading>
        <p>
          Add custom verification tags, meta tags or vendor markup for the public website’s{" "}
          {"<head>"}.
        </p>
      </header>
      {managedScripts}
      <div className="head-tag-card">
        <header className="head-tag-card-header">
          <h3>
            <Code2 className="head-tag-icon" size={18} aria-hidden="true" />
            Public Head Markup
          </h3>
          <p>
            Use this for tags that apply across the public website. Website security policy still
            controls which scripts can run.
          </p>
        </header>
        <div className="head-tag-card-content">
          <aside className="head-tag-analytics">
            <h4>A quick note on Google Analytics</h4>
            <p>
              Google Analytics and form verification use managed website loaders. Do not paste
              duplicate Google Analytics or Turnstile scripts here. Reporting property settings are
              separate from the website’s tracking measurement ID.
            </p>
            <p>
              This website does not currently gate Google Analytics through a cookie-consent
              preference. Raw markup does not add consent handling, and website security policy
              continues to restrict executable scripts.
            </p>
          </aside>
          {publicationNotice && (
            <div className="head-tag-publication" role="status">
              {publicationNotice}
            </div>
          )}
          {error && (
            <p className="head-tag-error" role="alert">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <label htmlFor={id}>Public website head markup</label>
            <textarea
              id={id}
              rows={14}
              value={html}
              disabled={editorDisabled}
              onChange={(event) => onChange(event.target.value)}
              spellCheck={false}
              placeholder={
                '<!-- Example -->\n<meta name="google-site-verification" content="..." />\n<meta name="facebook-domain-verification" content="..." />'
              }
              data-testid="textarea-public-head-html"
            />
            {limitNotice && <p role="alert">{limitNotice}</p>}
            <div className="head-tag-actions">
              <button
                type="submit"
                className="head-tag-save"
                disabled={saveDisabled}
                data-testid="button-save-head-tag-additions"
              >
                {busy ? (
                  <Loader2 className="head-tag-spinner" size={16} aria-hidden="true" />
                ) : (
                  <Save size={16} aria-hidden="true" />
                )}
                {busy ? "Working…" : saveLabel}
              </button>
              {onReload && (
                <button type="button" disabled={busy} onClick={onReload}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Reload saved tags
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
