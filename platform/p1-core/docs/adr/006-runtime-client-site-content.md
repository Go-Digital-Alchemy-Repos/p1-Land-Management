# ADR 006: Runtime Client-Site Content Publication

**Status:** Accepted for the Better Farms pilot
**Date:** 2026-09-03

## Context

The Better Farms site remains an independently built React application while Core Platform owns content
editing and publication. Preview messages are transient and cannot provide revision history, rollback, or a
stable public read path. Triggering a site rebuild for each copy change would also require deployment-provider
credentials and additional recovery states.

## Decision

Core stores client-site content in a separate aggregate keyed by stack, route, and component. Draft content
and published content are separate snapshots. Every save, publish, and restore appends an immutable revision.
Writes use an expected revision so two editors cannot silently overwrite one another.

The public endpoint returns only validated published content and emits an ETag with a short cache lifetime and
stale-while-revalidate allowance. The Better Farms server exposes that endpoint through its same-origin `/api`
path. The browser validates the response envelope and content; unavailable or invalid responses use the
built-in, version-controlled content.

Preview remains an exact-origin `postMessage` channel. It can display unsaved edits but cannot mutate or
publish server state.

## Consequences

- Copy changes publish immediately without rebuilding Better Farms.
- Core API availability affects freshness, while the site retains usable fallback content.
- Database evolution is additive and rollback keeps immutable history.
- Production requires the manifest path on Core and the Core API origin on Better Farms.
