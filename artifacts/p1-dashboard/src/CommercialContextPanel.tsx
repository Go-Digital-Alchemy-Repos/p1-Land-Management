import { useCallback, useEffect, useRef, useState } from "react";
import {
  contextTransport,
  ContextError,
  type ContextTransport,
  type ContextMutationAck,
  type Context,
  type Candidate,
  type ContextInput,
  type SearchKind,
  type ContactValues,
} from "./commercial-context.types";
import "./commercial-context.css";
import { formatPhoneNumber } from "./phone";
import { EmailLink, PhoneLink } from "./contact-links";
type Choice = { mode: "new" | "existing" | "none"; selected: Candidate | null };
type Draft = {
  organization: Choice;
  contact: Choice;
  property: Choice;
  company: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  title: string;
  contactRole: ContextInput["contactRole"];
  propertyRole: ContextInput["propertyRole"];
  propertyName: string;
  address: string;
  precision: "region" | "approximate" | "confirmed";
  acreage: string;
};
const choice = (value: Candidate | null, optional = false): Choice => ({
  mode: value ? "existing" : optional ? "none" : "new",
  selected: value,
});
const fromContext = (c: Context): Draft => ({
  organization: choice(c.organization),
  contact: choice(c.contact),
  property: choice(c.property, true),
  company: "",
  name: "",
  email: "",
  phone: "",
  source: "",
  title: "",
  contactRole: "requester",
  propertyRole: "prospective_customer",
  propertyName: "",
  address: "",
  precision: "region",
  acreage: "",
});
const contactFrom = (c: Context): ContactValues => ({
  name: c.contact?.name || "",
  email: c.contact?.email || null,
  phone: formatPhoneNumber(c.contact?.phone) || null,
  source: c.contact?.channel_source || "",
});
const nullable = (value: string) => value.trim() || null;
function contactValues(
  name: string,
  email: string,
  phone: string,
  source: string,
): ContactValues {
  if (!email.trim() && !phone.trim())
    throw Error("Provide an email address or phone number.");
  if (
    (phone.trim() && !/^\+?[0-9() .-]+$/.test(phone.trim())) ||
    (phone.trim() && !/^[0-9]{7,15}$/.test(phone.replace(/\D/g, "")))
  )
    throw Error("Enter a usable phone number.");
  return {
    name: name.trim(),
    email: nullable(email),
    phone: nullable(phone),
    source: source.trim(),
  };
}
function Picker({
  label,
  kind,
  value,
  onChange,
  api,
  disabled,
  optional = false,
}: {
  label: string;
  kind: SearchKind;
  value: Choice;
  onChange: (value: Choice) => void;
  api: ContextTransport;
  disabled: boolean;
  optional?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [items, setItems] = useState<Candidate[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0),
    pending = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const reset = () => {
    generation.current++;
    pending.current = false;
    setItems([]);
    setCursor(null);
    setBusy(false);
    setError("");
  };
  async function search(more = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const current = ++generation.current;
    try {
      const page = await api.search({
        kind,
        q: query,
        limit: 25,
        ...(more && cursor ? { after: cursor } : {}),
      });
      if (current === generation.current) {
        setItems((old) =>
          more
            ? [
                ...old,
                ...page.items.filter((i) => !old.some((o) => o.id === i.id)),
              ]
            : page.items,
        );
        setCursor(page.nextCursor);
      }
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    } finally {
      if (current === generation.current) {
        setBusy(false);
        pending.current = false;
      }
    }
  }
  return (
    <fieldset className="context-picker" disabled={disabled}>
      <legend>{label}</legend>
      <label>
        Choose how to link {label.toLowerCase()}
        <select
          value={value.mode}
          onChange={(e) => {
            reset();
            onChange({ ...value, mode: e.target.value as Choice["mode"] });
          }}
        >
          {optional && <option value="none">No property selected yet</option>}
          <option value="new">Create a prospect record</option>
          <option value="existing">Search and link an existing record</option>
        </select>
      </label>
      {value.mode === "existing" && (
        <>
          <label>
            Search {label.toLowerCase()}
            <input
              value={query}
              onChange={(e) => {
                reset();
                setQuery(e.target.value);
              }}
              maxLength={100}
            />
          </label>
          <button type="button" disabled={busy} onClick={() => void search()}>
            Search {label.toLowerCase()}
          </button>
          {value.selected && (
            <p className="context-selected">
              Selected: {value.selected.display_name || value.selected.name}{" "}
              <button
                type="button"
                onClick={() => onChange({ ...value, selected: null })}
              >
                Clear selection
              </button>
            </p>
          )}
          <ul aria-label={`${label} search results`}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={value.selected?.id === item.id}
                  onClick={() => onChange({ ...value, selected: item })}
                >
                  {item.display_name || item.name}
                  <small>
                    {item.address ||
                      item.email ||
                      formatPhoneNumber(item.phone) ||
                      item.legal_name ||
                      "Review this record"}
                    {item.client_id ? " · Existing customer record" : ""}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {cursor && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void search(true)}
            >
              Load more {label.toLowerCase()}
            </button>
          )}
          <p role="status">
            {busy
              ? "Searching…"
              : `${items.length} results shown. Select a record to link it.`}
          </p>
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </fieldset>
  );
}
export function CommercialContextPanel({
  leadId,
  leadVersion,
  api = contextTransport,
  disabled = false,
  onMutationAck,
  onBusyChange,
}: {
  leadId: string;
  leadVersion?: number;
  api?: ContextTransport;
  disabled?: boolean;
  onMutationAck?: (ack: ContextMutationAck) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [context, setContext] = useState<Context | null>(null),
    [draft, setDraft] = useState<Draft | null>(null),
    [review, setReview] = useState<ContactValues>({
      name: "",
      email: null,
      phone: null,
      source: "",
    });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [conflict, setConflict] = useState(false);
  const generation = useRef(0),
    active = useRef(false),
    attempt = useRef<{ canonical: string; body: ContextInput } | null>(null);
  const callbacks = useRef({ onMutationAck, onBusyChange });
  callbacks.current = { onMutationAck, onBusyChange };
  const markBusy = (value: boolean) => {
    active.current = value;
    setBusy(value);
    callbacks.current.onBusyChange?.(value);
  };
  const accept = (next: Context) => {
    setContext(next);
    setDraft(fromContext(next));
    setReview(contactFrom(next));
    attempt.current = null;
  };
  const load = useCallback(async () => {
    if (active.current) return;
    const current = ++generation.current;
    markBusy(true);
    setError("");
    try {
      const next = await api.get(leadId);
      if (current === generation.current) {
        accept(next);
        setMessage("");
        setConflict(false);
      }
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    } finally {
      if (current === generation.current) markBusy(false);
    }
  }, [leadId, api]);
  useEffect(() => {
    setContext(null);
    setDraft(null);
    setMessage("");
    setError("");
    setConflict(false);
    attempt.current = null;
    active.current = false;
    void load();
    return () => {
      generation.current++;
      active.current = false;
      callbacks.current.onBusyChange?.(false);
    };
  }, [load]);
  const versionMismatch = Boolean(
    context &&
    leadVersion !== undefined &&
    leadVersion !== context.lead.version,
  );
  const blocked = conflict || versionMismatch;
  const field = (key: keyof Draft, value: Draft[keyof Draft]) =>
    setDraft((old) => (old ? { ...old, [key]: value } : old));
  async function submit(kind: "context" | "contact") {
    if (!context || !draft || active.current || disabled || blocked) return;
    const current = generation.current;
    setError("");
    setMessage("");
    try {
      let body: ContextInput | undefined;
      if (kind === "context") {
        const existing = (v: Choice) => {
          if (!v.selected)
            throw Error("Select an existing record or choose to create one.");
          return { existingId: v.selected.id };
        };
        const content: Omit<ContextInput, "operationId"> = {
          expectedVersion: context.lead.version,
          organization:
            draft.organization.mode === "existing"
              ? existing(draft.organization)
              : {
                  create: {
                    displayName: draft.company.trim(),
                    legalName: null,
                    clientId: null,
                  },
                },
          contact:
            draft.contact.mode === "existing"
              ? existing(draft.contact)
              : {
                  create: contactValues(
                    draft.name,
                    draft.email,
                    draft.phone,
                    draft.source,
                  ),
                },
          contactRole: draft.contactRole,
          title: nullable(draft.title),
          source: draft.source.trim(),
          property:
            draft.property.mode === "none"
              ? null
              : draft.property.mode === "existing"
                ? existing(draft.property)
                : {
                    create: {
                      name: draft.propertyName.trim(),
                      address: draft.address.trim(),
                      locationPrecision: draft.precision,
                      acreage:
                        draft.acreage === "" ? null : Number(draft.acreage),
                    },
                  },
          propertyRole: draft.propertyRole,
        };
        const canonical = JSON.stringify(content);
        if (!attempt.current || attempt.current.canonical !== canonical)
          attempt.current = {
            canonical,
            body: { operationId: crypto.randomUUID(), ...content },
          };
        body = attempt.current.body;
      }
      markBusy(true);
      const result =
        kind === "context"
          ? await api.save(leadId, body!)
          : await api.review(leadId, {
              expectedVersion: context.lead.version,
              contactVersion: context.contact!.version,
              contact: contactValues(
                review.name,
                review.email || "",
                review.phone || "",
                review.source,
              ),
            });
      if (current !== generation.current) return;
      callbacks.current.onMutationAck?.({
        leadId,
        expectedVersion: context.lead.version,
        newVersion: result.version,
      });
      // Acceptance is known even if the subsequent read fails; never offer a duplicate save in that state.
      setConflict(true);
      setMessage("Changes saved. Loading the reviewed records…");
      const next = await api.get(leadId);
      if (current === generation.current) {
        accept(next);
        setConflict(false);
        setMessage("Reviewed context saved. Original inquiry unchanged.");
      }
    } catch (e) {
      if (current === generation.current) {
        setError((e as Error).message);
        if (e instanceof ContextError && e.status === 409) setConflict(true);
      }
    } finally {
      if (current === generation.current) markBusy(false);
    }
  }
  return (
    <section
      className="commercial-context"
      aria-label="Company, contact and property context"
    >
      <header>
        <h3>Company, contact and property</h3>
        <p>
          Review and link sales records. Original inquiry details stay
          unchanged.
        </p>
      </header>
      {error && (
        <p role="alert" className="context-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {busy && !context && <p role="status">Loading prospect context…</p>}
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => void load()}
      >
        Reload saved context and discard edits
      </button>
      {versionMismatch && (
        <p role="alert">
          The inquiry version changed. Use Reload inquiry and discard draft
          above before saving context; your context edits remain below.
        </p>
      )}
      {conflict && (
        <p role="alert">
          The saved version must be refreshed before another change. Your
          entered fields remain below for reference.
        </p>
      )}
      {context && draft && (
        <>
          <details>
            <summary>Original inquiry · read-only</summary>
            <dl>
              {Object.entries(context.intake?.raw_intake || {}).map(
                ([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>
                      {value === null
                        ? "Not provided"
                        : typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          </details>
          <div className="context-current">
            <p>
              <strong>Reviewed company</strong>
              {context.organization?.display_name || "Not linked"}
            </p>
            <p>
              <strong>Reviewed contact</strong>
              {context.contact?.name || "Not linked"}
              {context.contact?.email && <span><EmailLink email={context.contact.email} /></span>}
              {context.contact?.phone && <span><PhoneLink phone={context.contact.phone} /></span>}
            </p>
            <p>
              <strong>Reviewed property</strong>
              {context.property?.name || "Not linked"}
              {context.property?.address && (
                <span>{context.property.address}</span>
              )}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit("context");
            }}
          >
            <fieldset
              disabled={busy || disabled || blocked}
              className="context-form"
            >
              <legend>Link reviewed records</legend>
              <Picker
                label="Company"
                kind="organizations"
                value={draft.organization}
                onChange={(v) => field("organization", v)}
                api={api}
                disabled={busy || disabled}
              />
              {draft.organization.mode === "new" && (
                <label>
                  Company name
                  <input
                    required
                    maxLength={500}
                    value={draft.company}
                    onChange={(e) => field("company", e.target.value)}
                  />
                </label>
              )}
              <Picker
                label="Contact"
                kind="contacts"
                value={draft.contact}
                onChange={(v) => field("contact", v)}
                api={api}
                disabled={busy || disabled}
              />
              {draft.contact.mode === "new" && (
                <div className="context-grid">
                  <label>
                    Contact name
                    <input
                      required
                      maxLength={500}
                      value={draft.name}
                      onChange={(e) => field("name", e.target.value)}
                    />
                  </label>
                  <label>
                    Contact email
                    <input
                      type="email"
                      maxLength={254}
                      value={draft.email}
                      onChange={(e) => field("email", e.target.value)}
                    />
                  </label>
                  <label>
                    Contact phone
                    <input
                      type="tel"
                      maxLength={50}
                      value={draft.phone}
                      onChange={(e) => field("phone", e.target.value)}
                      onBlur={(e) => field("phone", formatPhoneNumber(e.target.value))}
                    />
                  </label>
                  <p>Provide at least one contact channel.</p>
                </div>
              )}
              <div className="context-grid">
                <label>
                  Contact role
                  <select
                    value={draft.contactRole}
                    onChange={(e) => field("contactRole", e.target.value)}
                  >
                    {[
                      "requester",
                      "site_manager",
                      "facilities",
                      "procurement",
                      "owner_representative",
                      "other",
                    ].map((v) => (
                      <option key={v} value={v}>
                        {v.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Contact title (optional)
                  <input
                    maxLength={500}
                    value={draft.title}
                    onChange={(e) => field("title", e.target.value)}
                  />
                </label>
              </div>
              <Picker
                optional
                label="Property"
                kind="properties"
                value={draft.property}
                onChange={(v) => field("property", v)}
                api={api}
                disabled={busy || disabled}
              />
              {draft.property.mode === "new" && (
                <div className="context-grid">
                  <label>
                    Property name
                    <input
                      required
                      maxLength={500}
                      value={draft.propertyName}
                      onChange={(e) => field("propertyName", e.target.value)}
                    />
                  </label>
                  <label>
                    Property address or region
                    <input
                      required
                      maxLength={500}
                      value={draft.address}
                      onChange={(e) => field("address", e.target.value)}
                    />
                  </label>
                  <label>
                    Location precision
                    <select
                      value={draft.precision}
                      onChange={(e) => field("precision", e.target.value)}
                    >
                      <option value="region">Region only</option>
                      <option value="approximate">Approximate location</option>
                      <option value="confirmed">Confirmed address</option>
                    </select>
                  </label>
                  <label>
                    Acreage (leave blank if unknown)
                    <input
                      type="number"
                      min="0"
                      max="1000000000"
                      step="any"
                      value={draft.acreage}
                      onChange={(e) => field("acreage", e.target.value)}
                    />
                  </label>
                </div>
              )}
              {draft.property.mode !== "none" && (
                <label>
                  Company’s role at the property
                  <select
                    value={draft.propertyRole}
                    onChange={(e) => field("propertyRole", e.target.value)}
                  >
                    {[
                      "reported_owner",
                      "operator",
                      "manager",
                      "developer",
                      "prospective_customer",
                      "other",
                    ].map((v) => (
                      <option key={v} value={v}>
                        {v.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                How were these details reviewed?
                <input
                  required
                  maxLength={500}
                  placeholder="For example, direct conversation"
                  value={draft.source}
                  onChange={(e) => field("source", e.target.value)}
                />
              </label>
              <button
                className="primary"
                disabled={busy || disabled || blocked}
              >
                Save reviewed links
              </button>
            </fieldset>
          </form>
          {context.contact && !context.contact.client_id && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit("contact");
              }}
            >
              <fieldset
                disabled={busy || disabled || blocked}
                className="context-form"
              >
                <legend>Correct reviewed contact</legend>
                <div className="context-grid">
                  <label>
                    Reviewed contact name
                    <input
                      required
                      maxLength={500}
                      value={review.name}
                      onChange={(e) =>
                        setReview((v) => ({ ...v, name: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Reviewed email
                    <input
                      type="email"
                      maxLength={254}
                      value={review.email || ""}
                      onChange={(e) =>
                        setReview((v) => ({
                          ...v,
                          email: nullable(e.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Reviewed phone
                    <input
                      type="tel"
                      maxLength={50}
                      value={review.phone || ""}
                      onChange={(e) =>
                        setReview((v) => ({
                          ...v,
                          phone: e.target.value || null,
                        }))
                      }
                      onBlur={(e) =>
                        setReview((v) => ({
                          ...v,
                          phone: formatPhoneNumber(e.target.value) || null,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Contact review source
                    <input
                      required
                      maxLength={500}
                      value={review.source}
                      onChange={(e) =>
                        setReview((v) => ({ ...v, source: e.target.value }))
                      }
                    />
                  </label>
                </div>
                <button disabled={busy || disabled || blocked}>
                  Save contact correction
                </button>
              </fieldset>
            </form>
          )}
          {context.contact?.client_id && (
            <p>
              This contact belongs to an existing customer. Use the customer
              contact workflow to correct its details.
            </p>
          )}
        </>
      )}
    </section>
  );
}
