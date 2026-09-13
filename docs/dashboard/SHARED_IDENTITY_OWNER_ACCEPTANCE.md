# Shared CMS and Dashboard owner acceptance

This is the designated P1 owner’s final staging acceptance script for shared identity. It verifies a real browser journey with a P1-controlled account. It is not a production setup, deployment, account-recovery workaround, or approval to merge the draft release.

## Preconditions

- Use the isolated staging services only:
  - Dashboard: `https://p1-dashboard-federation-staging-staging.up.railway.app/`
  - CMS: `https://p1-core-federation-staging-staging.up.railway.app/admin/login`
- The owner uses a staging-only invited account and chooses their own password. Do not reuse a production password, setup code, recovery code, session cookie, or MFA seed.
- The invitation and any synthetic lead/property/availability fixtures are created by the project operator and clearly labelled as staging data. They must not send customer email, calendar invitations, SMS, provider requests, or public CMS content.
- The dashboard account must have the owner role, verified email, MFA enrollment, and an assured current browser session. The Core account must have the intended CMS owner/editor permission before the explicit link is confirmed.
- Capture only the route, status and visible pass/fail result. Do not record passwords, tokens, recovery codes, raw intake, customer data, QR values, or private preview URLs.

## Shared-identity flow

1. Sign in to the staging dashboard and complete MFA. Confirm the normal authenticated dashboard shell appears; sign out and sign in once more to confirm the session is not a setup artifact.
2. Open the staging CMS login route. Confirm it shows **Sign in with P1 Dashboard**, then use that entry point.
3. Complete the S256/PKCE browser handoff. If Core presents an explicit account-link confirmation, review the two identities and choose **Confirm this account link** only when both belong to the designated staging owner. Matching email alone is not approval.
4. Confirm the browser returns to `/admin`, a protected CMS route is accessible, and the CMS displays the linked owner’s intended local permission. Verify the dashboard and CMS remain separate shells while using the same canonical credential authority.
5. In CMS, create a labelled draft-only change on a staging-only page. Confirm an authenticated preview renders it, an anonymous preview is denied, the draft’s public route remains unavailable, and discard or restore the draft afterward.
6. Sign out of Dashboard, then refresh the existing Core page. It must fail closed. Sign in again and confirm the Core access resumes only after the normal Dashboard/MFA flow.

## Commercial assessment flow

1. Return to the authenticated Dashboard and open the labelled staging commercial inquiry with its linked **prospect** property.
2. Create a private assessment baseline, add one finding and recommendation, save, reload, and mark it reviewed. Confirm the data stays within the Commercial Inbox and does not appear in operational property, client, crew, dispatch, billing, map, or public views.
3. Load the labelled available time, reserve it, reload, and confirm the appointment is visible as confirmed. It must not create a client, proposal, work order, invoice, dispatch record, or public event.
4. Verify archive is refused while the appointment is confirmed. Cancel with a labelled reason, reload, confirm the cancellation history remains, and verify the time becomes available again. Archive only if the fixture is no longer needed.
5. Confirm keyboard focus, form labels, validation/error feedback, and the normal dashboard header/sidebar remain usable throughout.

## Pass criteria and next gate

Pass requires every stated expected result, no browser JavaScript error, no customer/provider side effect, and an exact record of the staging deployment/source tested. A failure records the observed route/status and stops the promotion path until a compatible fix is reviewed.

After owner acceptance, the draft PR may be reviewed for merge. Only after the resulting approved `main` revision is known may the separate production backup/rollback rehearsal begin. Federation remains disabled in production until that exact-revision recovery gate and an explicit production release decision are complete.
