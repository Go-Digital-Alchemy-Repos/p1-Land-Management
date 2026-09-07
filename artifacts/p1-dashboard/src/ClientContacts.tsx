import { useEffect, useState } from "react";
type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  kind: "site" | "billing" | "primary" | "other";
  version: number;
  archived: boolean;
};
type Input = {
  name: string;
  email: string;
  phone: string;
  kind: Contact["kind"];
};
const empty: Input = { name: "", email: "", phone: "", kind: "site" };
export function ClientContacts({
  client,
  request,
}: {
  client: { id: string; name: string };
  request: (path: string, body?: unknown) => Promise<any>;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]),
    [draft, setDraft] = useState<Input>(empty),
    [editing, setEditing] = useState<Contact | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const endpoint = "/clients/" + client.id + "/contacts";
  async function load() {
    setContacts(await request(endpoint));
  }
  useEffect(() => {
    let active = true;
    request(endpoint)
      .then((rows) => {
        if (active) setContacts(rows);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [client.id]);
  async function save(archived = false) {
    setError("");
    setBusy(true);
    try {
      await request(endpoint + (editing ? "/" + editing.id : ""), {
        ...draft,
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        ...(editing ? { version: editing.version, archived } : {}),
      });
      setDraft(empty);
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(contact: Contact) {
    setEditing(contact);
    setDraft({
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone || "",
      kind: contact.kind,
    });
    setError("");
  }
  return (
    <div>
      <p>
        Site, primary and billing contacts for {client.name}. Contacts do not
        receive portal access automatically.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <ul className="contact-list">
        {contacts.map((contact) => (
          <li key={contact.id}>
            <div>
              <strong>{contact.name}</strong>
              <small>
                {contact.kind}
                {contact.archived ? " · archived" : ""}
              </small>
              <small>
                {[contact.email, contact.phone].filter(Boolean).join(" · ") ||
                  "No contact details recorded"}
              </small>
            </div>
            <button disabled={busy} onClick={() => edit(contact)}>
              Edit{contact.archived ? " / restore" : ""}
            </button>
          </li>
        ))}
      </ul>
      {!contacts.length && <p className="empty">No contacts yet.</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(false);
        }}
      >
        <h3>{editing ? "Edit contact" : "Add contact"}</h3>
        <label>
          Name
          <input
            required
            maxLength={200}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            maxLength={254}
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
        </label>
        <label>
          Phone
          <input
            type="tel"
            maxLength={50}
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
        </label>
        <label>
          Contact role
          <select
            value={draft.kind}
            onChange={(e) =>
              setDraft({ ...draft, kind: e.target.value as Contact["kind"] })
            }
          >
            <option value="site">Site</option>
            <option value="billing">Billing</option>
            <option value="primary">Primary</option>
            <option value="other">Other</option>
          </select>
        </label>
        <div className="work-actions">
          <button
            className="primary"
            disabled={busy || !draft.name.trim()}
            type="submit"
          >
            {busy
              ? "Saving…"
              : editing?.archived
                ? "Restore contact"
                : "Save contact"}
          </button>
          {editing && (
            <>
              <button
                disabled={busy}
                type="button"
                onClick={() => {
                  setDraft(empty);
                  setEditing(null);
                  setError("");
                }}
              >
                Cancel edit
              </button>
              {!editing.archived && (
                <button
                  disabled={busy}
                  type="button"
                  onClick={() => void save(true)}
                >
                  Archive contact
                </button>
              )}
            </>
          )}
        </div>
      </form>
    </div>
  );
}
