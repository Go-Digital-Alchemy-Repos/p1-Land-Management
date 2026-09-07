# Editor Locks & Notifications

Editor locks and notifications are shared collaboration infrastructure for admin and editor workflows.

## Editor Locks

Editor locks prevent two internal users from editing the same resource at the same time.

API routes live under `/api/admin/editor-locks` and support:

- list active locks by resource type
- get lock for a resource
- acquire lock
- heartbeat lock
- release lock

Only admins and editors can use editor locks.

## Lock Timing

Defaults:

- heartbeat interval: 30 seconds
- lock expiry: 5 minutes

Expired locks are deleted before fresh lock reads. If the current user owns the lock, acquire/heartbeat refreshes expiry. If another user owns the lock, the response identifies the owner and the UI should switch to read-only or show a conflict banner.

## Lock Response Shape

Lock responses include:

- status
- resource type
- resource id
- whether the lock is owned by the current user
- lock owner name/id
- lock timestamps and expiry

Common statuses include acquired, locked by another user, and expired/available.

## Notifications

Notifications are authenticated user-level records mounted at `/api/notifications`.

Supported operations:

- list notifications for current user
- read unread count
- mark one notification read
- mark all read
- read/update notification preferences

Current notification preferences include email and in-app controls for new messages.

## Maintenance Rules

- Add editor lock coverage to new admin editors that autosave or mutate long-lived content.
- Release locks on close/unmount when possible, but rely on expiry for crash recovery.
- Use notification preferences before adding new email or in-app notification types.
- Avoid using notifications for audit logs; audit trails belong in module-specific storage.

## Related Files

- `server/services/editor-locks.service.ts`
- `server/routes/admin/editor-locks.routes.ts`
- `server/routes/notifications.routes.ts`
- `server/storage/editor-locks.storage.ts`
- `server/storage/notification.storage.ts`
- `client/src/hooks/use-editor-lock.ts`
- `client/src/hooks/use-lock-conflict-guard.ts`
- `client/src/components/shared/editor-lock-banner.tsx`
- `client/src/components/shared/notification-bell.tsx`
