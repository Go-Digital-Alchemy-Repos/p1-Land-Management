# Populated upgrade rehearsal

Run `python3 script/verify-populated-upgrade.py --output /tmp/core-populated-upgrade.json` from a checkout with candidate Node dependencies installed. Python 3.9+, Node, npm, Git, tar and a local Docker Unix socket are required. The baseline defaults to pinned commit `f09e9d4199ffca634c0bc1df5c4e48d3c63bb762`; `--baseline` permits an explicitly selected alternative revision.

The script archives the baseline source into a temporary directory and installs its exact lockfile dependencies with package lifecycle scripts disabled. This matters because the baseline and candidate use different Drizzle versions. It invokes each revision's actual `runMigrations()` with that revision's working directory and dependencies. The migration-only processes use test mode and a loopback PostgreSQL connection; this rehearsal does not replace the separate compiled production/TLS startup gate.

A uniquely named disposable PostgreSQL 16 container exposes only a random loopback port. It receives generated synthetic credentials. No application environment files, providers, production URLs or existing databases are used. Two fresh databases each receive the baseline schema and synthetic settings, a form/submission and linked CRM lead/note, a paid order, customer, product, variant and paid inventory adjustment.

The clean database then runs candidate migrations twice. Every original column and seeded row is compared with the baseline snapshot, including historical timestamps and JSON. Newly created form and ecommerce effect tables must remain empty: historical records are not automatically replayed. Rolled-back SQL assertions exercise paid-inventory uniqueness, permitted manual corrections, form submission idempotency, per-submission effect deduplication, queued defaults, status validation, timestamp types and cascade behavior.

The second database receives two preexisting paid adjustments for the same order/variant. Candidate migration must reject the paid-effect unique index, while preserving both records and all seeded legacy data. This is an expected release-blocking condition, not successful automatic reconciliation. Earlier additive schema reconciliation may already have run before this rejection; the complete migration runner is not one global transaction. The fixture does not establish whether production contains duplicates.

The JSON report identifies source revision, candidate runner hash, data counts and outcomes. Commands have bounded timeouts; SIGINT/SIGTERM enter cleanup, removing only the owned container and its anonymous volume. Temporary source/dependencies are removed automatically. Cleanup failure fails the gate. A runner's forced kill can bypass cleanup and requires checking that run's uniquely named container.

All preservation and negative-result checks use explicit exceptions and remain enabled under
`python3 -O`. Cleanup responsibility is registered before Docker creation starts. If container
inspection fails, cleanup accepts absence only after a successful daemon inventory confirms
the exact generated name is absent; a daemon failure fails cleanup and the gate.
