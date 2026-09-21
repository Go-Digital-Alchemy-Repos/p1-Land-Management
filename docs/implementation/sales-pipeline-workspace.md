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

This is a review candidate, not production acceptance. Full build and browser
workflow verification remain pending. The local machine has approximately 1.1
GiB free and Docker containerd reports storage I/O errors; no dependency installs,
Docker pulls or destructive cleanup were performed. Current production remains
`0377fcfa`. The separate Dispatch/CMS branch is not included in this candidate.

Before promotion, integrate then-current main, complete remaining validation,
preserve a rollback source revision and verify the deployed SHA and live Sales
tabs. A rollback is a normal reviewed revert; no data migration is needed.
