# Portfolio Projects

The portfolio module publishes selected work, case studies, outcomes, or project galleries. It is feature-gated independently from CMS pages so a site can enable or disable portfolio behavior without deleting project records.

## Primary Surfaces

| Surface            | Path                                           | Purpose                                                                   |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------- |
| Public archive     | `/portfolio`                                   | Searchable/filterable list of published projects.                         |
| Public detail      | `/portfolio/:slug`                             | Published project detail page.                                            |
| Public API         | `/api/portfolio/*`                             | Settings, filters, project listing, and project detail.                   |
| Admin project list | `/admin/portfolio`                             | Manage project records and filters.                                       |
| Admin editor       | `/admin/portfolio/new`, `/admin/portfolio/:id` | Create or edit portfolio projects.                                        |
| Admin settings     | `/admin/portfolio/settings`                    | Configure archive labels, layout, filters, sharing, and default CTA copy. |

The module is controlled by the `portfolio` site feature flag.

## Data Model

Portfolio projects live in `shared/schema/portfolio.ts` and are accessed through `server/storage/portfolio.storage.ts`.

Important fields:

- `title`, `slug`, `summary`, and rich project body fields for display.
- `status` and `visibility` to separate draft/admin-only work from public records.
- `industry`, `category`, and `location` for archive filters.
- `featured`, `sortOrder`, and date fields for curation.
- CTA fields for project-specific next actions.

Admin writes normalize blank strings to `null`, coerce date fields, generate unique slugs, and validate enum values before persistence.

## Public Behavior

Public project listing supports:

- keyword query `q`
- industry filter
- category filter
- location filter
- featured-only mode
- bounded `limit` up to 48 records

Only public projects should be returned from public endpoints. Project detail lookup uses slug, not id.

## Settings

Portfolio settings are stored in the `portfolio` settings category and parsed by `portfolioSettingsSchema`.

Settings include:

- archive layout and archive heading copy
- labels for project/projects
- search/filter visibility
- sharing controls
- default CTA label and URL

## Related Files

- `client/src/features/public/portfolio-page.tsx`
- `client/src/features/public/portfolio-detail-page.tsx`
- `client/src/features/admin/portfolio-page.tsx`
- `client/src/features/admin/portfolio-editor-page.tsx`
- `client/src/features/admin/portfolio-settings-page.tsx`
- `server/routes/portfolio.routes.ts`
- `server/routes/admin/portfolio.routes.ts`
- `server/services/portfolio.service.ts`
