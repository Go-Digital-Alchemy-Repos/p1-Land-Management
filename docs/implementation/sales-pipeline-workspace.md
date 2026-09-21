# Sales workspace candidate — September 21, 2026

The native Sales workspace keeps its existing Overview at `/sales` and adds a
Pipeline tab at `/sales/pipeline`. Revenue still shows only Sales, Agreements,
Billing and Expenses. Both Sales destinations use the existing Sales capability,
one pipeline settings provider, and the existing Owner settings editor.

The board uses the existing inquiry API and follow-up/details/notes/tasks/history
and onboarding components. It honors configured stage order, labels and colors.
Pagination retains existing cards on errors and ignores responses superseded by
refresh or unmount. A failed initial fetch does not claim the pipeline is empty.
No API, schema, provider, grant, CRM ownership, public image or layout changes
are included.

Root independently reviewed commits `a149a6c3` and `b935dbf4`, reran all five
board component tests and 17 route tests, passed Dashboard type checking, and
checked whitespace. Tests cover pagination/refresh races, unmount cancellation,
retry, deduplication, custom presentation settings and guarded sidebar routing.

Root also independently passed the Dashboard production build (3.62 seconds,
6.3 MiB output; existing large-chunk warning remains) and visually checked the
real board in the local synthetic fixture. Desktop scroll stays inside the
board without document overflow; 390px uses one column without overflow. Custom
stage labels/order/colors rendered correctly. The implementing agent verified
card open/close controls and an empty browser warning/error log. Fixture evidence
does not assert production authentication or write-flow acceptance.

The local machine has approximately 1.1 GiB free and Docker containerd reports
storage I/O errors. No dependency installs, Docker pulls or destructive cleanup
were performed. Small frontend validation was feasible using existing packages.
The separate Dispatch/CMS branch is excluded, with its database/browser gate
still held. Production deployment and a fresh read-only Sales check follow this
review; the rollback source is `0377fcfa`.

Before promotion, integrate then-current main, complete remaining validation,
preserve a rollback source revision and verify the deployed SHA and live Sales
tabs. A rollback is a normal reviewed revert; no data migration is needed.
