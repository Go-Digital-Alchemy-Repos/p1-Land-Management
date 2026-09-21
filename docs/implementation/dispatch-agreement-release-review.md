# Dispatch agreement permission release review

2026-09-21. Branch: `codex/dispatch-permission-release`, based on main
`4ea327747017a9f9ab77e4b3995bbbe9fc17df80`.

## Scope

Dispatch may read agreement scope/status but may not create, edit, activate, or
cancel agreements, even with an explicit Agreements grant. Other staff must
hold the explicit Agreements grant; Owner retains full access. Recurring-job
activation also requires Operations Recurring because it changes both the
recurrence and agreement state. Customer acceptance of immutable estimate
snapshots remains unchanged.

Independent review found that the Operations recurring activation endpoint
bypassed the original direct agreement guard. The correction centralizes the
server guard and applies it before input parsing or any database transaction
on both paths. The recurring activation button uses the same capability
predicate. Existing integration coverage now includes manager/finance lacking
Agreements and Dispatch with Agreements, asserting 403 and unchanged state.

## Evidence and release status

- Seven database-independent permission tests passed, including actual recurring
  activation service rejection before parsing/database access.
- API and Dashboard type checks and builds passed after the bypass correction.
- Independent read-only patch review accepted the guard and UI changes.
- Browser fixture review confirmed Dispatch read-only details and Manager edit/activation controls; no production mutation was made.
- Prior direct agreement HTTP (12) and browser (20) checks passed before this
  correction. They are historical evidence, not a fresh integration run.
- Fresh database/HTTP coverage of the new recurring activation boundary has
  **not run**: local Docker containerd reports an input/output error and the host
  has approximately 1.1 GiB free. Existing containers/data were preserved.
- Production promotion remains held until that integration gate passes and
  independent patch review is accepted. No production role or account was changed.

Main at this checkpoint remains `4ea32774`; all three Railway services were
verified successful at that revision. CMS lifecycle integration, remaining
consolidation/QA, owner inbox receipt confirmation, provider recovery gates,
and Search Console access/submission remain separate unfinished work. Do not
submit indexing before the overall QA gate passes.

## Live public HTTP audit — 2026-09-21 12:25 UTC follow-up

Read-only requests checked all 54 URLs in the production sitemap. Every page
returned successfully without redirects, declared its own canonical URL, and
had no noindex directive. None contained the three previously reported editorial
annotation strings. All 75 unique same-origin image URLs found in server-rendered
`img` elements returned HTTP 200 with an image content type.

This verifies HTTP/metadata and those image resources, not visual layout,
client-rendered/lazy-only assets, full accessibility, or complete browser journeys.
No forms were submitted, no additional notification was sent, and no indexing
request was made. Main remained `4ea32774`. Disk space remained approximately
1 GiB and Docker image inventory still failed with a containerd I/O error; the
fresh database integration release gate remains blocked.
