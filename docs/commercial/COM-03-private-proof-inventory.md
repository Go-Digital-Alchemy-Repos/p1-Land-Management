# Private commercial proof inventory

Internal implementation placeholder only. Nothing in this inventory is verified or authorized for public publication. Do not place source documents or private review notes into public page fields or public media. The private editor is implemented and independently reviewed locally; staging acceptance and deployment remain pending.

| Record category | Initial status | Public behavior |
|---|---|---|
| Credentials, insurance, certification | Unverified; awaiting owner evidence | Hidden |
| Equipment and delivery capacity | Unverified; awaiting technical review | Hidden |
| Safety process and site onboarding | Unverified; awaiting technical review | Hidden |
| Documentation and reporting samples | Unverified; awaiting reviewed redacted sample | Hidden |
| Vendor information, W-9 and COI | Private procurement; source not supplied | No public URL |
| Agreed response arrangements | Unverified; property/contract specific | No blanket response claim |
| Commercial concrete flatwork scope | Preserve in service strategy; exact approved scope pending | No unsupported public scope assertion |
| Project stories and before/after photography | Source and customer publication permission pending | Hidden |
| Customer logos and endorsements | Permission and identity unverified | Hidden |

Required private record fields: category, internal title, scope/availability, self-performed or coordinated delivery, source/private object reference, source owner, technical reviewer, reviewed date, expiry date, permission status, permission scope, approved public excerpt/asset, publication approver/time/version and revocation history. Absence of evidence stays unknown; possession of a document never implies publication rights. Expired or revoked proof must be removed from public presentation through the reviewed publication process.

The CMS owner should keep these records behind admin permission checks, exclude them from public contracts/previews, and publish only separately reviewed excerpts or approved assets. Empty/unverified rows must never create public badges, logos or broken sections.

## Implemented private editor

- CMS route `/admin/cms/private-proof`; authenticated `GET` and `PUT /api/admin/cms/private-proof`.
- Nine initially empty categories. Administrators and content editors can read and save drafts; only administrators can approve or revoke evidence. Any edit invalidates its prior approval.
- Existing encrypted `system_settings` storage uses reserved key `p1_private_proof_inventory` and category `p1_private_proof`; no database migration. Generic settings reads, writes, deletion and category movement cannot expose or bypass the inventory.
- Transactional revision checks serialize concurrent writers, including initial creation. Conflicts preserve editor inputs; reload requires confirmation before discarding unsaved edits.
- Audit history retains actor, time, revision and the draft SHA-256 digest for each action. It does not retain a restorable copy of each old draft. The 10,000-action capacity fails explicitly rather than silently discarding history; an archival workflow is required before that capacity is reached.
- Approval remains private. Source URLs and private document references are stored as metadata; the editor neither fetches nor uploads documents, and adds no public content contract or publication endpoint. Public excerpt publication and expiry/revocation enforcement in a future publisher remain separate work.

Independent review reproduced seven focused tests: encrypted PostgreSQL concurrent creation and cache bypass, mounted HTTP authentication/permissions/settings privacy, and editor conflict retention. Implementation also passed its broader 25-test regression selection, typecheck and production build. These results establish local behavior, not live CMS acceptance.
