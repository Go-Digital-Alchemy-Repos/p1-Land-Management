import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { Cloud, Mail, Plug, RefreshCw } from "lucide-react";
import {
  getWebsiteIntegrations,
  saveWebsiteIntegration,
  testWebsiteIntegration,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./website-integrations.css";

type Snapshot = Awaited<ReturnType<typeof getWebsiteIntegrations>>;
type ProviderView = Snapshot["providers"][number];
type Provider = "mailgun" | "mailchimp" | "cloudflare_r2";
type SecretChange = { operation: "keep" | "replace" | "clear"; value?: string };
type Draft = {
  version: string;
  fields: Record<string, string>;
  secrets: Record<string, SecretChange>;
  baseline: string;
};
const providers: Provider[] = ["mailgun", "mailchimp", "cloudflare_r2"];
const names: Record<Provider, string> = {
  mailgun: "Mailgun",
  mailchimp: "Mailchimp",
  cloudflare_r2: "Cloudflare R2",
};
const labels: Record<string, string> = {
  mailgun_domain: "Sending domain",
  mailgun_from_address: "From address",
  mailgun_api_key: "Mailgun API key",
  mailchimp_audience_id: "Audience ID",
  mailchimp_server_prefix: "Server prefix",
  mailchimp_api_key: "Mailchimp API key",
  r2_account_id: "Account ID",
  r2_bucket_name: "Bucket name",
  r2_public_url: "Public media URL",
  r2_access_key_id: "Access key ID",
  r2_secret_access_key: "Secret access key",
};
function makeDraft(view: ProviderView): Draft {
  const fields = { ...view.fields };
  const secrets = Object.fromEntries(
    Object.keys(view.secrets).map((key) => [
      key,
      { operation: "keep" as const },
    ]),
  );
  return {
    version: view.version,
    fields,
    secrets,
    baseline: JSON.stringify({ fields, secrets }),
  };
}
function changed(draft?: Draft) {
  return Boolean(
    draft &&
    JSON.stringify({ fields: draft.fields, secrets: draft.secrets }) !==
      draft.baseline,
  );
}
export default function WebsiteIntegrations() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<Provider, Draft>>>({});
  const [blocked, setBlocked] = useState<Partial<Record<Provider, boolean>>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checks, setChecks] = useState<Partial<Record<Provider, string>>>({});
  const live = useRef(true),
    gate = useRef(false),
    request = useRef<AbortController | null>(null);
  const dirty = providers.some((provider) => changed(drafts[provider]));
  useCmsUnsavedChanges(
    dirty || Object.values(blocked).some(Boolean),
    "Leave website integrations? Unsaved configuration and replacement credentials will be discarded.",
  );
  function options() {
    request.current = new AbortController();
    return {
      signal: AbortSignal.any([
        request.current.signal,
        AbortSignal.timeout(30000),
      ]),
    };
  }
  async function run(work: () => Promise<void>, provider?: Provider) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch {
      if (live.current) {
        if (provider) setBlocked((value) => ({ ...value, [provider]: true }));
        setError(
          provider
            ? `${names[provider]} save was not confirmed or its saved configuration changed. Your inputs are retained. Reload saved configuration and compare before another save; do not repeat an uncertain write.`
            : "Could not load the requested result. Your inputs are retained. Check the connection and try again.",
        );
      }
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  async function reload() {
    if (
      gate.current ||
      ((dirty || Object.values(blocked).some(Boolean)) &&
        !window.confirm(
          "Reload all saved configuration? This discards unsaved fields and replacement credentials only after the saved configuration loads successfully.",
        ))
    )
      return;
    await run(async () => {
      const result = await getWebsiteIntegrations(options());
      if (!live.current) return;
      setSnapshot(result);
      setDrafts(
        Object.fromEntries(
          result.providers.map((view) => [view.provider, makeDraft(view)]),
        ),
      );
      setBlocked({});
      setChecks({});
    });
  }
  useEffect(() => {
    live.current = true;
    void reload();
    return () => {
      live.current = false;
      request.current?.abort();
    };
  }, []);
  function field(provider: Provider, key: string, value: string) {
    setDrafts((current) => {
      const draft = current[provider];
      return draft
        ? {
            ...current,
            [provider]: { ...draft, fields: { ...draft.fields, [key]: value } },
          }
        : current;
    });
  }
  function secret(provider: Provider, key: string, change: SecretChange) {
    setDrafts((current) => {
      const draft = current[provider];
      return draft
        ? {
            ...current,
            [provider]: {
              ...draft,
              secrets: { ...draft.secrets, [key]: change },
            },
          }
        : current;
    });
  }
  async function save(
    event: FormEvent,
    provider: Provider,
    view: ProviderView,
  ) {
    event.preventDefault();
    const draft = drafts[provider];
    if (
      !draft ||
      !changed(draft) ||
      blocked[provider] ||
      view.configurationIssue ||
      gate.current
    )
      return;
    if (
      Object.values(draft.secrets).some(
        (value) => value.operation === "clear",
      ) &&
      !window.confirm(
        `Clear the selected saved ${names[provider]} credentials? This can interrupt features that use these settings.`,
      )
    )
      return;
    await run(async () => {
      const result = await saveWebsiteIntegration(
        provider,
        {
          expectedVersion: draft.version,
          fields: { ...draft.fields, ...draft.secrets },
        },
        options(),
      );
      if (!live.current) return;
      setSnapshot((current) =>
        current
          ? {
              ...current,
              providers: current.providers.map((item) =>
                item.provider === provider ? result.integration : item,
              ),
            }
          : current,
      );
      setDrafts((current) => ({
        ...current,
        [provider]: makeDraft(result.integration),
      }));
      setChecks((current) => ({ ...current, [provider]: "" }));
      setNotice(
        `${names[provider]} settings saved. Replacement credentials have been cleared from this form. No connection check ran.`,
      );
    }, provider);
  }
  async function check(provider: Provider, view: ProviderView) {
    if (gate.current || blocked[provider] || view.configurationIssue) return;
    setChecks((current) => ({ ...current, [provider]: "" }));
    await run(async () => {
      try {
        const result = await testWebsiteIntegration(provider, options());
        if (live.current)
          setChecks((current) => ({
            ...current,
            [provider]: result.success
              ? "Saved effective connection verified by a read-only provider request."
              : "Saved effective connection could not be verified. Review the saved settings and deployment configuration.",
          }));
      } catch {
        if (live.current)
          setChecks((current) => ({
            ...current,
            [provider]:
              "Connection check unavailable. Your inputs are retained. You can retry this read-only check without saving or discarding your draft.",
          }));
      }
    });
  }
  return (
    <article className="website-integrations">
      <header className="page-hero">
        <div>
          <p className="eyebrow">WEBSITE SYSTEM</p>
          <h1>
            <Plug size={28} /> Website integrations
          </h1>
          <p>
            Manage website provider settings and inspect the configuration used
            by the website services.
          </p>
        </div>
      </header>
      <div className="integration-toolbar">
        <button disabled={busy} onClick={() => void reload()}>
          <RefreshCw size={16} /> Reload saved configuration
        </button>
      </div>
      {error && (
        <p role="alert" className="integration-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {busy && <p role="status">Working…</p>}
      {!snapshot && !busy && (
        <p>Saved integration configuration is unavailable.</p>
      )}
      <div className="integration-grid">
        {snapshot?.providers.map((view) => {
          const provider = view.provider as Provider;
          const draft = drafts[provider];
          if (!draft || !providers.includes(provider)) return null;
          return (
            <section
              key={provider}
              className="integration-card"
              aria-label={`${names[provider]} settings`}
            >
              <h2>
                {provider === "cloudflare_r2" ? (
                  <Cloud size={21} />
                ) : (
                  <Mail size={21} />
                )}
                {names[provider]}
              </h2>
              <p className="integration-source">
                Effective configuration:{" "}
                <strong>
                  {view.effectiveSource === "deployment"
                    ? "Deployment override"
                    : "Saved website settings"}
                </strong>
              </p>
              {view.effectiveSource === "deployment" && (
                <p>
                  These fields edit the stored fallback. Deployment
                  configuration currently overrides it; saving here does not
                  change that override. The connection check uses the effective
                  deployment configuration.
                </p>
              )}
              {view.configurationIssue && (
                <p role="alert" className="integration-error">
                  {view.configurationIssue} Saving and connection checks are
                  unavailable until this configuration issue is resolved.
                </p>
              )}
              <form onSubmit={(event) => void save(event, provider, view)}>
                <fieldset disabled={busy || Boolean(view.configurationIssue)}>
                  {Object.entries(draft.fields).map(([key, value]) => (
                    <label key={key}>
                      {labels[key] ?? key}
                      <input
                        autoComplete="off"
                        value={value}
                        onChange={(event) =>
                          field(provider, key, event.target.value)
                        }
                        maxLength={key === "r2_public_url" ? 2048 : 320}
                        spellCheck={false}
                      />
                    </label>
                  ))}
                  {Object.entries(draft.secrets).map(([key, value]) => (
                    <div className="integration-secret" key={key}>
                      <label>
                        {labels[key] ?? key}
                        <select
                          value={value.operation}
                          onChange={(event) =>
                            secret(provider, key, {
                              operation: event.target
                                .value as SecretChange["operation"],
                            })
                          }
                        >
                          <option value="keep">Keep saved credential</option>
                          <option value="replace">Replace credential</option>
                          <option value="clear">Clear saved credential</option>
                        </select>
                      </label>
                      <p className="integration-caption">
                        {view.secrets[key as keyof typeof view.secrets]
                          ?.configured
                          ? "A saved credential is present. Its value is never displayed."
                          : "No saved credential is configured."}
                      </p>
                      {value.operation === "replace" && (
                        <label>
                          New {labels[key] ?? key}
                          <input
                            type="password"
                            autoComplete="new-password"
                            required
                            maxLength={8192}
                            value={value.value ?? ""}
                            onChange={(event) =>
                              secret(provider, key, {
                                operation: "replace",
                                value: event.target.value,
                              })
                            }
                            spellCheck={false}
                          />
                        </label>
                      )}
                      {value.operation === "clear" && (
                        <p>
                          The saved credential will be removed when you save.
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="integration-toolbar">
                    <button
                      type="submit"
                      disabled={blocked[provider] || !changed(draft)}
                    >
                      Save {names[provider]} settings
                    </button>
                    <button
                      type="button"
                      disabled={blocked[provider]}
                      onClick={() => void check(provider, view)}
                    >
                      Check saved {names[provider]} connection
                    </button>
                  </div>
                </fieldset>
              </form>
              <p className="integration-caption">
                {view.testEffects} The check never uses unsaved fields.
              </p>
              {blocked[provider] && (
                <p role="alert">
                  Reload saved configuration before another save or connection
                  check.
                </p>
              )}
              {checks[provider] && <p role="status">{checks[provider]}</p>}
              {provider === "mailgun" && (
                <p>
                  SMTP fallback:{" "}
                  {snapshot.smtpFallbackConfigured
                    ? "deployment credentials are present"
                    : "not configured"}
                  . Credential presence does not establish SMTP connectivity.
                  This check verifies Mailgun only.
                </p>
              )}
              {provider === "cloudflare_r2" && (
                <p>
                  Backup destination source:{" "}
                  <strong>{snapshot.backups.effectiveSource}</strong>.{" "}
                  {snapshot.backups.effectiveSource === "settings"
                    ? "Backups use these stored storage settings; changing them can change where backups are written and which history is visible."
                    : "A deployment storage configuration determines backups; these fields do not change that override."}{" "}
                  Changing storage settings does not copy existing media or
                  backups.
                </p>
              )}
            </section>
          );
        })}
      </div>
      {snapshot && (
        <section
          className="integration-card integration-google"
          aria-label="Google reporting configuration"
        >
          <h2>Google reporting</h2>
          <p>
            Effective source: deployment. Configuration management remains to be
            completed in this area.
          </p>
          <dl>
            <div>
              <dt>Credential mode</dt>
              <dd>{snapshot.google.credentialMode}</dd>
            </div>
            <div>
              <dt>Analytics property</dt>
              <dd>{snapshot.google.propertyId ?? "Not configured"}</dd>
            </div>
            <div>
              <dt>Search Console site</dt>
              <dd>{snapshot.google.searchConsoleSite ?? "Not configured"}</dd>
            </div>
            <div>
              <dt>Public tracking source</dt>
              <dd>{snapshot.google.publicTrackingSource}</dd>
            </div>
          </dl>
          <p>{snapshot.google.note}</p>
          <p>
            Configuration presence is not verified provider access. Review the
            reports for actual data and connection results.
          </p>
          <div className="integration-toolbar">
            <a href="/marketing/reporting/analytics">
              Open Google Analytics reports
            </a>
            <a href="/marketing/reporting/search-console">
              Open Search Console reports
            </a>
          </div>
        </section>
      )}
    </article>
  );
}
