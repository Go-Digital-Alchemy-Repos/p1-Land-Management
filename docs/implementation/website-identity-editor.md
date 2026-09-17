# Website identity in Marketing

The consolidated route is `/marketing/design/branding`. Both the business API and Core enforce `marketing.design.branding`, using the existing capability vocabulary and federation boundary. Company identity is separate from dashboard identity and access management.

## Retained settings and writes

The editor reads exactly six raw values from the public `branding` category: `company_name`, `company_address`, `company_phone_numbers`, `company_google_business_url`, `frontend_logo_url` and `favicon_url`. Unknown legacy values remain visible and unchanged unless explicitly replaced. Name is limited to 255 characters, address/phones to 2000, and URLs to 2048. Changed strings are trimmed; multiline address/phone text is retained. URL changes accept credential-free HTTP(S), plus rooted `/uploads/cms/` paths for image fields only. Local paths cannot contain empty, dot, encoded or traversal segments. Unsafe schemes, credentials, controls and backslashes are rejected. Empty strings clear overrides.

`GET /marketing/cms/design/branding` returns `{settings, version}`. `PUT` accepts exactly `{settings, expectedVersion}` and a nonempty partial map of changed fields. Category-version checking, settings and the `website_identity_updated` key-list audit commit together. The existing email-branding cache is reset after a successful write. Category privacy/collision protection uses the shared settings transaction. Responses are private/no-store. Stale or uncertain writes retain the draft and disable further writes until a successful reload.

`POST /marketing/cms/design/branding/assets` accepts multipart `file` and `settingKey` (logo/favicon), requires the same Branding capability and uses the retained image optimizer/media service. It permits one image up to 10 MiB and returns `{url, mediaId}`. The service retains production durable-storage requirements and local development fallback. An upload prepares a media asset; it does not update active settings. Save applies the resulting URL under the category version. Unused or uncertain uploads remain in Media, with uploader attribution; they are not automatically deleted or retried. A Branding-only user can upload without being granted the broader Media manager. Managing unused assets requires Media access.

Generic legacy identity writes/deletes and `/api/admin/branding/upload` now return 409 directing users to the consolidated editor. This prevents unversioned direct application through the old admin surface. Image preview is rendered only for usable URLs, uses no referrer and does not alter settings. Previewing an external image necessarily requests that image from its host.

## Consumers and remaining delivery

The retained Core CMS/contact and email consumers still use these settings. The current P1 public header/footer import a static logo; the favicon is static in the document shell and contact/company content belongs to published website snapshots. This checkpoint does not claim those public components adopt the overrides. The editor says so explicitly. Public identity projection/delivery, fallbacks, safe image-origin behavior, reconciliation with published contact content and production publication review remain required before identity parity is complete. Uploaded provider assets were not exercised against live storage.

## Verification and release

58 focused Core/shared tests passed, covering exact projection, least privilege, partial/versioned writes, validation, legacy mutation blocking, prepared uploads and local path boundaries. The dashboard/database suite passed 119 tests with migration replay. Its first run failed an unrelated global client-count assertion in onboarding while concurrent test fixtures were changing that table; the rerun passed without an onboarding change. This existing test isolation weakness remains recorded.

Shared library, API, Core and dashboard type checks and API/Core/dashboard builds passed; existing bundle warnings remain. Browser verification with external networking blocked covered grants, load failure, unchanged legacy values, partial saves, stale/lost-response recovery, clearing, upload-before-apply and mobile containment. The mobile screenshot was inspected. Browser fixtures do not prove live provider delivery. Existing OpenAPI paths and schemas were compared and remain semantically unchanged.

Deploy compatible Core/API/dashboard revisions together only after release approval. No migration is introduced. No production settings, assets or deployments were changed by this work. Rollback restores application revisions and retains all stored settings/media; any value restoration must use reviewed settings rather than deleting data.
