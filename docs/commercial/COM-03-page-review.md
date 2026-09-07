# COM-03 public page — local implementation review

Status: implemented locally for Orchestrator review; not deployed or accepted as an end-to-end commercial workflow.

`/commercial` adds the integrated exterior-site relationship, seven service groups, lifecycle, data-center considerations, recurring scope discussion and Commercial Site Assessment. Existing service URLs remain, with contextual links from the homepage and commercial service detail. Services includes Commercial Site Management; Service Areas remains the final emphasized item. The commercial mobile contact bar targets the assessment form.

The public form follows [the Core contract](../../platform/p1-core/docs/contracts/p1-commercial-assessment.md): one POST, email or phone, optional qualification details, no uploads. A stable key survives unchanged retries while the page stays open. Inputs remain after failures, the error summary receives focus, and confirmation requires a 200/201 response with a submission reference. Reload persistence is not implemented; the form does not store personal details in browser storage. Form starts/errors use existing first-party events; accepted inquiries are established by the server receipt, not click tracking.

The App route inventory drives sitemap/prerender/CMS generation. Copy, imagery, links and SEO use existing structured CMS fields. All images are existing optimized assets and visibly labeled illustrative. No named clients, certifications, response guarantees or private procurement documents are published. The assessment deliverable is something to agree, not a claim of an already operational dashboard reporting workflow.

## Executed local validation

- Public TypeScript check: passed.
- Production Vite build and SSR: 35 routes passed; 36 CMS components generated. Existing Vite source-map and SSR static/dynamic-import warnings remain.
- `node scripts/qa-public.mjs`: all 35 routes, metadata, CMS text/image/link overrides, internal links, JSON-LD/proof checks passed. Largest initial route JavaScript is homepage at 140.4 KiB gzip (150 KiB budget).
- `node scripts/image-budget.mjs`: all 50 original image families' generated variants passed.
- `node --test scripts/commercial-inquiry.test.mjs`: 4 tests passed: channel requirements, required services, stable/new request keys, one POST and durable receipt status requirements. Requires Node 22.13+ for built-in TypeScript stripping; current Node 24.19.0. Initial test bootstrap tried an unavailable esbuild import; replaced with the built-in API, then all tests passed.
- Screenshot inspection caught inherited dark heading colors over the dark hero/data-center sections; explicit white heading colors were added.
- Headless Chrome, local server, 390px and 1440px viewport: no horizontal overflow. Mobile required-field summary prevented a POST; phone-only submission retained fields after mocked503; unchanged retry reused the key; mocked201 receipt confirmed; no browser JavaScript errors. Only the form transport was mocked, not production intake/CRM. Screenshots: `/tmp/p1-commercial-mobile.png`, `/tmp/p1-commercial-desktop.png`.

## Remaining acceptance work

- COM-04 live/staging durable intake, CRM and dashboard bridge/queue evidence belongs to the backend integration release. The browser mock does not prove delivery.
- Editor draft/preview/publish/restore and privacy for the new route need staging verification after matching manifests deploy.
- Full assistive-technology testing, final brand review and live field-performance evidence remain release checks. Headless Chrome mobile390/DPR2 measured 362,197 bytes of initial subresource transfer before scrolling (local cold context, not field data), within1.5MB. The selected1280WebP hero passes250KB.
- [Private proof inventory](COM-03-private-proof-inventory.md) is deliberately outside the public CMS manifest. An admin-only schema/editor must be implemented by the CMS owner before calling the private-placeholder requirement complete. Public content contracts expose published fields and cannot securely store procurement originals or private review evidence.
- The standard CMS wrapper edits text/images/links; true add/remove/reorder controls for capability/lifecycle collections are not introduced by this page. The current ordered layout is fixed in code.

## Header CTA follow-up

The commercial Layout now passes its assessment CTA mode into SiteHeader. Desktop and mobile-menu primary links read “Request a Site Assessment” and target the named, programmatically focusable assessment section. Mobile menu close suppresses return-to-trigger focus only for this CTA and moves focus after the dialog closes; other menu behavior is unchanged.

Executed after the follow-up: TypeScript, production build, 35-route SSR/CMS/metadata checks passed (largest route JavaScript140.4KiB gzip). Headless Chrome verified desktop anchor/hash/focus; mobile menu dismissal and section focus; no1024px horizontal overflow; About retains its original estimate CTA. Scrolling the data-center section loaded and decoded the768WebP pond image. Viewport evidence: `/tmp/p1-commercial-desktop-header.png`, `/tmp/p1-commercial-data-center.png`.
