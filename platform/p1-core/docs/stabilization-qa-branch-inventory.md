# Stabilization QA Branch Inventory

Date: 2026-06-12

## Active Branch

- `codex/event-participation-main`
- Tip at release reconciliation start: `ffa2623` (`Polish developer nav and portfolio cards`)
- `origin/main`, `origin/codex/event-participation-main`, and local `main` were aligned before the content cleanup commit.

## Safe Local Cleanup

- Ran `git fetch --prune`.
- Local branches before cleanup: 95.
- Local branches after cleanup: 4.
- Deleted only local branches already merged into `origin/main` and not checked out by a worktree.
- No worktree-bound local branches refused deletion during this cleanup.

## Remaining Local Branches

- `codex/event-participation-main` — active stabilization/release branch.
- `main` — fast-forwarded to `origin/main`.
- `codex/collapsible-admin-nav` — unmerged; needs human review.
- `codex/live-sync-main` — unmerged; needs human review.

## Worktrees

Detached deployment worktrees remain under `/private/tmp/core-platform-*`. They are detached at historical deployment commits and do not hold local branch refs.

## Organization Guardrails

- Public pages live under `client/src/features/public`.
- Admin app surfaces live under `client/src/features/admin/<app>` when a feature has meaningful size, such as `cms` and `ecommerce`.
- Storefront ecommerce lives under `client/src/features/ecommerce`.
- Feature-local helpers should stay in the owning feature folder; shared UI belongs in `client/src/components/shared`, and design primitives stay in `client/src/components/ui`.
- Optional installable apps should be gated at route mount boundaries on the server and at route/nav boundaries on the client.
