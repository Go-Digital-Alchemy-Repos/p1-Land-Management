import { isCapability } from "@workspace/api-zod/business-access";
import {
  requestManagedPasswordRecovery,
  listManagedUsers,
  listManagedInvitations,
  updateManagedUser,
  createManagedInvitation,
  revokeManagedUserSessions,
  listManagedUserHistory,
  resendManagedInvitation,
  revokeManagedInvitation,
  updateAccountMfaPolicy,
} from "@workspace/api-client-react/dashboard";
import { useEffect, useRef, useState } from "react";
import { AccessCheckboxes } from "./AccessCheckboxes";
import "./user-manager.css";

type Account = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  firstName: string;
  lastName: string;
  capabilities: string[];
  suggestedCapabilities: string[];
  formNotificationIds: string[];
  version: number;
  reviewedAt: string | null;
  mfaRequired: boolean;
  twoFactorEnabled: boolean | null;
};
type Invite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
};
type Draft = {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  clientId: string;
  active: boolean;
  capabilities: string[];
  formNotificationIds: string[];
  version: number;
};
const blank = (): Draft => ({
  email: "",
  firstName: "",
  lastName: "",
  role: "member",
  clientId: "",
  active: true,
  capabilities: [],
  formNotificationIds: [],
  version: 1,
});
export function UserManager({
  currentUserId,
  clients,
  onSessionChanged,
}: {
  currentUserId: string;
  clients: { id: string; name: string }[];
  onSessionChanged: () => Promise<void>;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]),
    [invitations, setInvitations] = useState<Invite[]>([]);
  const [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [draft, setDraft] = useState<Draft | null>(null);
  const [history, setHistory] = useState<
    { action: string; createdAt: string }[]
  >([]);
  const dialog = useRef<HTMLDialogElement>(null),
    gate = useRef(false),
    alive = useRef(true);
  async function load() {
    const [users, invites] = await Promise.all([
      listManagedUsers(),
      listManagedInvitations(),
    ]);
    if (alive.current) {
      setAccounts(users.items);
      setInvitations(invites.items);
    }
    return users.items as Account[];
  }
  useEffect(() => {
    alive.current = true;
    void load()
      .catch((e) => {
        if (alive.current) setError(e.message);
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (draft) dialog.current?.showModal();
    else dialog.current?.close();
  }, [Boolean(draft)]);
  async function run(action: () => Promise<void>) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (error) {
      if (alive.current) setError((error as Error).message);
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function edit(account: Account) {
    setNotice("");
    setError("");
    setHistory([]);
    const pieces = account.name.trim().split(/\s+/);
    setDraft({
      ...account,
      firstName: account.firstName || pieces[0] || "",
      lastName: account.lastName || pieces.slice(1).join(" "),
      clientId: "",
    });
  }
  async function save() {
    if (!draft) return;
    const data = {
      firstName: draft.firstName,
      lastName: draft.lastName,
      capabilities: draft.capabilities.filter(isCapability),
      formNotificationIds: draft.formNotificationIds,
    };
    if (draft.id)
      await updateManagedUser(draft.id, {
        ...data,
        active: draft.active,
        version: draft.version,
      });
    else
      await createManagedInvitation({
        ...data,
        email: draft.email,
        role: draft.role as "member" | "crew" | "client",
        ...(draft.role === "client" ? { clientId: draft.clientId } : {}),
      });
    if (alive.current) {
      setDraft(null);
      setNotice(
        draft.id
          ? "Account updated. Existing sessions were revoked."
          : "Invitation queued for delivery.",
      );
    }
    await load();
  }
  const selected = accounts.find((account) => account.id === draft?.id);
  return (
    <section className="panel user-manager">
      <div className="panel-heading">
        <div>
          <h2>User Manager</h2>
          <p>
            Manage accounts, access and invitations across the Business Center.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => {
            setError("");
            setHistory([]);
            setNotice("");
            setDraft(blank());
          }}
        >
          Invite user
        </button>
      </div>
      {error && !draft && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && !draft && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <label>
        Search users
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name or email"
        />
      </label>
      {loading ? (
        <p role="status">Loading users…</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Account type</th>
                <th>Access</th>
                <th>Security</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts
                .filter((account) =>
                  `${account.name} ${account.email}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((account) => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.name}</strong>
                      <div>{account.email}</div>
                    </td>
                    <td>
                      {account.role} · {account.active ? "Active" : "Suspended"}
                    </td>
                    <td>
                      {account.role === "owner"
                        ? "Full access"
                        : account.role === "client"
                          ? "Client portal grants"
                          : `${account.capabilities.length} selected tools`}
                      {!account.reviewedAt && account.role !== "owner" && (
                        <div>Access review needed</div>
                      )}
                    </td>
                    <td>
                      {account.mfaRequired ? "MFA required" : "MFA optional"}
                      <div>
                        {account.twoFactorEnabled ? "Enrolled" : "Not enrolled"}
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        {account.role !== "owner" && (
                          <button disabled={busy} onClick={() => edit(account)}>
                            Manage
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await updateAccountMfaPolicy(account.id, {
                                required: !account.mfaRequired,
                              });
                              if (account.id === currentUserId)
                                await onSessionChanged();
                              else await load();
                            })
                          }
                        >
                          {account.mfaRequired
                            ? "Make MFA optional"
                            : "Require MFA"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <h3>Invitations</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Account type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invite) => (
              <tr key={invite.id}>
                <td>{invite.email}</td>
                <td>{invite.role}</td>
                <td>
                  {invite.acceptedAt
                    ? "Accepted"
                    : invite.revokedAt
                      ? "Revoked"
                      : new Date(invite.expiresAt).getTime() < Date.now()
                        ? "Expired"
                        : "Pending"}
                </td>
                <td>
                  {!invite.acceptedAt && !invite.revokedAt && (
                    <div className="row-actions">
                      {(["resend", "revoke"] as const).map((action) => (
                        <button
                          key={action}
                          disabled={busy}
                          onClick={() =>
                            void run(async () => {
                              await (action === "resend"
                                ? resendManagedInvitation(invite.id)
                                : revokeManagedInvitation(invite.id));
                              await load();
                              setNotice(
                                action === "resend"
                                  ? "New invitation queued; the old link is invalid."
                                  : "Invitation revoked.",
                              );
                            })
                          }
                        >
                          {action === "resend" ? "Resend" : "Revoke"}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dialog
        className="user-editor"
        ref={dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setDraft(null);
        }}
        onClose={() => {
          if (!busy) setDraft(null);
        }}
      >
        {draft && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(save);
            }}
          >
            <header>
              <h2>{draft.id ? "Manage user" : "Invite user"}</h2>
              <button
                type="button"
                disabled={busy}
                aria-label="Close user editor"
                onClick={() => setDraft(null)}
              >
                ×
              </button>
            </header>
            {error && (
              <p role="alert" className="error">
                {error} Your draft is retained.
              </p>
            )}
            {notice && (
              <p role="status" className="notice">
                {notice}
              </p>
            )}
            <fieldset disabled={busy}>
              <div className="user-name-fields">
                <label>
                  First name
                  <input
                    required
                    value={draft.firstName}
                    onChange={(e) =>
                      setDraft({ ...draft, firstName: e.target.value })
                    }
                  />
                </label>
                <label>
                  Last name
                  <input
                    required
                    value={draft.lastName}
                    onChange={(e) =>
                      setDraft({ ...draft, lastName: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Email
                <input
                  type="email"
                  required
                  readOnly={Boolean(draft.id)}
                  value={draft.email}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                />
              </label>
              {!draft.id && (
                <>
                  <label>
                    Account type
                    <select
                      value={draft.role}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          role: e.target.value,
                          capabilities: [],
                          formNotificationIds: [],
                          clientId: "",
                        })
                      }
                    >
                      <option value="member">Team member</option>
                      <option value="crew">Crew · assigned work only</option>
                      <option value="client">
                        Client · granted properties only
                      </option>
                    </select>
                  </label>
                  {draft.role === "client" && (
                    <label>
                      Client
                      <select
                        required
                        value={draft.clientId}
                        onChange={(e) =>
                          setDraft({ ...draft, clientId: e.target.value })
                        }
                      >
                        <option value="">Choose a client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <p>
                    They will receive an invitation to verify their email and
                    choose their password.
                  </p>
                </>
              )}
              {draft.id && (
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) =>
                      setDraft({ ...draft, active: e.target.checked })
                    }
                  />
                  Account active
                </label>
              )}
              {draft.role !== "client" && (
                <>
                  <h3>Tool access</h3>
                  <p>
                    Select exactly which areas and tools this person can use.
                  </p>
                  {selected &&
                    !selected.reviewedAt &&
                    selected.suggestedCapabilities.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            capabilities: selected.suggestedCapabilities,
                          })
                        }
                      >
                        Load previous-role suggestions for review
                      </button>
                    )}
                  <AccessCheckboxes
                    value={draft.capabilities}
                    onChange={(capabilities) =>
                      setDraft({ ...draft, capabilities })
                    }
                    disabled={busy}
                  />
                </>
              )}
              {draft.formNotificationIds.length > 0 && (
                <p>
                  {draft.formNotificationIds.length} existing form notification
                  subscriptions will be preserved.
                </p>
              )}
              {draft.id && (
                <div className="row-actions">
                  <button
                    type="button"
                    onClick={() =>
                      void run(async () => {
                        await revokeManagedUserSessions(draft.id!);
                        setNotice("User sessions revoked.");
                      })
                    }
                  >
                    Revoke sessions
                  </button>
                  <button
                    type="button"
                    disabled={!selected?.active}
                    onClick={() => {
                      if (
                        !confirm(
                          `Send a password recovery email to ${selected?.email}? This uses the saved account email and does not change MFA requirements.`,
                        )
                      )
                        return;
                      void run(async () => {
                        await requestManagedPasswordRecovery(draft.id!);
                        setNotice(
                          "Password recovery email queued for delivery.",
                        );
                      });
                    }}
                  >
                    Send password recovery
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void run(async () => {
                        const data = await listManagedUserHistory(draft.id!);
                        if (alive.current) setHistory(data.items);
                      })
                    }
                  >
                    View access history
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void run(async () => {
                        const fresh = (await load()).find(
                          (account) => account.id === draft.id,
                        );
                        if (!fresh)
                          throw new Error(
                            "This account is no longer available.",
                          );
                        if (alive.current) edit(fresh);
                      })
                    }
                  >
                    Discard draft and reload saved values
                  </button>
                </div>
              )}
              {history.length > 0 && (
                <ul>
                  {history.map((entry, index) => (
                    <li key={index}>
                      {entry.action} ·{" "}
                      {new Date(entry.createdAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
            <footer>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : draft.id ? "Save user" : "Send invitation"}
              </button>
            </footer>
          </form>
        )}
      </dialog>
    </section>
  );
}
