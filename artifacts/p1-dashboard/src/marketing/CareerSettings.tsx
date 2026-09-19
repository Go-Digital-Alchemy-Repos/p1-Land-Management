import { CareerSettingsCards } from "../../../../platform/p1-core/client/src/components/shared/career-admin-presentation";
import { careerUI } from "./career-primitives";
import "./career-admin.css";
import { useEffect, useRef, useState } from "react";
import "./career-settings.css";
import {
  getMarketingCareerSettings,
  updateMarketingCareerSettings,
} from "@workspace/api-client-react/dashboard";
import type { MarketingCareerSettings } from "../../../../lib/api-client-react/src/dashboard/models";
import { careerError } from "./CareerJobEditor";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";

const sharing = [
  ["enabled", "Show sharing controls"],
  ["copyLink", "Copy link"],
  ["nativeShare", "Device sharing"],
  ["email", "Email"],
  ["linkedin", "LinkedIn"],
  ["facebook", "Facebook"],
  ["x", "X"],
] as const;
const integrations = [
  ["googleIndexingEnabled", "Google Indexing API"],
  ["indeedFeedEnabled", "Indeed XML feed"],
  ["indeedApplyEnabled", "Indeed Apply"],
  ["indeedDispositionSyncEnabled", "Indeed disposition sync"],
  ["zipRecruiterEnabled", "ZipRecruiter sync"],
  ["linkedinApiEnabled", "LinkedIn API sync"],
  ["genericWebhookEnabled", "Application and job webhooks"],
] as const;
const credentials = [
  ["googleServiceAccountJson", "Google service account JSON"],
  ["indeedApplySecret", "Indeed Apply shared secret"],
  ["zipRecruiterApiKey", "ZipRecruiter API key"],
  ["genericWebhookSecret", "Webhook signing secret"],
] as const;

type Credential = (typeof credentials)[number][0];
const credentialIntegration = {
  googleServiceAccountJson: "googleIndexingEnabled",
  indeedApplySecret: "indeedApplyEnabled",
  zipRecruiterApiKey: "zipRecruiterEnabled",
  genericWebhookSecret: "genericWebhookEnabled",
} as const;

function redacted(value: MarketingCareerSettings): MarketingCareerSettings {
  const next = {
    ...value,
    sharing: { ...value.sharing },
    integrations: { ...value.integrations },
  };
  for (const [key] of credentials) next.integrations[key] = "";
  return next;
}

export default function CareerSettings({ close }: { close: () => void }) {
  const [saved, setSaved] = useState<MarketingCareerSettings | null>(null);
  const [draft, setDraft] = useState<MarketingCareerSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [clearCredentials, setClearCredentials] = useState<Credential[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef<AbortController | null>(null);
  const dirty = Boolean(
    draft &&
    (JSON.stringify(draft) !== JSON.stringify(saved) ||
      clearCredentials.length),
  );
  useCmsUnsavedChanges(dirty || busy);

  async function run(save = false) {
    if (pending.current || (save && !draft?.version)) return;
    if (
      !save &&
      dirty &&
      !confirm("Discard local Careers settings and reload saved values?")
    )
      return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result =
        save && draft
          ? await updateMarketingCareerSettings(
              { ...draft, clearCredentials },
              {
                signal: controller.signal,
              },
            )
          : await getMarketingCareerSettings({
              signal: controller.signal,
              cache: "no-store",
            });
      if (controller.signal.aborted) return;
      const clean = redacted(result);
      setSaved(clean);
      setDraft(clean);
      setClearCredentials([]);
      if (save)
        setMessage(
          clearCredentials.length
            ? "Careers settings saved. Selected credentials were removed and their integrations turned off."
            : "Careers settings saved. Credential fields have been cleared from this form.",
        );
    } catch (cause) {
      if (!controller.signal.aborted) setError(careerError(cause));
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  useEffect(() => {
    void run();
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, []);

  function update(
    group: "sharing" | "integrations",
    key: string,
    value: boolean | string,
  ) {
    setDraft((current) =>
      current
        ? { ...current, [group]: { ...current[group], [key]: value } }
        : current,
    );
    setMessage("");
  }
  return (
    <section className="career-admin" aria-label="Careers settings">
      <h1>Careers</h1>
      <p>Manage job sharing and the website’s recruiting integrations.</p>
      {busy && (
        <p role="status">
          {saved ? "Saving or refreshing settings…" : "Loading settings…"}
        </p>
      )}
      {error && (
        <p role="alert">
          {error} Local edits have been retained. Reload saved settings to check
          whether a previous save completed.
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <button type="button" disabled={busy} onClick={() => void run()}>
        Reload saved settings
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!dirty || confirm("Discard local Careers settings?")) close();
        }}
      >
        Back to jobs
      </button>
      {draft && !draft.version && (
        <p role="alert">
          Reload settings from an updated website service before saving.
        </p>
      )}
      {draft && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(true);
          }}
        >
          <CareerSettingsCards
            ui={careerUI}
            sharing={
              <>
                {" "}
                <fieldset disabled={busy}>
                  <legend>Job sharing</legend>
                  {sharing.map(([key, label]) => (
                    <label className="career-setting-toggle" key={key}>
                      <input
                        type="checkbox"
                        checked={draft.sharing?.[key] ?? true}
                        onChange={(event) =>
                          update("sharing", key, event.target.checked)
                        }
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </>
            }
            integrations={
              <>
                {" "}
                <fieldset disabled={busy}>
                  <legend>Integration settings</legend>
                  <p>
                    These selections retain the website’s integration
                    configuration. Saving a selection does not verify a provider
                    connection or complete a partner setup.
                  </p>
                  {integrations.map(([key, label]) => (
                    <label className="career-setting-toggle" key={key}>
                      <input
                        type="checkbox"
                        checked={draft.integrations?.[key] ?? false}
                        disabled={clearCredentials.some(
                          (credential) =>
                            credentialIntegration[credential] === key,
                        )}
                        onChange={(event) =>
                          update("integrations", key, event.target.checked)
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <label>
                    LinkedIn partner ID
                    <input
                      value={draft.integrations?.linkedinPartnerId ?? ""}
                      onChange={(event) =>
                        update(
                          "integrations",
                          "linkedinPartnerId",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    Webhook URL
                    <input
                      type="url"
                      value={draft.integrations?.genericWebhookUrl ?? ""}
                      onChange={(event) =>
                        update(
                          "integrations",
                          "genericWebhookUrl",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <p>
                    Enabled webhooks send job and application changes to this
                    address.
                  </p>
                  <p>
                    Indeed feed path on the public website:{" "}
                    <code>/api/careers/feed/indeed.xml</code>
                  </p>
                </fieldset>
                <fieldset disabled={busy}>
                  <legend>Manage credentials</legend>
                  <p>
                    Stored credentials are hidden. Leave a field blank to keep
                    its saved value. Selecting removal also turns off that
                    integration when you save.
                  </p>
                  {credentials.map(([key, label]) => (
                    <div key={key}>
                      <label>
                        {label}
                        <input
                          type="password"
                          autoComplete="new-password"
                          spellCheck={false}
                          disabled={clearCredentials.includes(key)}
                          value={draft.integrations?.[key] ?? ""}
                          onChange={(event) =>
                            update("integrations", key, event.target.value)
                          }
                        />
                      </label>
                      <label className="career-setting-toggle">
                        <input
                          type="checkbox"
                          checked={clearCredentials.includes(key)}
                          onChange={(event) => {
                            const remove = event.target.checked;
                            setClearCredentials((current) =>
                              remove
                                ? [...current, key]
                                : current.filter((item) => item !== key),
                            );
                            if (remove) {
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      integrations: {
                                        ...current.integrations,
                                        [key]: "",
                                        [credentialIntegration[key]]: false,
                                      },
                                    }
                                  : current,
                              );
                            }
                            setMessage("");
                          }}
                        />
                        Remove saved {label}
                      </label>
                    </div>
                  ))}
                </fieldset>
              </>
            }
          />{" "}
          <button disabled={busy || !dirty || !draft.version}>
            Save Careers settings
          </button>
        </form>
      )}
    </section>
  );
}
