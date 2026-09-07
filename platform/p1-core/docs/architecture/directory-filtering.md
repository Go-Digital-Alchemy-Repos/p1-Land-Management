# Therapist Directory — Filtering & Pagination Design

## Overview

The therapist directory is the primary public-facing feature. It allows users to search and filter therapists by multiple criteria with paginated results.

## API Endpoint

`GET /api/therapists` — accepts query parameters validated by `therapistSearchSchema` (Zod).

### Supported Filters

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Free-text search against name, title, city, country, specializations, and languages (via `ilike` and array `EXISTS` subqueries) |
| `specialization` | string | Comma-separated specialization IDs |
| `practiceMode` | string | Practice mode filter |
| `language` | string | Language filter |
| `country` | string | Country filter |
| `acceptingClients` | boolean | Only show therapists accepting new clients |
| `willingToTravel` | boolean | Only show therapists willing to travel |
| `page` | number | Page number (1-based) |
| `pageSize` | number | Results per page |
| `sort` | string | Sort order |
| `latitude` | number | User latitude for distance-based sorting |
| `longitude` | number | User longitude for distance-based sorting |

## Server-Side Implementation

**File**: `server/storage/therapist.storage.ts` → `listProfilesPaginated()`

The storage method builds a dynamic Drizzle query with:

1. **Base filter**: `isApproved = true AND isActive = true` (only show approved, active therapists)
2. **Text search**: Uses `ilike('%term%')` against concatenated first/last name, title, city, country, plus `EXISTS` subqueries on `specializations` and `languages` array elements
3. **Filter conditions**: Each filter adds an `AND` clause via Drizzle's `and()` / `eq()` / raw SQL array containment
4. **Specialization filter**: Uses `@> ARRAY[...]::text[]` containment operator on the `specializations` text array column
5. **Pagination**: Offset-based (`LIMIT`/`OFFSET`) with total count query
6. **Join**: Returns `TherapistWithUser` by joining `therapistProfiles` with `users`

### Additional Endpoints

- `GET /api/therapists/filters` — Returns available filter options (languages and countries) by querying distinct values from active, approved profiles
- `GET /api/therapists/featured` — Returns featured therapist profiles
- `GET /api/therapists/:id` — Returns a single therapist profile with user data

## Client-Side Implementation

**File**: `client/src/features/directory/directory-page.tsx`

- Filter state managed in component state
- Debounced search input (prevents excessive API calls)
- TanStack Query with pagination parameters in query key
- Map toggle for geographic view
- Filter sidebar with checkboxes and dropdowns

## Scalability Notes

- Current `ilike` text search is adequate for <5k profiles
- For >5k profiles, consider: `pg_trgm` trigram indexes, `tsvector` full-text search columns, or external search service
- Composite index `idx_tp_directory_filter` on `(isApproved, isActive, practiceMode, acceptingClients)` covers the most common filter combination
- Separate indexes exist for `country` (`idx_tp_country`) and `visibility` (`idx_tp_visibility` on `isApproved, isActive`)
- GIN indexes on `specializations` and `languages` array columns enable efficient array containment queries
- Cursor-based pagination is a future consideration for very large result sets
