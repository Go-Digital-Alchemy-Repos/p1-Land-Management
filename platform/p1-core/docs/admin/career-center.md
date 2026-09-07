# Career Center

Open this area under **Content** in the admin navigation.
The Career Center manages public job listings, applications, resume intake, job-board integrations, and internal hiring workflow. It is feature-gated so sites can disable careers without removing stored jobs or applications.

## Primary Surfaces

| Surface                | Path                   | Purpose                                                                        |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| Public careers archive | `/careers`             | Searchable and filterable job listing.                                         |
| Public job detail      | `/careers/:slug`       | Job description and application form.                                          |
| Public API             | `/api/careers/*`       | Settings, filters, jobs, applications, and partner endpoints.                  |
| Admin careers          | `/admin/careers`       | Job management, application review, settings, integrations, and resume access. |
| Admin API              | `/api/admin/careers/*` | Admin job/application CRUD and settings.                                       |

The module is controlled by the `careers` site feature flag.

## Job Lifecycle

Jobs are stored in `shared/schema/careers.ts`.

Key lifecycle fields:

- `status`: draft/published/archive-style state.
- `visibility`: controls whether a job appears publicly.
- `publishedAt` and `closesAt`: used for timing and display.
- `employmentType`, `workMode`, `department`, and `location`: used by filters and feeds.
- Salary fields and application instructions: used for public job detail.

Admin create/update routes generate unique slugs, validate enum values, normalize blank strings, and dispatch career webhooks.

## Application Intake

Public applicants submit through `/api/careers/jobs/:slug/apply`.

Application rules:

- Resume is required.
- Accepted resume types are PDF, DOC, and DOCX.
- Maximum resume size is 5 MB.
- Resume storage uses R2 when configured and local `uploads/career-resumes` fallback otherwise.
- Applicant and admin notification emails are sent asynchronously.

Admin application review supports status changes, notes, resume download, and webhook dispatch.

## Integrations

Career settings live in the `career_center` settings category.

Supported integration controls include:

- Indeed XML feed at `/api/careers/feed/indeed.xml`
- Indeed Apply readiness endpoint
- ZipRecruiter inbound apply readiness endpoint
- LinkedIn partner metadata
- Generic signed webhook dispatch
- Google indexing setting placeholder

Secrets are only returned when service code explicitly requests `includeSecrets`.

## Related Files

- `client/src/features/public/careers-page.tsx`
- `client/src/features/public/career-job-detail-page.tsx`
- `client/src/features/admin/careers-page.tsx`
- `server/routes/careers.routes.ts`
- `server/routes/admin/careers.routes.ts`
- `server/services/careers.service.ts`
- `server/storage/career.storage.ts`

The Content sidebar’s Careers submenu starts collapsed. Use its arrow button to expand or collapse the child links; select the Careers name to open its main page. Expansion is independent of the other content submenus and resets on a full reload.
