# Email template concurrency foundation

The retained email-template HTTP API now reads `{version, templates}`. Each template has a content version. PUT requires `{template: {subject?, htmlBody?, isActive?}, expectedVersion}`; restore requires the collection version. Unknown/unversioned fields fail closed, and stale versions return 409. Older browser tabs must refresh.

Storage compares and mutates under one PostgreSQL transaction/table lock, with an authenticated-actor audit committed atomically. Default restore preserves existing IDs, activation choices, and custom templates. Startup repairs and the explicit seed utility acquire the same table lock before reading, preventing stale startup repairs from overwriting an editor. The seed utility still intentionally restores defaults when explicitly invoked; it is not an editor API.

The retained editor supplies versions for edits/toggles/restore, asks before replacing default content, keeps drafts when locks change or saves fail, offers a local draft download, and prevents immediate uncertain-save replay. Failed saves refresh the library for later comparison. Email preview is sandboxed. No real mail was sent and no production template data was edited during validation.

Validation: `node scripts/test-core-email-templates.mjs` provisions and removes an isolated PostgreSQL 17 fixture (seven real database tests). Retained-route tests verify strict payloads, versions, attribution, authorization and conflict forwarding. Core type check and production build are required.

This is a prerequisite release, not native Email Templates parity: the consolidated Owner bridge, generated API client, native editor, variable/preview/test-mail controls and end-to-end browser acceptance remain to implement. Existing admin remains available.

Release evidence: code revision `095a7e1d99d559bc8c03fb2dfdde13155f52acd6` reached Railway SUCCESS for Core, Dashboard and public website on September 19. The authenticated retained library reloaded successfully and displayed the same five existing templates after the response-contract change. This read-only check did not edit templates, restore defaults or send mail. Focused validation: seven isolated database tests, seven template-route tests, seven retained head-settings regression tests, seven existing template/design helper tests; Core type check and production build passed.

Content follow-up: live subjects still include inherited Core Platform branding for Password Reset and Welcome New User, and a New Provider Registration template remains visible. Reconcile these with the P1 template/consumer inventory during native migration; this release deliberately preserves stored content.
