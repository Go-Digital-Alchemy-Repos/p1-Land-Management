import { useEffect, useState } from "react";
import { listMarketingEventRegistrationForms } from "@workspace/api-client-react/dashboard";
import type {
  MarketingEventInput,
  MarketingEventFormReference,
} from "../../../../lib/api-client-react/src/dashboard/models";

function localDate(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
}
export function EventRegistrationSettings({
  value,
  patch,
  disabled,
}: {
  value: MarketingEventInput;
  patch: (change: Partial<MarketingEventInput>) => void;
  disabled: boolean;
}) {
  const [forms, setForms] = useState<MarketingEventFormReference[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void listMarketingEventRegistrationForms({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setForms(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Registration forms could not be loaded. Your saved selection is unchanged.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  const unavailable =
    value.registrationFormId &&
    !forms.some((form) => form.id === value.registrationFormId);
  return (
    <fieldset disabled={disabled}>
      <legend>Registration</legend>
      <label className="event-check">
        <input
          type="checkbox"
          checked={!!value.registrationEnabled}
          onChange={(e) => patch({ registrationEnabled: e.target.checked })}
        />
        Enable registration
      </label>
      <label>
        Approval
        <select
          aria-label="Approval"
          value={value.registrationApprovalMode || ""}
          onChange={(e) =>
            patch({
              registrationApprovalMode: (e.target.value ||
                null) as MarketingEventInput["registrationApprovalMode"],
            })
          }
        >
          <option value="">Default</option>
          <option value="automatic">Automatic confirmation</option>
          <option value="manual">Manual approval</option>
        </select>
      </label>
      <p>
        Manual approval leaves new registrations pending review. Changing these
        settings does not change existing registrations.
      </p>
      <label>
        Capacity
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Unlimited"
          value={value.capacity ?? ""}
          onChange={(e) =>
            patch({
              capacity: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </label>
      <label className="event-check">
        <input
          type="checkbox"
          checked={!!value.waitlistEnabled}
          onChange={(e) => patch({ waitlistEnabled: e.target.checked })}
        />
        Enable waitlist
      </label>
      <p>
        Registration dates use your device time zone:{" "}
        {Intl.DateTimeFormat().resolvedOptions().timeZone}.
      </p>
      {(
        [
          ["registrationOpensAt", "Registration opens"],
          ["registrationClosesAt", "Registration closes"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            type="datetime-local"
            step="1"
            value={localDate(value[key])}
            onChange={(e) =>
              patch({
                [key]: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
          />
        </label>
      ))}
      <label>
        Registration form
        <select
          aria-label="Registration form"
          disabled={loading || Boolean(error)}
          value={value.registrationFormId || ""}
          onChange={(e) =>
            patch({ registrationFormId: e.target.value || null })
          }
        >
          <option value="">No additional form</option>
          {unavailable && (
            <option value={value.registrationFormId!}>
              Saved form (unavailable)
            </option>
          )}
          {forms.map((form) => (
            <option value={form.id} key={form.id}>
              {form.name} · {form.slug}
            </option>
          ))}
        </select>
      </label>
      {loading && <p role="status">Loading registration forms…</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Retry registration forms
          </button>
        </p>
      )}
      {!loading && !error && unavailable && (
        <p>
          The saved form is no longer available for new selections. Choose
          another active form or remove it before accepting new registrations.
        </p>
      )}
    </fieldset>
  );
}
