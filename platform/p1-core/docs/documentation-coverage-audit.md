# Documentation Coverage Audit

This audit compares the documentation library against the current platform surface. It should be updated whenever a major module, route group, or shared subsystem is added.

## Coverage Matrix

| Area                                                       | Runtime Surface                                                              | Documentation Status                                                                                                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| CMS pages, builder, media, menus, sidebars, SEO, redirects | `client/src/features/admin/cms`, `/api/cms`, `/api/admin/cms`                | Covered by admin guides and architecture docs.                                                                                          |
| Blog and insights                                          | public blog routes, CMS blog editor, comments service                        | Partially covered by blog workflow docs.                                                                                                |
| Events and registrations                                   | `/events`, `/api/events`, `/api/admin/events`                                | Covered by event admin docs.                                                                                                            |
| Ecommerce                                                  | shop/cart/checkout/account, `/api/ecommerce`, `/api/admin/ecommerce`         | Covered by architecture and admin docs.                                                                                                 |
| Forms and CRM intake                                       | `/api/forms`, `/api/admin/forms`, `/api/crm`, `/api/admin/crm`               | Covered by forms and CRM docs.                                                                                                          |
| Membership                                                 | `/membership`, `/api/membership`, `/api/admin/membership`                    | Added: `docs/admin/membership-access-and-subscriptions.md`.                                                                             |
| Portfolio                                                  | `/portfolio`, `/api/portfolio`, `/api/admin/portfolio`                       | Added: `docs/admin/portfolio-projects.md`.                                                                                              |
| Career Center                                              | `/careers`, `/api/careers`, `/api/admin/careers`                             | Added: `docs/admin/career-center.md`.                                                                                                   |
| Provider applications and vetting                          | `/therapist/apply`, `/api/therapist/application`, `/api/admin/applications`  | Added: `docs/admin/provider-applications-and-vetting.md`.                                                                               |
| Directory, therapist profiles, users, permissions          | `/directory`, `/api/therapists`, `/api/admin/therapists`, `/api/admin/users` | Added: `docs/admin/directory-users-and-permissions.md`.                                                                                 |
| Public search                                              | `/api/search`, navbar search, search results page                            | Added: `docs/architecture/public-search-and-discovery.md`.                                                                              |
| Editor locks and notifications                             | `/api/admin/editor-locks`, `/api/notifications`                              | Added: `docs/architecture/editor-locks-and-notifications.md`.                                                                           |
| System backups                                             | `/api/admin/system/backups`                                                  | Covered by `docs/system-backups.md`.                                                                                                    |
| R2 media and uploads                                       | `/api/uploads`, `/r2/*`, media docs                                          | Partially covered; future docs should split upload security, R2 fallback, and public media delivery into a dedicated architecture page. |
| Authentication and setup                                   | `/api/auth`, `/api/setup`, admin setup page                                  | Partially covered by ADR and security docs; a fuller auth operations guide is still useful.                                             |

## Gaps Filled In This Pass

- Membership plans, prices, subscriptions, access rules, entitlements, Stripe settings, and audit behavior.
- Portfolio archive/detail/admin/settings architecture.
- Career Center jobs, applications, resumes, settings, and job-board integration endpoints.
- Provider application lifecycle, references, background checks, interviews, payments, and admin review.
- Directory public search behavior, therapist administration, internal users, editor permissions, and final-admin guardrails.
- Public search scoring and source maintenance rules.
- Editor lock timing, conflict behavior, and notification preference responsibilities.

## Remaining Thin Areas

- Auth/session/password reset operations.
- Upload/R2 delivery, signed/private media conventions, and local fallback behavior.
- Email template catalog and delivery failure handling.
- Frontend edit mode and CMS preview operations.
- Observability, request metrics, and production incident triage beyond backup/deployment runbooks.

## Maintenance Rule

When adding a new feature app or route group, update at least one of:

- an admin guide in `docs/admin`
- an architecture page in `docs/architecture`
- a runbook in `docs/runbooks`
- this coverage audit

Then use `Sync System Docs` in the Developer Resource Center so the database-backed documentation library refreshes.
