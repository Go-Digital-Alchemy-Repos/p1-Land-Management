# Team content and reusable section

Content → Team manages website team members independently of user accounts. Content editors and admins can create and edit records when CMS is enabled. Each record contains a name, role/title, portrait URL, accessible photo description, full plain-text biography, optional excerpt, and draft/published/archived status. Portraits can be selected from the existing media library; their usage is included in media usage reporting.

Publish a member to make them available on the public website. Draft and archived members never appear in public Team responses or grids. Archive preserves the record and existing selections, so republishing restores the member in the same selected position. The public endpoint omits internal author and timestamp fields.

## Place a team on a page

1. Create and publish members under Content → Team.
2. Open a page in the builder and insert the reusable section named **Team**, or add the **Team** live block.
3. Select members in the Team Members control. Use its up/down buttons to set display order and remove buttons to deselect members.
4. Choose **Portrait Grid**, **Bordered Cards**, or **Horizontal Profiles**. Portrait/card grids support two, three, or four desktop columns, adapting down for smaller screens. Horizontal profiles use two columns on wide screens.
5. Set the heading and introduction, toggle roles/excerpts, and set excerpt length (40–500 characters). An empty custom excerpt falls back to the biography. Shared section styling and visibility controls work as for other builder blocks.
6. Save and publish the page through the normal workflow.

Portraits, names, and Read bio buttons open an accessible dialog with the full biography. A Team block with no selected published members displays no public content. Missing and unpublished selections remain visible to editors in the picker so they can resolve them. Member changes feed every section that selects that member; page-specific selection/order/layout remains stored in the page or reusable section's existing block JSON.

The starter named Team is created during system bootstrap. Existing Team sections are preserved. The starter library restore also creates Team if absent.

## Navigation

Events and Careers are now grouped under Content. Existing create/settings links, URLs, feature gates, and content permissions are unchanged.

## Data and rollout

Migration `0062_team_members.sql` adds `team_members` with a publishing-status index and nullable author references to users. It is additive and idempotent, registered in the Drizzle journal and legacy startup reconciliation. Apply it before serving the new application version; development databases provisioned with `db:push` also need this schema update. No existing content is converted or deleted, and no dependency is added.

For an application rollback, retain the new table and Team data. Older application versions cannot render the new block type: remove Team blocks from published pages or restore their earlier page revisions before rolling back. Do not drop the table as part of a routine rollback. Backups continue to use the platform's database backup process. Team records are retained until explicitly removed by a future approved data-retention operation; the UI offers reversible archiving.

## Validation

Unit tests cover navigation gates, selection order, publication filtering, URL validation, and excerpt behavior. Run `npm test -- shared/team.test.ts client/src/features/admin/admin-sidebar.test.ts server/__tests__/cms-media-usage.service.test.ts server/migrate.test.ts`.

For persistence and HTTP validation, provision a disposable local database with the current schema, then run `DATABASE_URL=... npx tsx server/tests/team.integration.ts`. This script writes test users/content, checks cookie authentication and content permissions, publication/archive visibility, validation, author field protection, audit records, and idempotent migration/starter creation. Never run it against production.

Team photos can be uploaded through the image dropzone (PNG/JPEG/WebP/GIF, up to 10 MB), replaced, or selected with the Media Library button. Full biographies use the CMS rich-text editor. Supported formatting is sanitized on save and public delivery; generated card excerpts omit markup. Existing plain-text biographies preserve line breaks when opened for editing. Embedded biography images participate in media usage tracking.
