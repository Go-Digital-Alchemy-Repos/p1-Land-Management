# Property Photos

The property workspace has a separate staff/crew reference gallery at `/properties/:id/photos`. Photos are intended to identify entrances, site layout, and features a crew should recognize. They are separate from job-progress evidence and client-published work photos.

Staff with `customers.properties` can upload JPEG, PNG, or WebP images up to 15 MiB each and add or replace a description after upload. The server validates and re-encodes images as WebP (maximum 2400 × 2400 pixels, maximum 40 million source pixels), strips source metadata, and stores them in the existing private S3-compatible bucket. The additive `0052_property_photos.sql` migration adds the optional 500-character description and a gallery lookup index. No existing files are moved or reclassified.

The list, upload, description, and protected-content endpoints are in `artifacts/api-server/src/dashboard/files.ts`. List and content reads require an operational property and either `customers.properties` or an active crew assignment to that property. Clients cannot read this gallery, even by opening a direct image URL. Uploads and description changes require `customers.properties`; crews can view but cannot edit. When a crew assignment ends, direct image access ends too. Content responses use `Cache-Control: no-store`. Upload IDs are immutable and retryable; a repeated ID with changed image or metadata is rejected.

`GET /api/v1/properties/:id/photos` lists the gallery. `POST /api/v1/properties/:propertyId/photos/:id` accepts a raw image and `x-p1-file-name`; `PATCH` on the same path accepts `{ "description": string | null }`. `GET /api/v1/files/:id/content` serves an authorized image. The gallery is intentionally absent from client navigation.

Validate with the route test, Dashboard typecheck/build, and `property-photos.test.ts` against a disposable local database after migrations. The browser fixture at `artifacts/p1-dashboard/tests/property-photos-browser.html` exercises the gallery and dialog without production data.
