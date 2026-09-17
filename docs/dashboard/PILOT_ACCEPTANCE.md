# P1 dashboard pilot acceptance

This runbook is for the controlled pilot after deployment. Record the date, tester, account/property identifiers, outcome and any remediation in the project issue tracker; do not place passwords, recovery codes, OAuth tokens, customer photos or payment data in the record.

## Entry conditions

- Production web, worker and database are healthy. `/api/healthz` returns `200` with `Cache-Control: no-store`.
- The completed production installation remains closed (`/api/v1/setup` returns `initialized:true` and `configured:true`).
- A current database backup and active PITR coverage are visible in Railway.
- Pilot records are real, approved business records or clearly labelled synthetic records. Use a limited staff group, one crew and a small invited-client group.

## Owner and role acceptance

1. The owner signs in, enrolls an authenticator factor, stores recovery codes outside the dashboard, signs out and completes one recovery-code verification.
2. Invite one representative each for management, dispatch, sales, finance, crew and client. Confirm invitation expiry and revoke one unused invitation.
3. Confirm server-enforced boundaries: a crew member sees only assigned work, a client sees only granted properties and published content, and finance actions remain unavailable to non-finance roles. Include direct URL and private-file access attempts.
4. Revoke one pilot session, then confirm that the browser and native client lose access and cannot re-establish an offline session without successful authentication.

## Provider acceptance

### QuickBooks Online

1. Configure the approved sandbox connection and connect it as the owner. Confirm the OAuth callback binds one realm and rejects a duplicate or changed realm.
2. Preview customer matching before importing. Quarantine an intentionally unmatched record; do not create clients or properties from import.
3. Prepare and review one billing draft, post it to the sandbox, then verify the QuickBooks invoice number, balance and payment state synchronize back through webhook/reconciliation.
4. Exercise a delayed webhook, partial payment, credit and disconnected authorization. Confirm the office action queue records each ambiguous or failed case and that no browser redirect marks an invoice paid.
5. Repeat with production credentials only after the sandbox evidence is accepted. A payment link is eligible only when QuickBooks Payments has approved it.

### Email and SMS

1. Send a single approved transactional email to a staff-controlled address and verify provider delivery plus the dashboard delivery record.
2. Complete Twilio sender and A2P registration, configure signed callbacks, and record explicit pilot opt-in before sending a test SMS.
3. Verify STOP, HELP, opt-out suppression, duplicate prevention and a failed-delivery retry. Do not use a customer or automated invoice send as the first test.

## Field-device acceptance

Run the same crew account on a physical iPhone and Android phone. The existing iOS export and native automated suite are build evidence only; this sequence proves field operation.

1. Install the web app, sign in and use **Download My Day** while online. Confirm assigned instructions, checklist and offline-readiness status are available after restart.
2. Disable connectivity. Capture a time event, note, issue and before/after photo. Confirm the pending count remains visible and no data disappears after application restart.
3. Reconnect, select **Sync Now**, and confirm each receipt appears once in the office review queue. Interrupt one photo upload, retry it, and verify the original capture/operation identity is retained.
4. While the phone is offline, change or cancel its assignment from dispatch. Reconnect and confirm the conflict is preserved for review rather than overwritten.
5. Test low-storage and sign-out behavior. The app must warn before discarding pending work, isolate data by account, and clear its cache after a completed ordinary sign-out. Record the product limitation that remote revocation cannot instantly erase an offline device cache.

## Service and billing cycle

1. Create or select a permitted client/property, complete an assessment, accept one estimate revision, and create a service schedule with a prerequisite.
2. Confirm an unmet prerequisite blocks dispatch; record a management override only when appropriate. Reschedule and skip occurrences, checking that the recurrence remains intact and billing follows the agreement mode.
3. Complete work from the crew device. A manager reviews it, then explicitly publishes only approved notes/photos/report material. Confirm unpublished material is absent from the client portal.
4. The invited client views the published schedule/report, requests a change, approves the accepted estimate, and views the reconciled invoice/payment status.
5. Run a worker recurrence/preparation cycle. Confirm it creates reviewed operational drafts only and does not send an invoice, charge a card, post accounting activity or publish crew content without an explicit staff action.

## Exit decision

Accept a wider release only when every test has evidence, provider discrepancies are resolved, backup/object-recovery and alert ownership are rehearsed, and the owner approves the pilot outcome. Keep an unresolved result in the office action queue or project tracker; do not bypass an authorization, prerequisite, financial reconciliation or publication boundary to finish the pilot.
