# Calendar sample events

The owner-requested seed adds 238 sample events across September 2026 through August 2028, with 8–12 events per month, seven event types, and virtual, in-person, and hybrid delivery.

Preview without database access:

```sh
node server/scripts/seed-calendar-2026-2028.cjs
```

Apply to an authorized database with `DATABASE_URL` set in the environment:

```sh
node server/scripts/seed-calendar-2026-2028.cjs --apply
```

The script inserts within a transaction, verifies monthly counts, and skips existing slugs without updating existing events. Seed slugs start with `calendar-demo-2026-2028-`; tags include `calendar-demo-2026-2028`. Events are published publicly, identified as samples in their descriptions, and have registration disabled. Venue and joining details remain unconfirmed.

Production execution on September 6, 2026 inserted 238 events and preserved the existing event. The public `/api/events/all` endpoint returned 239 events, including all 238 samples across 24 months. This is a fixed demonstration dataset, not an automatically advancing schedule.
