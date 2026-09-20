# Email template concurrency foundation

The retained email-template HTTP API now reads `{version, templates}`. Each template has a content version. PUT requires `{template: {subject?, htmlBody?, isActive?}, expectedVersion}`; restore requires the collection version. Unknown/unversioned fields fail closed, and stale versions return 409. Older browser tabs must refresh.

Storage compares and mutates under one PostgreSQL transaction/table lock, with an authenticated-actor audit committed atomically. Default restore preserves existing IDs, activation choices, and custom templates. Startup repairs and the explicit seed utility acquire the same table lock before reading, preventing stale startup repairs from overwriting an editor. The seed utility still intentionally restores defaults when explicitly invoked; it is not an editor API.

The retained editor supplies versions for edits/toggles/restore, asks before replacing default content, keeps drafts when locks change or saves fail, offers a local draft download, and prevents immediate uncertain-save replay. Failed saves refresh the library for later comparison. Email preview is sandboxed. No real mail was sent and no production template data was edited during validation.

Validation: `node scripts/test-core-email-templates.mjs` provisions and removes an isolated PostgreSQL 17 fixture (seven real database tests). Retained-route tests verify strict payloads, versions, attribution, authorization and conflict forwarding. Core type check and production build are required.

The consolidated Owner bridge and native Email Templates destination are now implemented at `/marketing/system/email-templates`. Exact allowlisted operations cover list, versioned save, versioned default restore, preview, and saved-content test mail to the signed-in Owner only. Generated API clients also cover the existing template reservations. The native editor preserves drafts on conflicts/uncertain writes, supports local draft downloads, filters disabled feature modules, and provides sandboxed visual/HTML editing and preview. Full-document HTML remains in source mode to preserve its document structure. Existing admin remains available; live native browser acceptance and full retirement acceptance remain separate gates.

Release evidence: code revision `095a7e1d99d559bc8c03fb2dfdde13155f52acd6` reached Railway SUCCESS for Core, Dashboard and public website on September 19. The authenticated retained library reloaded successfully and displayed the same five existing templates after the response-contract change. This read-only check did not edit templates, restore defaults or send mail. Focused validation: seven isolated database tests, seven template-route tests, seven retained head-settings regression tests, seven existing template/design helper tests; Core type check and production build passed.

Content follow-up: live subjects still include inherited Core Platform branding for Password Reset and Welcome New User, and a New Provider Registration template remains visible. Reconcile these with the P1 template/consumer inventory during native migration; this release deliberately preserves stored content.

Native implementation validation (September 19): 92 Core route/provider regression tests, 10 dashboard component tests and 27 transport/navigation tests passed. Core, API and dashboard type checks and production builds passed. Provider credential readers now refresh database snapshots across processes and reuse storage clients only while effective configuration is unchanged. No production templates were edited and no real mail was sent during these checks. Live verification is pending this release.

Live release evidence: `45e2800f016d479a45ed78afe1bd3fa78014f04b` reached Railway SUCCESS for Dashboard (`1f06b6d1-b7b4-455f-bcc0-2aff0cacb8a2`), Core (`6151d8a6-d048-4bec-b30a-7681e0d6c79a`) and public website (`799d2a84-d3dd-4b31-8a57-d395b3adb1c8`). The authenticated native library showed all five existing templates. Contact-form preview rendered P1 branding and sample substitutions. An edit reservation was acquired; applying bold in an unsaved visual draft and switching to HTML produced the expected `<b>` markup while retaining inline styles and variables. No Save, Restore or Send action was invoked. Browser automation stalled at the local discard confirmation and could not confirm tab cleanup; this does not represent a server template mutation. Mobile and full end-to-end mutation/retirement acceptance remain outstanding.

## P1 account default branding — September 19

Password-reset and welcome defaults now identify P1 rather than Core Platform.
HTML encodes the company ampersand and existing delivery variables are preserved.
Normal startup continues to preserve saved templates; this change affects missing
initial defaults and explicit default restoration, not customized stored content.
Focused default test passed. No email was sent and stored-template reconciliation
remains a separate acceptance step.
