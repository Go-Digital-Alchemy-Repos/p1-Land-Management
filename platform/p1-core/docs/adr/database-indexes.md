# ADR: Database Indexes & Foreign Key Constraints

**Status:** Accepted
**Date:** 2026-04-01
**Migration:** `migrations/0005_lazy_stone_men.sql`

## Context

The Core Platform application has grown to include a provider directory with filterable listings, direct messaging, events with recurrence support, and admin contact message management. While the schema had basic indexes (e.g., `idx_tp_visibility` on `is_approved, is_active`), several query patterns lacked index support, and one FK relationship was missing.

## Decisions

### 1. GIN Index on `therapist_profiles.specializations`

- **Index:** `idx_tp_specializations_gin` (GIN)
- **Query pattern:** `WHERE specializations @> ARRAY['CBT']::text[]`
- **Rationale:** The directory filter uses the `@>` (array-contains) operator on the `specializations` column. B-tree indexes cannot accelerate `@>` queries on arrays; GIN indexes are designed specifically for this. Without the GIN index, Postgres must do a sequential scan and unnest each row's array to check containment.
- **Selectivity:** Medium-high. Each provider has 1–10 specializations from a pool of ~50+ options, so individual filter values typically match 5–20% of rows.

### 2. GIN Index on `therapist_profiles.languages`

- **Index:** `idx_tp_languages_gin` (GIN)
- **Query pattern:** `WHERE languages @> ARRAY['French']::text[]`
- **Rationale:** Same as specializations — `@>` queries on array columns require GIN indexes. The directory allows filtering by language.
- **Selectivity:** High. Most providers list 1–3 languages, so filtering by a non-English language is highly selective.

### 3. Composite B-tree Index on `therapist_profiles` Directory Filter

- **Index:** `idx_tp_directory_filter` on `(is_approved, is_active, practice_mode, accepting_clients)`
- **Query pattern:** The standard directory listing always filters `is_approved = true AND is_active = true`, and optionally adds `practice_mode` and `accepting_clients`.
- **Rationale:** The existing `idx_tp_visibility` index only covers `(is_approved, is_active)`. Adding `practice_mode` and `accepting_clients` to a composite index allows the planner to satisfy the most common 4-column filter combination with a single index scan rather than an index scan + filter.
- **Selectivity:** The first two columns (`is_approved`, `is_active`) are boolean with low selectivity individually, but the combination of all four columns creates moderate selectivity. The leftmost prefix (`is_approved, is_active`) is also usable for queries that don't filter on `practice_mode`.
- **Note:** The existing `idx_tp_visibility` and `idx_tp_practice_mode` are retained for backward compatibility and edge-case queries.

### 4. B-tree Index on `direct_messages(sender_id, created_at)`

- **Index:** `idx_dm_sender_date`
- **Query pattern:** Fetching messages sent by a specific user, ordered by date.
- **Rationale:** Existing indexes cover conversation-based lookups (`idx_dm_conv_date`, `idx_dm_conv_read_sender`), but sender-based queries (e.g., admin viewing all messages from a user) had no index support.
- **Selectivity:** High. Each sender is a specific user, and the `created_at` column provides ordering.

### 5. FK Constraint on `events.parentEventId`

- **Constraint:** `events_parent_event_id_events_id_fk`
- **References:** `events.id` (self-referential)
- **Rationale:** The `parentEventId` column existed without referential integrity, allowing dangling references to non-existent events. Adding the FK ensures recurring event chains maintain valid parent references.
- **Pre-migration:** A cleanup query nullifies any orphaned `parentEventId` values before the constraint is added (non-destructive — no rows deleted).

### 6. B-tree Index on `events(status, visibility)`

- **Index:** `idx_events_status_visibility`
- **Query pattern:** `WHERE status = 'published' AND visibility = 'public'` — the standard public event listing filter.
- **Rationale:** Event listing pages filter by status and visibility. Without this index, the planner uses the `idx_events_date` index and then filters, which is suboptimal when most events are published/public.
- **Selectivity:** Low-medium for individual columns (most events are published/public), but the composite helps avoid a full table scan when combined with date ordering.

### 7. B-tree Index on `contact_messages(created_at)`

- **Index:** `idx_contact_messages_created_at`
- **Query pattern:** `ORDER BY created_at DESC` — admin message listing sorted by date.
- **Rationale:** The admin panel lists contact messages sorted by creation date. Without an index, this requires a full table sort.
- **Selectivity:** N/A (primarily used for ordering, not filtering).

## Future Indexing Suggestions

1. **GIN index on `blog_posts.tags`** — The `tags` column is a text array. If tag-based filtering is added, a GIN index would be needed (same pattern as specializations/languages).

2. **pg_trgm / tsvector for search** — The therapist directory search currently uses `ILIKE` with wildcards, which cannot use standard B-tree indexes. Adding `pg_trgm` GIN indexes or `tsvector` columns would dramatically improve search performance.

3. **Partial indexes for rare statuses** — If events rarely have `status = 'draft'` or `status = 'cancelled'`, a partial index like `CREATE INDEX ON events(date) WHERE status = 'draft'` could be more space-efficient than a full composite index.

4. **Index on `event_registrations(event_id, status)`** — For event capacity checks that filter by registration status.

5. **Index on `provider_applications(status)`** — For admin dashboard queries filtering applications by status.

## Consequences

- All changes are additive; no existing indexes are removed or modified.
- Write performance has a negligible impact since the new indexes are on tables with low write volume relative to read volume.
- The GIN indexes add ~8KB per 1000 rows of overhead, which is minimal.
- The FK constraint on `parentEventId` means inserts/updates to that column will now validate against existing event IDs, which is the desired behavior.
