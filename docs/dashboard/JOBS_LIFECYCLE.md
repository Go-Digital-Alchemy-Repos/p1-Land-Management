# Jobs lifecycle

The product calls scheduled operational work a **Job**. The database retains
`work_order` as a compatibility implementation detail.

## Customer workflow

An office user can create a standalone estimate or generate one from a portal
or manually entered request. Draft estimates contain line items and expire 30
days after creation. Sending an estimate requires one or more active client
contacts with email notifications enabled. Each recipient receives a unique,
opaque link; only its SHA-256 hash is persisted.

The public link displays the estimate and a PDF, then requires an explicit
approve or decline action. Approval is exactly-once: a one-time estimate
creates one unassigned Job, while a recurring estimate creates one paused
Recurring Job and one accepted, draft service agreement. A request is marked
converted only after approval. Declining returns its request to estimating.

## Recurring Jobs and agreements

A recurring estimate snapshots a versioned agreement template, cadence,
term, and billing terms before client approval. Dispatch assigns a default
team member and first date/time, then activates the recurring program only
after the existing agreement activation checks pass. Activation unpauses the
program; the existing generator creates independent dated Job visits. Moving a
visit does not change the recurring rule.

## Shared Projects

Projects are staff-only containers. `project_client` and `project_property`
allow multiple participating clients and properties, but every Job still has
one property/client owner. Client portals never receive shared-project
membership or another client’s jobs, documents, estimates, agreements, or
billing data.

## Routes

- `POST /api/v1/estimates` creates a standalone estimate.
- `POST /api/v1/requests/:id/estimates` creates an estimate from a request.
- `POST /api/v1/estimates/:id/send` sends selected contacts.
- `GET /api/public/estimates/:token`, `/pdf`, and `POST .../decision` are the
  narrow public estimate surface.
- `GET /api/v1/recurring-jobs` and `POST .../:id/activate` operate recurring
  programs.
- `POST /api/v1/jobs/internal` is the reason-audited emergency exception.

The authenticated lifecycle, recurring-program, agreement-template, Project,
and Job projections are also published in
`lib/api-spec/dashboard.openapi.json`; the generated dashboard client is kept
in `lib/api-client-react/src/dashboard`.

## Targeted validation

With the isolated local dashboard fixture configured, run
`pnpm --filter @workspace/api-server test:dashboard:jobs`. It covers exactly-once
one-time conversion, post-decision and expiry token rejection, recurring
agreement snapshots, and pending activation. The normal request lifecycle
suite remains `pnpm --filter @workspace/api-server test:dashboard`.

Authenticated and public estimate responses are `no-store`; public tokens are
revoked after any decision, revision, or expiry.
