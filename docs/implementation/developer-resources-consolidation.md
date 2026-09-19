# Developer Resources consolidation

## September 18: versioned storage and authenticated bridge

Implemented the storage/write contract and private Business Center bridge needed by the native document manager. The existing Core `docs` table remains authoritative. There is no schema migration, copied document store, credential change or provider side effect.

### Interface

Dashboard prefix: `/api/v1/marketing/cms/website-system/docs`.
Core prefix: `/api/integrations/business-center/cms/website-system/docs` (through the existing service/grant boundary).

- GET collection: `{ version, docs }`; each document retains its existing fields and adds `version`.
- POST collection: editable fields only (`title`, `slug`, `category`, `content`, `sortOrder`, `isPublished`); author is the resolved actor. Returns the saved versioned document.
- PUT `/:id`: `{ document: <editable fields>, expectedVersion }`.
- DELETE `/:id`: `{ expectedVersion }`; the bridge explicitly forwards this DELETE body.
- POST `/sync`: `{ expectedVersion }` using the collection version; returns `{ created, updated, total, version, docs }`. Source definitions are loaded before the database transaction.

Unknown fields/queries, missing versions and invalid IDs fail validation. Core requires an active, attested Owner; Dashboard also requires Owner before issuing a grant. Results are private/no-store. Unexpected database failures are replaced with a sanitized error before HTTP logging, so SQL parameters/document bodies cannot leak through an exception. Audit actions use fixed names and record only the document identifier/slug or operation description, never document bodies.

### Concurrency and durability

Each versioned mutation takes a short PostgreSQL table lock with a five-second lock timeout, following the existing atomic settings pattern. It compares the saved version inside the transaction and commits the document change with its audit record. A stale save/delete/sync fails with 409. Sync is all-or-nothing, preserves custom documents and existing publication/author/ID fields, and detects duplicate source slugs before writes. Readers remain available. Concurrent normal SQL/legacy writes cannot interleave inside this transaction.

This **does not** make the old `/admin/docs` editor version-aware. An old client can still issue a later unversioned write. Before full acceptance, move its mutation paths to the same versioned contract or intentionally redirect the complete editor after parity is proven. Existing editor reservations remain separate; the next native editor must preserve reservation UI plus conflict-safe draft recovery. Version checks are not a replacement for the requested editing workflow.

### Validation actually run

- Core TypeScript check and production build passed.
- API-server TypeScript check and Dashboard server build passed.
- Six real disposable PostgreSQL tests passed: concurrent-save winner, stale delete, legacy-write detection, stale sync, custom/visibility/provenance preservation, audit/constraint failure rollback, duplicate definitions and successful delete.
- Fifty-four Core route/service tests passed, including three new document-route tests, existing 49 CMS bridge tests and two system documentation tests.
- Fourteen Dashboard transport tests passed, including exact Owner-only method/path allowlisting and preservation of the DELETE version body.
- No production document was created, edited, synchronized, or deleted for validation.

### Remaining implementation and acceptance

Native reader/editor, category/search, Markdown/heading navigation and safe previews, create/edit/publication/order, delete/sync confirmation, edit reservations, cross-surface version-aware writes, old deep links, mobile/keyboard/error recovery and live authenticated read verification. The backend being implemented is not full Developer Resources parity and does not permit `/admin` retirement.

Rollback: revert this additive backend change on reconciled main; retained legacy routes and data remain available. No down-migration is required.

## September 18: generated document client contract

The canonical Dashboard OpenAPI specification now describes all five versioned document operations and the existing Owner-only acquire/heartbeat/release reservation routes. Generated fetch functions and models retain document and collection versions, nullable historical metadata, publication/order fields, bounded editable input and conflict/error responses. The existing bridge allowlist and Core identity checks remain authoritative; this change does not widen access or add routes.

Seventeen focused client/transport tests passed. The generated-client checks exercise actual request serialization, DELETE version bodies, exact allowlisted destinations, reservation release keepalive, cancellation, and surfacing 409/503 without replaying a write. Shared-library and Dashboard TypeScript checks passed. These checks use synthetic responses and do not mutate production documents.

The native editor can now consume the canonical generated client instead of introducing a hand-written fetch contract. Reader/editor UI, draft recovery, legacy cross-surface version-aware writes and full feature acceptance remain open.

Run the cross-package client/bridge regression checks from the repository root with:

```sh
pnpm --filter @workspace/api-server exec tsx --test ../../scripts/test-website-documents-client.ts src/dashboard/marketing-cms.test.ts
```

The cross-package check lives in `scripts/`, outside the API server compilation root; API-server TypeScript validation and the Dashboard production build also passed.
