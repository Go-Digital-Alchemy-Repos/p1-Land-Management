import { useRef, useState } from "react";
import type { BillingDraft } from "../../../lib/api-client-react/src/dashboard/models/billingDraft";

type Invoice = {
  id: string;
  document_number?: string | null;
  client_name?: string | null;
  balance_cents: number;
  payment_url?: string | null;
  ownership_verified?: boolean;
};

type Filter = "all" | "review" | "invoiced" | "posted" | "invoices";
type ExternalInvoice = { id: string; reference: string | null; invoicedOn: string; recordedBy: string; recordedAt: string };
type Draft = BillingDraft & { version: number; externalInvoice?: ExternalInvoice | null; posting_request_id?: string | null };
type MarkInput = { operationId: string; expectedVersion: number; expectedAmountCents: number; reference?: string; invoicedOn: string; note?: string };
type VoidInput = { operationId: string; reason: string };

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function externalInvoiceError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("billing_draft_changed")) return "This draft changed. Refresh Billing and review the amount again.";
  if (code.includes("already_invoiced_externally")) return "This draft is already marked as invoiced. Refresh Billing to see the latest record.";
  if (code.includes("already_posted")) return "This draft has already been posted.";
  if (code.includes("posting_outcome_requires_review")) return "A posting attempt already exists for this draft. Finance must review its outcome before recording an outside invoice.";
  if (code.includes("already_voided")) return "This invoiced mark was already removed. Refresh Billing.";
  if (code.includes("operation_id_conflict")) return "This action could not be retried. Refresh Billing and try again.";
  return "Could not update the invoice mark. Try again or refresh Billing.";
}

function invoiceMarkLabel(invoice: ExternalInvoice) {
  const date = new Date(`${invoice.invoicedOn}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Invoiced outside dashboard${invoice.reference ? ` · #${invoice.reference}` : ""} · ${date}`;
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/^./, (first) => first.toUpperCase());
}

export function BillingRecords({
  drafts,
  invoices,
  canManage,
  onPost,
  quickbooksEnabled = true,
  onMarkExternal,
  onVoidExternal,
}: {
  drafts: Draft[];
  invoices: Invoice[];
  canManage: boolean;
  onPost?: (id: string) => Promise<void>;
  quickbooksEnabled?: boolean;
  onMarkExternal?: (id: string, input: MarkInput) => Promise<void>;
  onVoidExternal?: (id: string, input: VoidInput) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>(quickbooksEnabled ? "all" : "review");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const postInFlight = useRef(false);
  const [externalId, setExternalId] = useState<string | null>(null);
  const [externalMode, setExternalMode] = useState<"mark" | "void">("mark");
  const [externalReference, setExternalReference] = useState("");
  const [externalDate, setExternalDate] = useState(localDate);
  const [externalNote, setExternalNote] = useState("");
  const [externalOperationId, setExternalOperationId] = useState(() => crypto.randomUUID());
  const [externalBusy, setExternalBusy] = useState(false);
  const [externalError, setExternalError] = useState("");
  const openExternal = (id: string, mode: "mark" | "void") => {
    setExternalId(id);
    setExternalMode(mode);
    setExternalReference("");
    setExternalDate(localDate());
    setExternalNote("");
    setExternalOperationId(crypto.randomUUID());
    setExternalError("");
  };
  const term = search.trim().toLocaleLowerCase();
  const matchingDrafts = drafts.filter(
    (draft) =>
      (filter === "all" ||
        (filter === "review" && draft.status !== "posted" && !draft.externalInvoice) ||
        (filter === "invoiced" && Boolean(draft.externalInvoice)) ||
        (filter === "posted" && draft.status === "posted")) &&
      `${draft.title} ${draft.property_name} ${draft.kind} ${draft.status}`
        .toLocaleLowerCase()
        .includes(term),
  );
  const matchingInvoices =
    quickbooksEnabled && (filter === "all" || filter === "invoices")
      ? invoices.filter((invoice) =>
          `${invoice.document_number || invoice.id} ${invoice.client_name || ""}`
            .toLocaleLowerCase()
            .includes(term),
        )
      : [];
  const reviewDraft = drafts.find(
    (draft) => draft.id === reviewId && draft.status !== "posted",
  );

  return (
    <div className="billing-records">
      {(drafts.length > 0 || invoices.length > 0) && (
        <div className="billing-record-controls">
          <label>
            Search billing
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Property, invoice or description"
            />
          </label>
          <label>
            Show
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
            >
              <option value="all">All records</option>
              {canManage && (
                <option value="review">{quickbooksEnabled ? "Needs posting review" : "Needs invoicing"}</option>
              )}
              {canManage && <option value="invoiced">Invoiced outside dashboard</option>}
              <option value="posted">Posted charges</option>
              {quickbooksEnabled && <option value="invoices">QuickBooks invoices</option>}
            </select>
          </label>
        </div>
      )}
      {!drafts.length && !invoices.length ? (
        <p className="empty">
          {canManage
            ? "No billing drafts yet."
            : "No invoices yet."}
        </p>
      ) : !matchingDrafts.length && !matchingInvoices.length ? (
        <p className="empty">No billing records match these filters.</p>
      ) : (
        <div className="billing-record-list">
          {matchingDrafts.map((draft) => (
            <article className="billing-record" key={draft.id}>
              <details>
                <summary>
                  <span className="billing-record-heading">
                    <strong>{draft.title}</strong>
                    <small>
                      {draft.property_name} · {label(draft.kind)}
                    </small>
                  </span>
                  <span className="billing-record-summary">
                    <strong>{money(draft.amount_cents)}</strong>
                    <span className="badge">{draft.externalInvoice ? invoiceMarkLabel(draft.externalInvoice) : label(draft.status)}</span>
                  </span>
                </summary>
                <div className="billing-record-detail">
                  <dl>
                    <div>
                      <dt>Property</dt>
                      <dd>{draft.property_name}</dd>
                    </div>
                    <div>
                      <dt>Charge type</dt>
                      <dd>{label(draft.kind)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{label(draft.status)}</dd>
                    </div>
                    {draft.balance_cents != null && (
                      <div>
                        <dt>Outstanding</dt>
                        <dd>{money(draft.balance_cents)}</dd>
                      </div>
                    )}
                  </dl>
                  {draft.externalInvoice && <p className="billing-record-warning" role="status">
                    Invoiced outside dashboard{draft.externalInvoice.reference ? ` · #${draft.externalInvoice.reference}` : ""} · {new Date(`${draft.externalInvoice.invoicedOn}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>}
                  {!quickbooksEnabled && draft.posting_request_id && !draft.externalInvoice && <p className="billing-record-warning" role="status">
                    A prior accounting posting attempt needs finance review before this draft can be marked invoiced outside the dashboard.
                  </p>}
                  {canManage &&
                    draft.status === "posted" &&
                    !draft.ownership_verified && (
                      <p role="status" className="billing-record-warning">
                        Accounting customer needs reconciliation. This charge is
                        hidden from the client.
                      </p>
                    )}
                  <div className="billing-record-actions">
                    {canManage && onMarkExternal && draft.status !== "posted" && !draft.posting_request_id && !draft.externalInvoice && (
                      <button type="button" className="secondary" disabled={externalBusy} onClick={() => openExternal(draft.id, "mark")}>
                        Mark as invoiced
                      </button>
                    )}
                    {canManage && onVoidExternal && draft.externalInvoice && (
                      <button type="button" className="secondary" disabled={externalBusy} onClick={() => openExternal(draft.id, "void")}>
                        Undo invoiced mark
                      </button>
                    )}
                    {quickbooksEnabled && onPost && canManage && draft.status !== "posted" && !draft.externalInvoice && (
                      <button
                        type="button"
                        className="secondary"
                        disabled={posting}
                        onClick={() => {
                          setReviewId(draft.id);
                          setPostError("");
                        }}
                      >
                        Review QuickBooks posting
                      </button>
                    )}
                    {draft.payment_url && (
                      <a
                        href={draft.payment_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Pay invoice for ${draft.title}`}
                      >
                        Pay invoice
                      </a>
                    )}
                  </div>
                  {externalId === draft.id && <form className="billing-post-review" onSubmit={(event) => {
                    event.preventDefault();
                    if (externalBusy) return;
                    setExternalBusy(true);
                    setExternalError("");
                    const action = externalMode === "mark"
                      ? onMarkExternal?.(draft.id, { operationId: externalOperationId, expectedVersion: draft.version, expectedAmountCents: draft.amount_cents, reference: externalReference.trim() || undefined, invoicedOn: externalDate, note: externalNote || undefined })
                      : onVoidExternal?.(draft.id, { operationId: externalOperationId, reason: externalNote.trim() });
                    void action?.then(() => setExternalId(null)).catch((error: unknown) => setExternalError(externalInvoiceError(error))).finally(() => setExternalBusy(false));
                  }}>
                    <h3>{externalMode === "mark" ? "Mark as invoiced outside dashboard" : "Undo invoiced mark"}</h3>
                    <p>{draft.title} · {draft.property_name} · {money(draft.amount_cents)}</p>
                    {externalMode === "mark" ? <>
                      <label>Invoice number or reference (optional)<input value={externalReference} maxLength={120} onChange={(event) => setExternalReference(event.target.value)} /></label>
                      <label>Date invoiced<input type="date" required value={externalDate} onChange={(event) => setExternalDate(event.target.value)} /></label>
                      <label>Note (optional)<textarea value={externalNote} maxLength={2000} onChange={(event) => setExternalNote(event.target.value)} /></label>
                    </> : <label>Reason for undoing this mark<textarea required value={externalNote} maxLength={2000} onChange={(event) => setExternalNote(event.target.value)} /></label>}
                    {externalError && <p role="alert" className="error">{externalError}</p>}
                    <div className="billing-record-actions">
                      <button type="button" className="secondary" disabled={externalBusy} onClick={() => setExternalId(null)}>Cancel</button>
                      <button type="submit" className="primary" disabled={externalBusy || (externalMode === "void" && !externalNote.trim())}>{externalBusy ? "Saving…" : externalMode === "mark" ? "Mark as invoiced" : "Undo invoiced mark"}</button>
                    </div>
                  </form>}
                  {quickbooksEnabled && onPost && reviewId === draft.id && reviewDraft && (
                    <div
                      className="billing-post-review"
                      role="group"
                      aria-label={`Review posting ${draft.title}`}
                    >
                      <h3>Review before posting</h3>
                      <p>
                        Posting sends this draft to QuickBooks. Confirm the
                        property and amount.
                      </p>
                      <dl>
                        <div>
                          <dt>Description</dt>
                          <dd>{draft.title}</dd>
                        </div>
                        <div>
                          <dt>Property</dt>
                          <dd>{draft.property_name}</dd>
                        </div>
                        <div>
                          <dt>Amount</dt>
                          <dd>{money(draft.amount_cents)}</dd>
                        </div>
                      </dl>
                      {postError && (
                        <p role="alert" className="error">
                          {postError}
                        </p>
                      )}
                      <div className="billing-record-actions">
                        <button
                          type="button"
                          className="secondary"
                          disabled={posting}
                          onClick={() => {
                            setReviewId(null);
                            setPostError("");
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="primary"
                          disabled={posting}
                          onClick={() => {
                            if (postInFlight.current) return;
                            postInFlight.current = true;
                            setPosting(true);
                            setPostError("");
                            void onPost(draft.id)
                              .then(() => setReviewId(null))
                              .catch((error: unknown) =>
                                setPostError(
                                  error instanceof Error
                                    ? error.message
                                    : "Posting failed. Try again.",
                                ),
                              )
                              .finally(() => {
                                postInFlight.current = false;
                                setPosting(false);
                              });
                          }}
                        >
                          {posting ? "Posting…" : "Post to QuickBooks"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </article>
          ))}
          {matchingInvoices.map((invoice) => (
            <article className="billing-record" key={`invoice-${invoice.id}`}>
              <details>
                <summary>
                  <span className="billing-record-heading">
                    <strong>
                      Invoice {invoice.document_number || invoice.id}
                    </strong>
                    <small>{invoice.client_name || "QuickBooks invoice"}</small>
                  </span>
                  <span className="billing-record-summary">
                    <strong>{money(invoice.balance_cents)} outstanding</strong>
                    <span className="badge">Invoice</span>
                  </span>
                </summary>
                <div className="billing-record-detail">
                  <dl>
                    <div>
                      <dt>Client</dt>
                      <dd>{invoice.client_name || "—"}</dd>
                    </div>
                    <div>
                      <dt>Outstanding</dt>
                      <dd>{money(invoice.balance_cents)}</dd>
                    </div>
                  </dl>
                  {canManage && !invoice.ownership_verified && (
                    <p role="status" className="billing-record-warning">
                      Customer mapping needs review. This invoice is hidden from
                      the client.
                    </p>
                  )}
                  {invoice.payment_url && invoice.ownership_verified && (
                    <div className="billing-record-actions">
                      <a
                        href={invoice.payment_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Pay invoice ${invoice.document_number || invoice.id}`}
                      >
                        Pay invoice
                      </a>
                    </div>
                  )}
                </div>
              </details>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
