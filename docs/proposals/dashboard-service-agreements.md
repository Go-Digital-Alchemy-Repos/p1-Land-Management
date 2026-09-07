# Service agreements and recurring billing preparation — proposed implementation

Status: proposal for orchestrator review, not an implemented or approved schema. This completes an original dashboard-plan gap; it does not replace QuickBooks accounting or reduce the remaining contract/renewal scope.

## Current evidence

Recurring services store only billing_mode (`fixed_monthly`/`per_visit`); the worker generates visits but no recurring billing drafts. Billing creation currently requires an approved estimate and serializes cumulative draft amounts against that estimate's cap. Posted invoice/payment/balance ownership stays with QuickBooks. Preserve those controls.

## Proposed first implementation boundary

Associate an operational property and recurring service with an approved, immutable estimate revision and an explicit service-agreement term. Store accepted scope/terms by reference to that approval, effective start/end dates, billing mode, charge amount in integer cents, office owner and lifecycle/version/audit metadata. Staff enter pricing and contractual text; do not invent P1's terms. An agreement cannot activate from an unapproved estimate or a prospect property.

A renewal creates a successor term linked to a newly approved scope/estimate; it does not rewrite accepted history. Cancellation records an effective date and reason. Scheduling pauses remain distinct from financial term changes: pausing visits does not silently cancel fixed contract charges. Future open-ended/automatic renewal semantics require explicit business terms and remain in the full product scope.

Use explicit dated charge periods for fixed-monthly agreements. Require staff to enter partial first/last-period amounts when needed; do not silently prorate, back-charge, or assume a full partial month. Preview the charge plan and cumulative approved amount before activation. Per-visit terms attach a rate to the immutable occurrence date, with a finite approved total cap; the number of actual visits can vary without exceeding approved authorization. Renewal/change-order workflows extend authorization explicitly.

## Billing preparation invariants

- Generate only draft billing records. Existing staff review/posting and QuickBooks ownership remain unchanged; no invoice sending, payment collection or publication is triggered.
- Fixed charges have a stable agreement/period identity, independent of visit count. Per-visit charges have a stable agreement/work-order identity and require reviewed work. Skipped/cancelled work is excluded.
- Use uniqueness constraints for the charge identity and a transaction that locks operational property/approved estimate/agreement in an agreed consistent order. Retries and two workers must produce one draft.
- Link prepared drafts to their agreement/period/work and preserve the amount/approval snapshot. Include these drafts in the existing approved-estimate cumulative cap, alongside deposits/progress/final billing, so the same authorization cannot be charged twice.
- Do not bill an old unlinked recurrence automatically. Office must review and activate the agreement/charge plan. Present unmatched eligible work and capped/failed generation in the action queue.
- Use occurrence_date for recurring-work term membership; a weather reschedule must not silently select a different financial agreement. Define handling for manually created nonrecurring visits explicitly.
- Posted financial corrections continue in QuickBooks. Voiding a draft or reallocating a future charge requires a separate audited operational action; never delete posted history or automatically reverse provider accounting.

## Proposed additive data/API shape

Reserve a migration only after approval. Candidate entities: service_agreement, fixed_charge_period and agreement_charge linking one prepared billing_draft to its stable source. Add reference columns only where required; avoid a second accounting ledger. Preserve recurring_service.billing_mode for compatibility, but require an explicit matching link at activation and make the agreement the authoritative financial terms for linked work.

Office endpoints should support list/detail, create draft, versioned edit, activation preview/activation, effective cancellation and successor renewal. Finance/management prepare drafts; dispatch can see necessary service terms without pricing mutation authority. Invited clients see only approved/published agreement scope for granted properties. Implement server authorization and private file access before portal exposure.

## Acceptance before release

Test concurrent/retried generation, fixed charges with skipped or paused visits, per-visit exclusion, month/year boundaries, rescheduled occurrence membership, partial-period explicit amounts, overlapping terms, cancellations, renewals, cap collisions with manual deposits/progress drafts, disconnected QBO and no automatic posting. Run a representative service→review→draft→staff approval→QBO sandbox reconciliation cycle before declaring the financial loop complete. Real QBO/provider/pilot gates remain outstanding.

## Decisions for orchestrator review

Confirm the additive entity names, ownership of financial terms versus legacy recurrence metadata, approved-estimate cap reuse, global lock order, source uniqueness keys, partial-period UX and scope of initial renewal/cancellation edits. Coordinate the existing commercial context/operational promotion so agreements can only attach after authorized promotion. No shared schema or financial endpoint changes are authorized by this proposal alone.
