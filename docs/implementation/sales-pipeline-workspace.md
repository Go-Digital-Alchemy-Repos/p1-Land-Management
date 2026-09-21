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
still held. The pre-promotion rollback source was `0377fcfa`.

The scoped Sales navigation/presentation release was accepted and deployed in
`eb550fbb2f351f70a488a54ee0a1547849fef9f7`. Railway deployment
`0d647d4d-7cfc-448d-80d0-c5468b13f512` reached SUCCESS for Dashboard. Fresh
production browser verification confirmed the direct `/sales/pipeline` deep
link, the four-item Revenue navigation, Overview/Pipeline deep links and active
states, real inquiry rendering, non-mutating card tool open/close behavior, and
390px single-column layout without document overflow. This accepts only the
Sales navigation/presentation slice; it does not accept CRM write ownership,
cutover, device workflows, restore/recovery, or any broader release gate. A
rollback is a normal reviewed revert; no data migration is needed.
