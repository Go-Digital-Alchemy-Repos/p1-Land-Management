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
- Public upload first exceeded Railway request size. Root deployment filters now omit copied Core except the shared manifest helper, and duplicate mockup imagery. Original source assets remain in Git. Public retry is in progress; no public staging acceptance is claimed yet.

## Outstanding release gates

Verify public build/deployment, private gateway routing, authorized fresh P1 setup/sign-in, managed form receipt and CRM delivery, CMS preview/publish/restore/conflicts, snapshot recovery, isolated media read/write and rollback rehearsal. Shared CMS/dashboard identity is separately under implementation and must pass its own permission/MFA/revocation rollout checks. Healthcheck success alone does not establish full release acceptance. Production public website has not been replaced by this staging work.
