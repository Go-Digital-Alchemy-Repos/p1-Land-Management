# P1 website and CMS staging — September 7, 2026

## Isolated resources

Project `e83f79dd-d901-4ab1-836b-bdf272b58dc2`; environment `website-staging` / `12ee0f33-fbfb-49b1-8602-f3f8b162670b`.

| Resource | ID / endpoint |
|---|---|
| Public gateway | `2b3f49c6-af90-41af-b5f7-6cfe9e0e0908` |
| Public staging URL | https://p1-website-staging-website-staging.up.railway.app |
| Core backend | `faa1114f-678e-414e-b227-e2f1ecac7755` |
| Core PostgreSQL | `5d84cc06-c9ad-408f-974f-5af29865670e` |
| PostgreSQL volume | `5613c21f-5d77-4083-8e3c-9aed1f19b83d` at `/var/lib/postgresql/data` |
| Public content cache volume | `c05d1a27-7d35-499b-8143-2feb93f38e9b` at `/app/data` |
| Dedicated media bucket | `89c3c4cb-fcc0-4358-ad3a-5327733a7b47`, `p1-media-staging`, iad |

Database password, Core session/setup secrets and S3 credentials are fresh staging-only values stored in Railway. No production credentials, users or customer data were copied. The original Core Platform remains untouched. Staging email delivery is not configured yet.

Gateway port is8080; Core port is5000. The public server references the Core service private domain. Core uses private-network PostgreSQL and a packaged same-origin staging manifest. Both services require the same external HTTPS origin for runtime preview/origin settings and build manifest inputs; see [manifest configuration](p1-manifest-build-config.md).

## Observed deployment evidence

- PostgreSQL deployment `8b3e0614-5539-49fa-be4d-191f676bbde5`: terminal SUCCESS.
- Core deployment `60426fc2-19f0-4274-b94f-2b395578a7c8`: terminal SUCCESS and `/api/health/ready` passed. Source `0f3f1a9e623d846b395b28138e2d030810f92156` from immutable Git archive.
- Public upload first exceeded Railway request size. Root deployment filters now omit copied Core except the shared manifest helper, and duplicate mockup imagery. Original source assets remain in Git. Public deployment `dbf739b9-3aef-4e68-9fa5-5fa93bc51835` was queued successfully from immutable source `6bdc0ab` after removing duplicate mockup imagery; no public staging acceptance is claimed yet. Core source remains `0f3f1a9` during this staging check; later differences are dashboard setup and deployment packaging, not Core application changes. Before production, record both complete source IDs and verify packaged manifest parity.

## Outstanding release gates

Verify public build/deployment, private gateway routing, authorized fresh P1 setup/sign-in, managed form receipt and CRM delivery, CMS preview/publish/restore/conflicts, snapshot recovery, isolated media read/write and rollback rehearsal. Shared CMS/dashboard identity is separately under implementation and must pass its own permission/MFA/revocation rollout checks. Healthcheck success alone does not establish full release acceptance. Production public website has not been replaced by this staging work.

## Staging storage and recovery evidence

Dedicated staging bucket synthetic SDK write/read/delete passed; only the probe object was removed. PostgreSQL volume backup `f77fd59a-78e3-4853-8a60-a841b81dd8e7` was listed after creation. A separate `pg_dump` from staging was restored with `pg_restore --exit-on-error` into an isolated PostgreSQL18 Docker container with networking disabled. All46 public tables restored; the synthetic inquiry and its completed CRM delivery job each appeared exactly once. The disposable restore container/volume were removed after verification. This validates a staging dump restore, not production rollback or restoration of the Railway volume snapshot.

Staged gateway bootstrap/login/me and CMS listing passed using a synthetic staging-only admin. Production owner credentials were not used. Public `/admin` exposed a301/308 trailing-slash loop; source `80ce207` fixes backend route normalization and adds staging noindex/deny-all robots. The upload timed out but Railway recorded `24c96680-6571-49e4-ae6a-b20ef7a5e7b9` as INITIALIZING; logs report no associated build. Do not claim that fix is live until a successful deployment and fresh HTTP checks.

## Runtime artifact and persistent-cache correction

The reviewed `80ce207fbea4d4799a0821d25485338849606e73` source was verified against1,680 Git blob hashes, built under Linux AMD64/Node22 and packaged as a28,743,383-byte runtime archive. SHA256 `dcd392c7adea65c487cbbdac87253ea436d70003999464a6ce992c20b1f2c8f9`; payload manifest SHA256 `5ecace8e5be3e3811b78148e86810947c17ba79f61afbae44b63cd49ed59088d`. Build/typecheck/image budgets/34routes/FAQ/25server-preview checks and standalone staging smoke passed. Runtime upload accepted as deployment `69c4ef9e-8c2b-4c68-a95d-93d7dedab9c9`; terminal SUCCESS verified. Fresh HTTP checks confirm `/admin` follows to200 without a loop, public `/contact/` still canonicalizes, and staging headers/robots prohibit indexing.

A live read-only process/filesystem check found Node running as UID1000 but the mounted `/app/data` owned by root with0755 permissions; no cache directory had been created. Assigned the dedicated staging `/app/data` and `/app/data/cms` directories to UID/GID1000 through an operator SSH operation, preserving the nonroot application process. A fresh published-content request then created one persisted snapshot, owned by1000. Repeat this provisioning check for any new/replaced production volume; Docker build-time directory ownership does not provision an attached Railway volume. See [Railway volume mounting and permissions](https://docs.railway.com/volumes). Do not set the application process to root as a workaround. Cache durability must be rechecked after deployment and volume restoration.

After deployment `69c4ef9e-8c2b-4c68-a95d-93d7dedab9c9`, an isolated child of the deployed application was started as UID/GID1000 on a separate loopback port with an unreachable Core origin. It loaded the volume snapshot and returned the same homepage content and revision10; two persisted records were present. The child was stopped afterward without changing the main service. This proves restart/backend-outage cache recovery for the staged snapshot. Browser navigation now reaches `/admin/login`; that screen exposed legacy Core branding/removed-module footer links, which are being corrected before production.
