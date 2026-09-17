import { useEffect, useState } from "react";
import { listManagedNotificationForms } from "@workspace/api-client-react/dashboard";

type FormReference = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isSystem: boolean;
};
export function FormNotificationChoices({
  value,
  onChange,
  canSubscribe,
  disabled,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  canSubscribe: boolean;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [forms, setForms] = useState<FormReference[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setError("");
    setForms(null);
    listManagedNotificationForms({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setForms(result.items);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error.message || "Website form catalog unavailable");
      });
    return () => controller.abort();
  }, [open, attempt]);
  const missing = value.filter((id) => !forms?.some((form) => form.id === id));
  function toggle(id: string, checked: boolean) {
    onChange(
      checked
        ? [...new Set([...value, id])]
        : value.filter((item) => item !== id),
    );
  }
  return (
    <section>
      <h3>Form email notifications</h3>
      <p>
        {value.length} selected. Delivery requires an active account and Forms
        access. Subscriptions do not grant tool access.
      </p>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Close notification forms" : "Choose notification forms"}
      </button>
      {open && (
        <fieldset disabled={disabled}>
          <legend>Website forms</legend>
          {!canSubscribe && (
            <p>
              Select Forms under Tool access before adding subscriptions.
              Existing selections can be removed or preserved.
            </p>
          )}
          {error ? (
            <>
              <p role="alert">{error}. Existing selections are preserved.</p>
              <button
                type="button"
                onClick={() => setAttempt((current) => current + 1)}
              >
                Retry form catalog
              </button>
            </>
          ) : (
            forms === null && <p role="status">Loading forms…</p>
          )}
          {forms?.length === 0 && <p>No website forms are available.</p>}
          {forms?.map((form) => (
            <label className="check-label" key={form.id}>
              <input
                type="checkbox"
                checked={value.includes(form.id)}
                disabled={
                  !value.includes(form.id) && (!form.isActive || !canSubscribe)
                }
                onChange={(event) => toggle(form.id, event.target.checked)}
              />
              <span>
                {form.name} · {form.slug}
                {form.isSystem ? " · System" : ""}
                {!form.isActive ? " · Inactive" : ""}
              </span>
            </label>
          ))}
          {missing.map((id) => (
            <label className="check-label" key={id}>
              <input
                type="checkbox"
                checked
                onChange={() => toggle(id, false)}
              />
              <span>
                Saved form {id}
                {forms ? " · No longer in catalog" : " · Catalog not loaded"}
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </section>
  );
}
