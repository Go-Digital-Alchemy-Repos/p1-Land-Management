import { useEffect, useRef, useState } from "react";
import {
  getLeadOnboarding,
  onboardLeadCustomer,
  getWorkspaceReferences,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./marketing/useCmsUnsavedChanges";
import "./lead-onboarding.css";
type State = Awaited<ReturnType<typeof getLeadOnboarding>>;
type Input = Parameters<typeof onboardLeadCustomer>[1];
export function LeadOnboarding({
  leadId,
  onSaved,
  suggestedCustomer,
  initiallyOpen = false,
}: {
  leadId: string;
  onSaved?: () => void;
  suggestedCustomer?: { name: string; email: string | null; phone: string | null };
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <div className="lead-onboarding">
      {!open && <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Customer onboarding
      </button>}
      {open && (
        <OnboardingForm key={leadId} leadId={leadId} onSaved={onSaved} onClose={() => setOpen(false)} suggestedCustomer={suggestedCustomer} />
      )}
    </div>
  );
}
function OnboardingForm({
  leadId,
  onSaved,
  onClose,
  suggestedCustomer,
}: {
  leadId: string;
  onSaved?: () => void;
  onClose: () => void;
  suggestedCustomer?: { name: string; email: string | null; phone: string | null };
}) {
  const [state, setState] = useState<State | null>(null),
    [clients, setClients] = useState<Array<{ id: string; name: string }>>([]),
    [mode, setMode] = useState("link"),
    [clientId, setClientId] = useState(""),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [phone, setPhone] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState<Input | null>(null),
    [stale, setStale] = useState(false);
  const alive = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  const dirty = Boolean(clientId || name || email || phone || pending);
  const potentialMatches = clients.filter((client) =>
    name.trim() && client.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
  );
  useCmsUnsavedChanges(
    dirty,
    pending
      ? "Leave this inquiry? Customer onboarding is unconfirmed. Check its saved customer before starting another operation."
      : "Discard your customer onboarding selections?",
  );
  function options() {
    controller.current = new AbortController();
    return {
      signal: AbortSignal.any([
        controller.current.signal,
        AbortSignal.timeout(30000),
      ]),
    };
  }
  async function load() {
    if (gate.current || pending) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const opts = options();
      const [next, refs] = await Promise.all([
        getLeadOnboarding(leadId, opts),
        getWorkspaceReferences(opts),
      ]);
      if (alive.current) {
        setState(next);
        setClients(refs.clients);
        setStale(false);
      }
    } catch {
      if (alive.current) {
        setStale(true);
        setError(
          "Could not load current onboarding details. Refresh before continuing.",
        );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, [leadId]);
  useEffect(() => {
    if (mode !== "create" || !suggestedCustomer) return;
    setName((current) => current || suggestedCustomer.name);
    setEmail((current) => current || suggestedCustomer.email || "");
    setPhone((current) => current || suggestedCustomer.phone || "");
  }, [mode, suggestedCustomer?.name, suggestedCustomer?.email, suggestedCustomer?.phone]);
  async function save() {
    if (gate.current || !state || stale) return;
    const body: Input = pending || {
      operationId: crypto.randomUUID(),
      expectedVersion: state.version,
      customer:
        mode === "link"
          ? { existingId: clientId }
          : {
              create: {
                name: name.trim(),
                email: email.trim() || null,
                phone: phone.trim() || null,
              },
            },
    };
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setPending(body);
    try {
      const result = await onboardLeadCustomer(leadId, body, options());
      if (alive.current) {
        setPending(null);
        setClientId("");
        setName("");
        setEmail("");
        setPhone("");
        setState({
          ...state,
          clientId: result.clientId,
          clientName:
            mode === "create"
              ? name
              : clients.find((c) => c.id === result.clientId)?.name || null,
          version: result.version,
          clientArchived: false,
        });
        setMessage(
          "Customer linked. Property setup and agreement work can continue separately.",
        );
        onSaved?.();
      }
    } catch (e) {
      if (alive.current) {
        const status = (e as { status?: number }).status;
        if (
          status === 400 ||
          status === 403 ||
          status === 404 ||
          status === 409
        ) {
          setPending(null);
          setStale(true);
          setError(
            status === 409 && /matching active customer/i.test((e as Error).message)
              ? "An active customer already matches this account. Refresh, then link the existing customer instead."
              : "Could not continue onboarding. Refresh the saved inquiry, review its stage, customer and prospect context, then try again.",
          );
        } else
          setError(
            "The result could not be confirmed. Retry the same onboarding operation to check or finish it.",
          );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section aria-label="Customer onboarding">
      <h3>Link a customer after Won</h3>
      <p>
        Choose an existing customer or enter a new customer’s details. This step
        keeps the inquiry and its original information.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button
        type="button"
        disabled={busy || Boolean(pending)}
        onClick={() => void load()}
      >
        Refresh onboarding
      </button>
      {state?.clientId ? (
        <p>
          Linked customer:{" "}
          <a href={"/clients/" + state.clientId}>
            {state.clientName || "View customer"}
          </a>
          {state.clientArchived ? " (archived)" : ""}
        </p>
      ) : state && state.status !== "won" ? (
        <p>
          Mark this inquiry Won in follow-up before starting customer
          onboarding.
        </p>
      ) : (
        state && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset disabled={busy || Boolean(pending) || stale}>
              <legend>Customer selection</legend>
              <label>
                Onboarding choice
                <select value={mode} onChange={(e) => {
                  setMode(e.target.value);
                }}>
                  <option value="link">Link an existing customer</option>
                  <option value="create">Create a new customer</option>
                </select>
              </label>
              {mode === "link" ? (
                <label>
                  Existing customer
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    <option value="">Choose a customer</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  {potentialMatches.length > 0 && <div role="status" className="lead-onboarding-matches">
                    <strong>A customer with this name already exists.</strong>
                    {potentialMatches.map((client) => <button key={client.id} type="button" onClick={() => { setMode("link"); setClientId(client.id); }}>Link {client.name} instead</button>)}
                  </div>}
                  <label>
                    Customer name
                    <input
                      required
                      maxLength={300}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label>
                    Customer email
                    <input
                      type="email"
                      maxLength={320}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    Customer phone
                    <input
                      maxLength={100}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                </>
              )}
            </fieldset>
            <p>
              Review the customer choice before saving. Property setup, portal
              invitations and accounting connections are separate steps.
            </p>
            <button
              type="submit"
              disabled={
                busy ||
                stale ||
                (!pending && (mode === "link" ? !clientId : !name.trim()))
              }
            >
              {busy
                ? "Saving…"
                : pending
                  ? "Retry customer onboarding"
                  : mode === "link"
                    ? "Link customer"
                    : "Create and link customer"}
            </button>
            <button type="button" className="secondary" disabled={busy || Boolean(pending)} onClick={onClose}>
              Cancel handoff
            </button>
          </form>
        )
      )}
    </section>
  );
}
