# Office review of stale field entries

Implementation checkpoint — not released or accepted end-to-end.

## Behavior

Schedule exposes unresolved field entries to staff with `operations.schedule`.
The reviewer reads the original payload and records a required decision note,
then explicitly confirms a record-only resolution. This does not apply stale
work, change work status, modify checklists, or authorize billing. The original
field event remains unchanged and marked as a conflict. Resolution records are
append-only; the same actor and identical note may retry without duplicate audit
records. A different decision receives a conflict response.

The original submitting user may retrieve a resolved receipt only for the exact
original event tuple (ID, user, work, kind, payload, version and capture time).
This narrow receipt remains available after reassignment without granting access
to that work order or the office decision note. The crew reconciles batches of
100 before attempting photo uploads, so unrelated denied uploads cannot retain
already-reviewed event copies. Unconfirmed entries remain on the device.

## Release ordering and rollback

Apply dashboard migration `0047_field_conflict_resolution.sql` before releasing
the dashboard API; application startup does not apply it automatically. Keep the
additive table and its history when rolling back application code. Do not delete
reviews or rewrite original events. Existing clients retain conflicts until they
refresh to the new client; this is safe but does not clear their queue.

## Evidence and remaining gate

- Five actual mounted HTTP/PostgreSQL replay tests passed, zero skipped, including
  authorization, same-decision retry, exact tuple/author receipts after reassignment,
  cancelled status/billing preservation and append-only enforcement.
- Three React/client tests passed: explicit confirmation before submitting,
  immutable uncertain-decision retry, receipt batching across 205 events, rejection
  of foreign/duplicate/non-resolved receipts, and preservation after request failure.
- Dashboard/API typechecks and dashboard build passed. Dashboard typecheck/build
  were rerun successfully after the inline confirmation change.
- Fresh production Dashboard archive SHA256:
  `04c1d871c454d0562aed77cd6049621e7af5e793a74511f422dc22711edeec74`.
  Isolated PostgreSQL18 restore baseline: 84 tables, 155 rows, 50 ledger entries.
  Applying only0047 produced85 tables/51 ledger entries with original business rows
  preserved. Migrated second restore matched schema, rows and sequences. Database
  container/volume cleanup verified. Private evidence remains outside Git.
- Actual loopback CUA rehearsal on port59215 reached two queued conflicts and
  displayed both in the office panel. Native confirmation stalled browser control;
  no resolution/crew-clearance claim is made. The cancellation verifier returned500
  on this run (the second sync was immediately followed by navigation); do not count
  it as a passing replay verifier. Fixture cleanup passed. Earlier cancellation
  acceptance remains separately recorded in the acceptance tracker.
- The new review confirmation is now inline and its focused test passes. Repeat
  the entire browser journey through office review, crew sync and successful safe
  sign-out; verify preserved events/cancelled status/no charges before production.

This does not complete photo reconciliation, physical device offline/eviction,
agreement cancellation/change-order acceptance, or retained-admin retirement.
