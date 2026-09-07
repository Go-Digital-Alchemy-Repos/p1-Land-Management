# Agreement cancellation review — proposal

Status: proposed, not an approved schema or API change. Existing cancellation records preserve charges, but the action queue currently has no way to record a financial review outcome. This proposal adds a review record without changing posted accounting history.

## Decisions and boundaries

Management or finance can review a cancellation-affected charge. Dispatch, sales, crew and clients cannot resolve financial exceptions. An owner is subject to the configured authentication assurance policy. Every action rechecks the operational property, agreement, charge and billing draft on the server.

The initial explicit outcomes should be:

- **Charge remains due:** record the contractual reason and reviewer. Preserve the original amount, charge receipt and billing draft. This resolves this cancellation exception only; it does not approve posting, send an invoice, or mark payment.
- **Accounting correction required:** record the reason and keep the item open until the QuickBooks-owned correction has synchronized back and staff confirm its relationship to this exception. Merely typing an external invoice/credit identifier must not close the exception.
- **Unposted draft correction required:** keep the item open and block posting while a separate reviewed draft-correction transition is completed. A failed posting request with an immutable request ID or payload is ambiguous and cannot be treated as an untouched draft.

Do not add a generic “dismiss” action. Acknowledging an exception must not erase an unresolved monetary difference. Do not subtract original charges from the approved cap merely because an exception was reviewed. Accounting credits and replacement amounts require their own accepted cap policy before implementation.

## Minimal persistent model

An append-only review-event record identifies the charge, agreement cancellation version, billing-draft version or financial fingerprint, outcome, reason, actor and timestamp. A stable client operation UUID and request fingerprint make identical retries return the same event; changed reuse returns a conflict. The current review state is derived from events or maintained as a versioned projection in the same transaction. Historical events are never edited or deleted.

A “charge remains due” decision closes only the exception bound to the reviewed cancellation and financial snapshot. A later accounting change invalidates that matching snapshot and returns the item to review. The queue must retain a visible audit link for resolved history. Closure does not reopen a cancelled agreement or remove source uniqueness.

## Transaction and API proposal

Use a preview endpoint to show current cancellation terms, accepted scope, original charge, posting state and the effect of the requested decision without writing. The explicit review endpoint accepts an operation ID, expected review version, cancellation version and financial fingerprint plus outcome/reason. It uses the existing source/agreement/parent/estimate/recurrence lock order and locks the draft before checking posting state.

A concurrent cancellation, draft posting, reconciliation update or review rejects stale submission with 409. The UI retains entered reason and offers comparison with the current state. It never silently advances a version or repeats a financially different action.

For unposted draft correction, a separate design must specify replacement/supersession, cap accounting and posting guards together. Adding an amount-edit endpoint alone would violate immutable request and duplicate-billing protections. Until those transitions are reviewed, the queue continues to show the unresolved item and explicitly blocks posting of an affected draft.

## Required acceptance

Validate role and property isolation, zero-write previews, concurrent review/posting/reconciliation, retry identity, changed-operation rejection, event immutability, reopened review after financial changes, and source uniqueness after cancellation/replacement. Verify that resolved review does not post/send/charge or mark an invoice paid. Exercise the complete UI with a retained conflicting reason and include review events in the populated database recovery test.

Root decisions required before implementation: whether management and finance have identical review authority; the exact treatment of corrected/credited amounts against approved caps; and the minimal unposted-draft supersession model. Posted invoice numbers, taxes, balances, payments and credits remain owned by QuickBooks.
