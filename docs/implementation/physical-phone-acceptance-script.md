# Physical-phone acceptance script

Status: ready for Owner-led acceptance. This is a test protocol, not evidence that a
physical device, signed build, camera, OS storage or account recovery has passed.

## Scope and guardrails

- Use a non-customer QA work order and a non-sensitive test photo only. Do not
  capture a customer's property, person, address, document or credentials.
- Use a dedicated active crew test account that has one assigned QA work order.
  The current production account inventory has no active crew account; do not
  reactivate or create one as part of this script without explicit approval.
- Record device model, OS version, app/PWA version, browser (for PWA), network
  transition and the visible pending-count/result. Do not record passwords,
  recovery codes, account IDs, customer data or photo contents.
- Run the browser-PWA path on an actual iPhone or Android browser. Run the
  native path only from an approved development build; no signed distribution
  build or physical-device release evidence currently exists.

## A. Crew offline note and photo recovery

1. While online, sign in as the dedicated crew test account. Open **My Day**
   and download its assigned QA work. Confirm the work appears before going
   offline.
2. Add a short test note, make one checklist change, and capture one
   non-sensitive test photo. Do not press **Sync Now** yet. Confirm the pending
   operation/photo count increases.
3. Enable airplane mode. Fully close the browser/app, then reopen it and return
   using the *same account*.
4. Expected: the downloaded QA work and pending note/photo remain visible; the
   app never represents them as delivered. If the session has expired, it must
   lock rather than expose another account's work or discard pending work.
5. Restore connectivity and press **Sync Now** once. Expected: progress is
   ordinal-only; each item remains pending until acknowledged; the pending count
   reaches zero only after acknowledged completion.
6. Repeat step 2, start **Sync Now**, then use **Cancel current sync** while
   the photo is in progress. Expected: no later queued item starts, and every
   unacknowledged item remains pending for an explicit later retry.

Mark the test **fail** if a pending item vanishes, appears delivered without an
acknowledgment, is attached to another account/work order, is duplicated after
retry, or an offline restart exposes unassigned/customer data. Stop and retain
the visible pending count/status; do not recapture the photo as a workaround.

## B. Sign-out and same-account recovery boundary

1. After section A reaches a pending count of zero, sign out from the crew
   account.
2. Expected: sign-out completes only after all pending work is acknowledged and
   clears that account's local cache.
3. Sign back in as the same crew account online, download My Day again, and
   verify the QA work is server-authorized rather than restored as an old
   unverified cache.

Mark the test **fail** if sign-out succeeds while work is pending, the next
account can read the first account's cached work, or an expired/revoked session
continues to sync. A missing device encryption key with an existing native vault
must lock recovery; it must not create a replacement vault. Do **not** simulate
key loss by clearing app data during this acceptance test, because that can
destroy the very pending-work evidence under review.

## C. Owner phone login while MFA policy is deferred

Owner MFA enforcement is intentionally deferred for this checkpoint. Do not
enable, disable, enroll, reset or copy authenticator/recovery material during
this test.

1. On the Owner's phone, sign in using the existing Owner account and open the
   Dashboard overview, Sales Pipeline, and account profile.
2. Expected: the existing active Owner reaches normal Owner functionality. A
   recovery/enrollment screen must not be required solely because MFA policy is
   deferred.
3. Sign out and sign back in once. Expected: normal login works; no customer or
   crew cache is exposed.

Mark the test **fail** if login reaches an unexpected recovery/MFA lock, Owner
tools are denied, a session remains usable after sign-out, or the device exposes
another account's data. Capture the screen/state and report it; do not enter a
recovery code or change MFA policy to make the result pass.

## Completion record

For each section, report only: pass/fail/blocked; device and OS; browser/app
version; whether airplane-mode restart was performed; initial/final pending
counts; and a short non-sensitive error/status. A failure needs the preserved
pending count and whether it happened before or after reconnection. It does not
authorize deleting cached work, removing accounts, changing MFA, or deploying a
native build.
