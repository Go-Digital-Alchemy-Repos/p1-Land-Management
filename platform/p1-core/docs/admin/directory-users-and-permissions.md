# Directory, Users & Permissions

The directory is both a public search product and an admin-managed provider database. User management controls internal admins/editors, while directory profile records control public listing visibility.

## Public Directory

Public endpoints:

- `GET /api/therapists`
- `GET /api/therapists/filters`
- `GET /api/therapists/featured`
- `GET /api/therapists/:id`

Supported search inputs include keyword, specialization, practice mode, language, country, accepting clients, willingness to travel, pagination, sorting, and optional latitude/longitude.

Directory settings can require approved applications before profiles appear publicly. When that requirement is enabled, public listing/filter/detail queries only expose approved active profiles.

## Directory Profile Administration

Admin directory profile routes currently live under the legacy `/api/admin/therapists` path and require the directory permission.

Admins can:

- create listing-owner users and directory profiles
- approve or reject profiles
- update profile details, social handles, location fields, feature status, active status, and public visibility flags
- trigger approval/rejection email notifications

Profile images and media URLs are normalized through R2 public URL handling before being returned.

## System Users

Admin/editor user routes live under `/api/admin/users`.

Roles:

- `admin`: full admin role. At least one active admin must always remain.
- `editor`: limited internal role controlled by `adminPermissions`.

Editor permissions are currently:

- `directory`
- `content`
- `design`
- `crm`

Editors must have at least one permission. Admin users do not need explicit permissions.

## Form Notification Assignments

Internal users can be assigned active form ids in `formNotificationFormIds`. The user route normalizes these ids against currently active forms so stale or inactive form assignments are not retained.

## Operational Notes

- Do not bypass admin guardrails that protect the final active admin account.
- Directory profile location changes should flow through `therapist-location.service.ts` so latitude/longitude and related fields stay coherent.
- Public directory APIs should continue to normalize media URLs and respect directory settings.

## Related Files

- `client/src/features/directory/directory-page.tsx`
- `client/src/features/directory/therapist-profile-page.tsx`
- `client/src/features/admin/therapists-page.tsx`
- `client/src/features/admin/users-page.tsx`
- `client/src/features/admin/directory-settings-page.tsx`
- `server/routes/directory.routes.ts`
- `server/routes/admin/therapists.routes.ts`
- `server/routes/admin/users.routes.ts`
- `server/services/directory-settings.service.ts`
- `server/services/therapist-location.service.ts`
