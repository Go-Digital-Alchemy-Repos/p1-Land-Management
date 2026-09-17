import { useEffect, useRef, useState } from "react";
import { updateManagedOwnerNotifications } from "@workspace/api-client-react/dashboard";
import { FormNotificationChoices } from "./FormNotificationChoices";

type Preferences = {
  id: string;
  name: string;
  version: number;
  formNotificationIds: string[];
};
export function OwnerNotificationEditor({
  account,
  onClose,
  onSaved,
  reload,
}: {
  account: Preferences;
  onClose: () => void;
  onSaved: () => void;
  reload: () => Promise<Preferences>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const gate = useRef(false);
  const [saved, setSaved] = useState(account);
  const [ids, setIds] = useState(account.formNotificationIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty =
    JSON.stringify(ids) !== JSON.stringify(saved.formNotificationIds);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function close() {
    if (
      !busy &&
      (!dirty || confirm("Discard unsaved notification preferences?"))
    )
      onClose();
  }
  async function action(work: () => Promise<void>) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      className="user-editor"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action(async () => {
            await updateManagedOwnerNotifications(account.id, {
              version: saved.version,
              formNotificationIds: ids,
            });
            onSaved();
          });
        }}
      >
        <header>
          <h2>Owner notification preferences</h2>
          <button
            type="button"
            disabled={busy}
            aria-label="Close owner notifications"
            onClick={close}
          >
            ×
          </button>
        </header>
        <p>
          {saved.name} · Owner access and account settings remain protected.
        </p>
        {error && <p role="alert">{error} Your selections are retained.</p>}
        <fieldset disabled={busy}>
          <FormNotificationChoices
            value={ids}
            onChange={setIds}
            canSubscribe
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => {
              if (
                dirty &&
                !confirm(
                  "Discard unsaved selections and reload saved preferences?",
                )
              )
                return;
              void action(async () => {
                const fresh = await reload();
                setSaved(fresh);
                setIds(fresh.formNotificationIds);
              });
            }}
          >
            Reload saved preferences
          </button>
          <button type="submit" disabled={!dirty}>
            Save owner notifications
          </button>
        </fieldset>
      </form>
    </dialog>
  );
}
