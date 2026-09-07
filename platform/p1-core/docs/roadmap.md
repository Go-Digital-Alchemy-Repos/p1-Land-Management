# Next-Phase Roadmap

Recommended improvements for the next development wave, ordered by impact and feasibility.

> **Infrastructure decision — September 3, 2026:** Production was moved from Neon back to Railway Postgres. References below to a planned Neon migration are superseded and require a new owner decision before implementation.

> **Canonical product direction — September 3, 2026:** Follow the
> [Client Migration Master Plan](core-project-plan.md). Core Platform uses repeatable single-client
> deployments paired with separately built React sites. Multi-tenancy, Neon migration, and Next.js
> migration are out of scope for the Better Farms pilot unless separately approved.

---

## Superseded Architecture Exploration

The repository previously explored Next.js, Neon, and multi-tenancy sequencing. Those ideas are retained
as historical possibilities, not active phases. They must not displace the Better Farms manifest,
site/Puck integration, design adapter, module theming, migration, correctness, and deployment work in the
canonical plan.

See `docs/core-project-plan.md` for the approved sequencing and gates.

### Historical Order (Not Approved for Execution)

1. Refine and stabilize existing features while the current Vite/React + Express architecture is still familiar.
2. Move the existing Postgres/Drizzle setup to Neon before changing application framework.
3. Design the tenancy model before starting a full Next.js migration.
4. Implement tenant-aware backend, storage, auth, settings, uploads, integrations, and feature flags.
5. Migrate to Next.js once tenant boundaries are explicit, starting with public SEO-heavy pages if a phased migration is needed.
6. Add agent or automation features only after tenant isolation and core workflows are solid.

### Historical Rationale

- Neon is the lowest-risk architectural step because the app already uses Postgres and Drizzle.
- Next.js does not solve tenancy by itself; moving first could copy current single-tenant assumptions into a new framework.
- Tenancy affects data schema, auth, domains, settings, media, Stripe, email, analytics, background jobs, and admin permissions.
- Feature refinement should happen before the larger migration so the product target is clearer and less churn is carried into the rewrite.

### Reconsideration Rule

Any prototype or migration in these areas requires a separately approved objective, bounded branch, and
evidence that the current Better Farms path cannot meet the requirement safely.

---

## Phase 1: Full-Text & Faceted Search

**Priority**: High
**Effort**: Medium
**Dependencies**: None

### Goals

- Replace `ilike` text search with PostgreSQL full-text search (`tsvector` + GIN index)
- Add trigram indexes (`pg_trgm`) for fuzzy name/city matching
- Implement faceted search with count aggregates per filter (e.g., "CBT (12)", "EMDR (8)")

### Implementation Plan

1. Add a `search_vector tsvector` column to `therapist_profiles`
2. Create a trigger to auto-update the vector on INSERT/UPDATE
3. Add a GIN index on the search vector
4. Update `listProfilesPaginated()` to use `ts_query` for text search
5. Add a `/api/therapists/facets` endpoint returning filter counts
6. Update directory page UI to show counts on filter options

---

## Phase 2: Geo-Distance Ranking

**Priority**: High
**Effort**: Medium
**Dependencies**: Phase 1 (complementary, not blocking)

### Goals

- Rank therapist results by distance from the user's location
- Display distance on therapist cards
- Add "within X km" radius filter

### Implementation Plan

1. Add latitude/longitude columns to `therapist_profiles` (geocoded from city/country)
2. Use PostGIS or Haversine formula for distance calculation
3. Add `ORDER BY distance` option to directory API
4. Add a distance badge to therapist cards in the directory
5. Add a radius filter slider to the filter sidebar
6. Consider geocoding service integration for address-to-coordinate conversion

---

## Phase 3: Real-Time Messaging & Read Receipts

**Priority**: Medium
**Effort**: Large
**Dependencies**: None

### Goals

- Real-time message delivery via WebSockets
- Message read receipts (delivered, read)
- Typing indicators
- Unread message count in navigation

### Implementation Plan

1. Add WebSocket server (Socket.IO or `ws`) alongside Express
2. Add `deliveredAt` and `readAt` columns to `direct_messages`
3. Implement connection management with JWT authentication
4. Create real-time event handlers for message send, deliver, read, typing
5. Add connection state management on the frontend
6. Update notification bell to show unread message count
7. Add message delivery status indicators in chat UI

---

## Phase 4: Admin Analytics for Provider Onboarding & Subscriptions

**Priority**: Medium
**Effort**: Medium
**Dependencies**: None

### Goals

- Dashboard visualizations for provider onboarding funnel
- Subscription analytics (MRR, churn, upgrades)
- Application pipeline metrics

### Implementation Plan

1. Add time-series aggregation queries for applications (submitted, approved, rejected by week/month)
2. Add subscription metrics endpoint (active subscribers, revenue, churn rate)
3. Add onboarding funnel visualization (registered → applied → approved → subscribed → profile live)
4. Integrate a charting library (Recharts or Chart.js) into admin dashboard
5. Add export-to-CSV for analytics data
6. Consider caching aggregated data to avoid expensive queries

---

## Phase 5: Background Job Queue

**Priority**: Medium
**Effort**: Medium
**Dependencies**: None

### Goals

- Reliable async processing for emails, notifications, background checks
- Retry logic with exponential backoff
- Dead-letter queue for failed jobs
- Job monitoring dashboard

### Implementation Plan

1. Adopt `pg-boss` as the default PostgreSQL-backed job queue
2. Migrate email sending from synchronous to queued
3. Move background check processing to the job queue
4. Add notification dispatch as a queued job
5. Move scheduled CMS publishing from interval-based to job-based
6. Add admin UI for viewing job status, retrying failed jobs

See `docs/architecture/security-ops-stabilization-roadmap.md` for rollout sequencing, rollback notes, and acceptance criteria.

---

## Phase 6: Dashboards & Alerting for Latency and Failures

**Priority**: Low
**Effort**: Medium
**Dependencies**: Phase 5 (beneficial but not required)

### Goals

- Real-time performance monitoring
- Alert on elevated error rates or latency
- Historical trend analysis

### Implementation Plan

1. Extend the existing metrics collection (`server/utils/metrics.ts`) with percentile tracking
2. Add a `/api/admin/system/metrics` endpoint with historical data
3. Create an admin system health page showing request rates, error rates, and latency percentiles
4. Add alerting thresholds (e.g., p95 latency > 2s, error rate > 5%)
5. Integrate with external monitoring service (Datadog, Grafana Cloud, or Uptime Robot) for alerts
6. Add slow-query logging (queries > 500ms) to identify database bottlenecks

---

## Timeline Summary

| Phase | Name                  | Priority | Effort | Suggested Timeline |
| ----- | --------------------- | -------- | ------ | ------------------ |
| 1     | Full-Text Search      | High     | Medium | Weeks 1–2          |
| 2     | Geo-Distance Ranking  | High     | Medium | Weeks 3–4          |
| 3     | Real-Time Messaging   | Medium   | Large  | Weeks 5–8          |
| 4     | Admin Analytics       | Medium   | Medium | Weeks 9–10         |
| 5     | Background Job Queue  | Medium   | Medium | Weeks 11–12        |
| 6     | Dashboards & Alerting | Low      | Medium | Weeks 13–14        |
