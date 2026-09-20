import { IntegrationLibrary } from "../../../../platform/p1-core/client/src/components/shared/integration-library-presentation";
import { IntegrationConfigurationFrame } from "../../../../platform/p1-core/client/src/components/shared/integration-configuration-presentation";
import { SUPPORTED_INTEGRATIONS } from "../../../../platform/p1-core/client/src/components/shared/integration-provider-catalog";
import { sidebarPrimitives } from "./sidebar-primitives";
import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { Cloud, Mail, Plug, RefreshCw } from "lucide-react";
import {
  getWebsiteIntegrations,
  saveWebsiteIntegration,
  saveGoogleReportingConfiguration,
  testWebsiteIntegration,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./website-integrations.css";

// Preserve the original trigger sizing while adapting Radix options to a native select.
function IntegrationLibrarySelect({
  children,
  value,
  onValueChange,
  disabled,
  "aria-label": label,
}: {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  let trigger: {
    className?: string;
    "data-testid"?: string;
    "aria-label"?: string;
  } = {};
  const options: React.ReactNode[] = [];
  function visit(nodes: React.ReactNode) {
    React.Children.forEach(nodes, (child) => {
      if (
        !React.isValidElement<{
          children?: React.ReactNode;
          className?: string;
          "data-testid"?: string;
          "aria-label"?: string;
        }>(child)
      )
        return;
      if (child.type === sidebarPrimitives.SelectTrigger) trigger = child.props;
      if (child.type === sidebarPrimitives.SelectItem) options.push(child);
      else visit(child.props.children);
    });
  }
  visit(children);
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={label || trigger["aria-label"]}
      data-testid={trigger["data-testid"]}
      className={`integration-library-select flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm ${trigger.className || ""}`}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options}
    </select>
  );
}
const integrationUi = {
  ...sidebarPrimitives,
  Select: IntegrationLibrarySelect,
};

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
const groups = [
  {
    key: "communications",
    title: "Communications & CRM",
    description: "Transactional email and customer operations.",
  },
  {
    key: "marketing",
    title: "Marketing & Analytics",
    description: "Audience lifecycle tools.",
  },
  {
    key: "infrastructure",
    title: "Storage & Infrastructure",
    description: "Media, uploads and backups.",
  },
];
const sheetUi = {
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <header className="integration-sheet-header">{children}</header>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 id="integration-sheet-title">{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  SheetBody: ({ children }: { children: React.ReactNode }) => (
    <div className="integration-sheet-body">{children}</div>
  ),
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
type GoogleFields = {
  targetSource: "deployment" | "managed";
  propertyId: string;
  searchConsoleSite: string;
};
function googleFields(view: Snapshot["google"]): GoogleFields {
  return { targetSource: view.targetSource, ...view.managedTargets };
}
export default function WebsiteIntegrations() {
  const [selected, setSelected] = useState<Provider | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!selected) return;
    const opener = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [selected]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<Provider, Draft>>>({});
  const [blocked, setBlocked] = useState<Partial<Record<Provider, boolean>>>(
    {},
  );
  const [googleDraft, setGoogleDraft] = useState<GoogleFields | null>(null);
  const [googleBlocked, setGoogleBlocked] = useState(false);
  const googleDirty = Boolean(
    googleDraft &&
    snapshot &&
    JSON.stringify(googleDraft) !==
      JSON.stringify(googleFields(snapshot.google)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checks, setChecks] = useState<Partial<Record<Provider, string>>>({});
  const live = useRef(true),
    gate = useRef(false),
    request = useRef<AbortController | null>(null);
  const dirty =
    googleDirty || providers.some((provider) => changed(drafts[provider]));
  useCmsUnsavedChanges(
    busy || dirty || googleBlocked || Object.values(blocked).some(Boolean),
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
  async function run(
    work: () => Promise<void>,
    provider?: Provider | "google",
  ) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch {
      if (live.current) {
        if (provider === "google") setGoogleBlocked(true);
        else if (provider)
          setBlocked((value) => ({ ...value, [provider]: true }));
        setError(
          provider
            ? `${provider === "google" ? "Google reporting" : names[provider]} save was not confirmed or its saved configuration changed. Your inputs are retained. Reload saved configuration and compare before another save; do not repeat an uncertain write.`
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
      ((dirty || googleBlocked || Object.values(blocked).some(Boolean)) &&
        !window.confirm(
          "Reload all saved configuration? This discards unsaved fields and replacement credentials only after the saved configuration loads successfully.",
        ))
    )
      return;
    await run(async () => {
      const result = await getWebsiteIntegrations(options());
      if (!live.current) return;
      setSnapshot(result);
      setGoogleDraft(googleFields(result.google));
      setGoogleBlocked(false);
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
    if (gate.current) return;
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
    if (gate.current) return;
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
  async function saveGoogle(event: FormEvent) {
    event.preventDefault();
    if (
      gate.current ||
      googleBlocked ||
      !googleDirty ||
      !googleDraft ||
      !snapshot
    )
      return;
    const fields = { ...googleDraft };
    if (
      (fields.propertyId && !/^\d{1,32}$/.test(fields.propertyId)) ||
      (fields.targetSource === "managed" &&
        (!fields.propertyId || !fields.searchConsoleSite))
    ) {
      setError(
        "Enter a numeric Analytics property ID and choose a Search Console site for managed reporting.",
      );
      return;
    }
    const searchConsoleSite = fields.searchConsoleSite;
    if (
      searchConsoleSite !== "" &&
      searchConsoleSite !== "sc-domain:p1landmanagement.com" &&
      searchConsoleSite !== "https://www.p1landmanagement.com/" &&
      searchConsoleSite !== "https://p1landmanagement.com/"
    ) {
      setError("Choose one of the supported P1 Search Console sites.");
      return;
    }
    const expectedVersion = snapshot.google.version;
    await run(async () => {
      const result = await saveGoogleReportingConfiguration(
        { expectedVersion, fields: { ...fields, searchConsoleSite } },
        options(),
      );
      if (!live.current) return;
      setSnapshot((current) =>
        current ? { ...current, google: result.google } : current,
      );
      setGoogleDraft(googleFields(result.google));
      setNotice(
        "Google reporting targets saved. Credentials and public website tracking were not changed. Open the reports to verify access.",
      );
    }, "google");
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
  function closeConfiguration() {
    if (gate.current) return;
    if (
      selected &&
      (changed(drafts[selected]) || blocked[selected]) &&
      !window.confirm(
        "Close configuration? Unsaved inputs remain in this session. Reload saved configuration to discard them.",
      )
    )
      return;
    setSelected(null);
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
      <IntegrationLibrary
        ui={integrationUi}
        integrations={SUPPORTED_INTEGRATIONS.filter((config) =>
          snapshot?.providers.some((view) => view.provider === config.category),
        )}
        groups={groups}
        description="Configure supported website providers. Saved credential presence is not verified connectivity. Other retained platform integrations are outside this website configuration scope."
        isConfigured={(config) => {
          const view = snapshot?.providers.find(
            (p) => p.provider === config.category,
          );
          return (
            !!view &&
            !view.configurationIssue &&
            (Object.values(view.fields).some(Boolean) ||
              Object.values(view.secrets).some((secret) => secret.configured))
          );
        }}
        onOpen={(config) => {
          if (!gate.current) setSelected(config.category as Provider);
        }}
      />
      <dialog
        ref={dialog}
        className="integration-sheet"
        aria-labelledby="integration-sheet-title"
        onCancel={(event) => {
          event.preventDefault();
          closeConfiguration();
        }}
      >
        <button
          className="integration-sheet-close"
          type="button"
          aria-label="Close integration configuration"
          disabled={busy}
          onClick={closeConfiguration}
        >
          Close
        </button>
        <IntegrationConfigurationFrame
          ui={sheetUi}
          description="Edit stored configuration, preserve or replace credentials, and check the saved effective connection."
        >
          <button type="button" disabled={busy} onClick={() => void reload()}>
            Reload saved configuration
          </button>
          {error && (
            <p role="alert" className="integration-error">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}

          {snapshot?.providers.map((view) => {
            const provider = view.provider as Provider;
            const draft = drafts[provider];
            if (
              !draft ||
              !providers.includes(provider) ||
              selected !== provider
            )
              return null;
            const config = SUPPORTED_INTEGRATIONS.find(
              (item) => item.category === provider,
            )!;
            const BrandIcon = config.brandIcon;
            return (
              <section
                key={provider}
                className="integration-card"
                aria-label={`${names[provider]} settings`}
              >
                <h2>
                  <BrandIcon
                    aria-label={`${names[provider]} logo`}
                    className={`integration-brand-icon ${config.brandColor}`}
                  />
                  {names[provider]}
                </h2>
                <p>{config.description}</p>
                <details className="integration-setup">
                  <summary>Setup instructions</summary>
                  <ol>
                    {config.instructions.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <a href={config.accountUrl} target="_blank" rel="noreferrer">
                    Open provider account
                  </a>
                  {config.docsUrl && (
                    <>
                      {" "}
                      ·{" "}
                      <a href={config.docsUrl} target="_blank" rel="noreferrer">
                        Provider documentation
                      </a>
                    </>
                  )}
                </details>
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
                    change that override. The connection check uses the
                    effective deployment configuration.
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
                            <option value="clear">
                              Clear saved credential
                            </option>
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
        </IntegrationConfigurationFrame>
      </dialog>
      {snapshot && (
        <section
          className="integration-card integration-google"
          aria-label="Google reporting configuration"
        >
          <h2>Google reporting</h2>
          <p>
            Saved target source: {snapshot.google.targetSource}. The effective
            targets below reflect saved configuration, not unsaved inputs.
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
          {googleDraft && (
            <form onSubmit={saveGoogle} aria-label="Google reporting targets">
              <fieldset disabled={busy || googleBlocked}>
                <legend>Reporting target settings</legend>
                <label>
                  Target source
                  <select
                    value={googleDraft.targetSource}
                    onChange={(event) => {
                      if (!gate.current && !googleBlocked)
                        setGoogleDraft({
                          ...googleDraft,
                          targetSource: event.target
                            .value as GoogleFields["targetSource"],
                        });
                    }}
                  >
                    <option value="deployment">Deployment targets</option>
                    <option value="managed">Managed targets</option>
                  </select>
                </label>
                <p>
                  Managed target values are retained when deployment targets are
                  selected. They become effective only after saving Managed
                  targets.
                </p>
                <label>
                  Managed Analytics property ID
                  <input
                    inputMode="numeric"
                    maxLength={32}
                    value={googleDraft.propertyId}
                    onChange={(event) => {
                      if (!gate.current && !googleBlocked)
                        setGoogleDraft({
                          ...googleDraft,
                          propertyId: event.target.value,
                        });
                    }}
                  />
                </label>
                <label>
                  Managed Search Console site
                  <select
                    value={googleDraft.searchConsoleSite}
                    onChange={(event) => {
                      if (!gate.current && !googleBlocked)
                        setGoogleDraft({
                          ...googleDraft,
                          searchConsoleSite: event.target.value,
                        });
                    }}
                  >
                    <option value="">Choose a site</option>
                    <option value="sc-domain:p1landmanagement.com">
                      Domain: p1landmanagement.com
                    </option>
                    <option value="https://www.p1landmanagement.com/">
                      https://www.p1landmanagement.com/
                    </option>
                    <option value="https://p1landmanagement.com/">
                      https://p1landmanagement.com/
                    </option>
                  </select>
                </label>
                <button type="submit" disabled={!googleDirty}>
                  Save reporting targets
                </button>
              </fieldset>
              {googleBlocked && (
                <p role="status">
                  Save is blocked until you reload saved configuration and
                  compare. Your draft is retained.
                </p>
              )}
            </form>
          )}
          <p>
            Reporting credentials are deployment-managed. This form has no
            credential inputs. Public website tracking is configured separately
            at build time.
          </p>
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
