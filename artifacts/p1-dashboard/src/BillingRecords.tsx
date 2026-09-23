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

type Filter = "all" | "review" | "posted" | "invoices";

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
}: {
  drafts: BillingDraft[];
  invoices: Invoice[];
  canManage: boolean;
  onPost: (id: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const postInFlight = useRef(false);
  const term = search.trim().toLocaleLowerCase();
  const matchingDrafts = drafts.filter(
    (draft) =>
      (filter === "all" ||
        (filter === "review" && draft.status !== "posted") ||
        (filter === "posted" && draft.status === "posted")) &&
      `${draft.title} ${draft.property_name} ${draft.kind} ${draft.status}`
        .toLocaleLowerCase()
        .includes(term),
  );
  const matchingInvoices =
    filter === "all" || filter === "invoices"
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
                <option value="review">Needs posting review</option>
              )}
              <option value="posted">Posted charges</option>
              <option value="invoices">QuickBooks invoices</option>
            </select>
          </label>
        </div>
      )}
      {!drafts.length && !invoices.length ? (
        <p className="empty">
          {canManage
            ? "No billing drafts or invoices yet."
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
                    <span className="badge">{label(draft.status)}</span>
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
                  {canManage &&
                    draft.status === "posted" &&
                    !draft.ownership_verified && (
                      <p role="status" className="billing-record-warning">
                        Accounting customer needs reconciliation. This charge is
                        hidden from the client.
                      </p>
                    )}
                  <div className="billing-record-actions">
                    {canManage && draft.status !== "posted" && (
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
                  {reviewId === draft.id && reviewDraft && (
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
