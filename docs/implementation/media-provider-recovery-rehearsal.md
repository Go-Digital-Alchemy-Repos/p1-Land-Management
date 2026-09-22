# Isolated media provider recovery rehearsal — September 22, 2026

The privately retained imported Blog media archive and populated Core database
snapshot were used together. The archive contains 20 SHA-256-verified PNG/WebP
objects (11,411,502 bytes). Every archive digest mapped uniquely to a retained
`cms_media` filename and `r2_key`, with matching size and MIME. These original
keys are private and are not recorded in the repository or the aggregate report.

`platform/p1-core/script/rehearse-media-provider.ts` loaded both private inputs
before starting any fixture. It rejected invalid/duplicate paths, hashes,
sizes, MIME values, database-key matches and unsafe media keys. It required a
locally cached MinIO image pinned to digest
`sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e`.
The script started a uniquely named, disposable container with its S3 port
bound only to `127.0.0.1`, a tmpfs object volume and synthetic credentials.
All 20 objects were written under their retained Core keys, then read back
through S3 HEAD/GET and checked for size, MIME and full SHA-256 byte identity.

For the application check, an ephemeral loopback TLS proxy and one-run local CA
let the existing Core storage adapter keep its HTTPS-only endpoint validation.
The real Core `/r2` route served each of the 20 retained-key URLs with matching
MIME, `nosniff` and exact SHA-256 bytes. A private resume-style key returned 404.
The container and local TLS materials were removed; no fixture container
remained. Aggregate evidence was written to a mode-0600 file outside the repo.

Validation result: **passed, 20/20 objects and 20/20 Core asset responses**.
The local rehearsal did not contact or mutate production R2, database, website,
Dashboard or customer records. It did not test Cloudflare account/bucket
restoration, bucket permissions, active credential recovery, or objects created
after the retained snapshot. The exact deployed Railway images and full
application/data rollback sequence remain separate retirement gates.

To repeat from `platform/p1-core`, use only privately retained and reviewed
inputs and a private output path:

```sh
npx tsx script/rehearse-media-provider.ts \
  /private/archive-dir \
  /private/populated-core-snapshot.json.gz \
  /private/media-provider-evidence.json
```

The script refuses inherited `S3_*`, `R2_*`, `BACKUP_*` and database connection
environment variables. It does not pull a mutable image or print media keys,
URLs, bytes, provider credentials or database rows. Do not put private input
files or output reports into Git.
