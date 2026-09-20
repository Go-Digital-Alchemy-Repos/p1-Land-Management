# Joined crew browser / real API acceptance fixture

This fixture is disposable and local. Browser actions must be performed using CUA;
the launcher does not invoke Playwright, CDP or browser shell automation.

From the repository root (dashboard must already be built):

```sh
python3 scripts/consolidation/crew-joined-fixture.py run
```

The launcher verifies a local Docker endpoint and the pinned already-local PG18
image, provisions a fresh `p1_crew_joined_fixture` database bound only to127.0.0.1,
runs actual dashboard migrations and starts a thin loopback-only HTTP fixture using
real product routers. Only synthetic environment values are passed. No provider
credentials, production data, federation retention or delivery worker is loaded.
A private temporary directory holds control metadata and logs (0600).

Seeding creates one per-visit composition through existing composition/pricing
services. Real HTTP preparation, outbox-only issuance, public approval, activation
and office scheduling produce a Scheduled crew visit. Billing is asserted blocked
before execution. Open the printed `/__fixture/crew` URL to install the synthetic
crew cookie and enter My Day. This login shortcut exists only in this fixture.

## Browser journey

1. Download My Day. Confirm the visit is Scheduled and Start work is available.
2. Interrupt connectivity using browser controls if available. Alternatively run
   `python3 scripts/consolidation/crew-joined-fixture.py offline PRIVATE_DIRECTORY`.
   This **simulates API unavailability with503**, not browser offline mode: record
   that distinction in acceptance evidence. The static shell remains available.
3. Start work and save a completion entry. Reload and verify pending entries remain.
4. Reconnect (or run the command with `online`). Click Sync Now. The fixture forwards
   real events and deliberately returns503 after their first successful acceptance.
5. Click Sync Now again; the actual API must return identical replay receipts and
   the browser must clear acknowledged queue entries. An empty sync should do nothing.
6. Run `python3 scripts/consolidation/crew-joined-fixture.py verify PRIVATE_DIRECTORY`.
   This requires completed status, repeated batch IDs and one real field row per
   event; asserts completed-but-unreviewed billing is blocked; calls the real manager
   review endpoint; then checks identical billing preparation retry receipts.

Successful aggregate evidence is saved as `workflow-evidence.json`. It is backend
verification, not proof that each browser action was observed. Parent CUA notes must
record actual interaction, queue UI and reload results separately. No external
accounting posting, photo recovery, quota eviction, device reboot, cancellation or
successor/change-order journey is established here.

The verification operation advances the fixture to reviewed/billed; run it once
only after browser review. It is not an idempotent fixture-control command.

## Cleanup

```sh
python3 scripts/consolidation/crew-joined-fixture.py stop PRIVATE_DIRECTORY
```

The supervisor verifies its PID command before receiving SIGTERM. It stops the API,
removes its owned database container/volume, and records `cleanup.json`. Private
control metadata stays local and must never enter Git. A server assertion returns
only a generic error; logs are private. An API-outage toggle never drops or edits
stored field events.

## Validation

`node --test scripts/consolidation/crew-joined-ack.test.mjs` exercises first-accepted
response interception, error/conflict/empty-response handling, stable IDs and
independent fixture instances. Python compilation validates the launcher. The
actual local startup already completed migrations, approval, visit generation,
scheduling and pre-review billing denial. Joined CUA acceptance is a separate gate.

## Browser-discovered refresh defect

Parent CUA found that saving a Start work event during API503 removed assignments:
`navigator.onLine` remained true, so refresh discarded downloaded work in its error
branch. The bounded dashboard fix retains only downloaded My Day work for explicit
transient HTTP statuses, with an outage/stale notice. It re-reads the account cache
after failure and rechecks refresh generation; observed access failures never fall
back. Parallel load failures are settled before selecting an error, so an earlier503
cannot hide a concurrent401/403. Three focused tests, dashboard typecheck and build
passed. The joined browser journey must be repeated against the rebuilt shell.

Fresh September 19 CUA rehearsal on loopback port57934 passed the strengthened
verifier: exact stored event IDs matched both submitted batches and both receipts
reported accepted status. Two queued entries survived reload; the deliberately lost
acknowledgement kept them queued until replay cleared them. Manager review and
billing receipt retry passed. This supersedes the older port55533 verifier limit.

## Work-order cancellation while crew is disconnected

Use a fresh fixture; do not reuse the completed/billed happy-path fixture.
Download the assignment, run `offline PRIVATE_DIRECTORY`, then
`cancel-work PRIVATE_DIRECTORY`. The latter uses the actual office status API.
The fixture's synthetic manager session remains reachable while crew API requests
receive503, representing independent office connectivity. No production behavior
or authorization is changed.

In CUA, queue Start work and a completion submission, then run `online` and Sync
Now. Both entries must remain pending with the office-review message. Reload and
sync again. `verify-cancelled PRIVATE_DIRECTORY` checks exact event IDs, two stored
conflicts, identical conflict receipts, unchanged Cancelled status, no charge and
billing denial. It writes private `cancellation-evidence.json`. Confirm that a new
download and sign-out cannot discard these entries. Stop the fixture afterward.

September19 actual CUA run at loopback58914 passed this sequence and the database
verifier. It simulates crew API503; it is not physical offline or agreement-term
cancellation. Office resolution and subsequent safe queue clearance remain open.

## Record-only office resolution rehearsal

After the cancellation sequence, navigate the fixture browser to
`/__fixture/office`. Review both entries in Schedule and record explicit notes.
Return through `/__fixture/crew`, sync and check zero pending entries and safe
sign-out. `verify-resolved PRIVATE_DIRECTORY` checks both original conflicts are
preserved, both office reviews exist, cancelled status remains and no charge was
created. The office route is synthetic loopback-only fixture authentication, never
part of production. Browser completion is a separate gate from this verifier.
