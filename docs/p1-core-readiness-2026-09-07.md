# P1 Core readiness regression — 2026-09-07

Scope: isolated P1 Core code and disposable local API5007 database. Original Core Platform, private business dashboard, provider credentials and production deployment were not modified.

Verified live HTTP behavior for home, about, contact, gallery, a service, a location and an article component:

- Saved original content, published it, saved a changed private draft, then called the actual historical revision restore endpoint.
- Stale expectedRevision returned409. Valid restore produced a higher draft revision with historical content and revision kind `restore`.
- Restore left the published revision unchanged. Publishing the restored draft served the original content publicly.
- Anonymous admin-content requests returned401 and public content never included the private marker.
- Each fixture finished with original values restored and explicitly published. Test activity remains in disposable revision history.
- Eight public/admin API paths for products, directory, membership and portfolio returned404.

The initial test harness incorrectly assumed publication preserved draftRevision; it received409. Inspection confirmed publication creates its own next revision. The corrected harness used the returned revision and passed all seven families. This was a test-harness correction, not a production endpoint defect.

Implementation corrections:

- `platform/p1-core/client/src/App.tsx`: moved the website page lazy declaration below imports. Browser testing had reproduced Vite interop `Cannot access lazy before initialization` when the declaration preceded the React import.
- `platform/p1-core/server/vite.ts`: replaced unrestricted allowedHosts with localhost. Vite's built-in IP/localhost acceptance remains available.

Validation: npm run check passed; npm run build passed; four focused content/preview/mount test files passed24 tests; five authentication/origin/media/security files passed34 tests. Build log: /tmp/p1-core-readiness-build.log. Disposable HTTP regression script: /tmp/p1-core-restore-review.mjs (requires private local session fixture; credentials are not in this report).

Preview review: editor fields enumerate the manifest contract, update bounded values and send typed messages to the explicit iframe origin. The iframe URL is the actual public route with cmsPreview/cmsComponent query flags. Public listener requires matching origin, parent window, protocol, stack, route and component. Preview responses use private/no-store and noindex. Draft retrieval remains authenticated.

Browser limitation at report time: local production admin rendered using existing5009 HTML/assets while API remained5007. Only previewUrl was rewritten to localhost for same-origin fixture testing. The public gateway4180 returned stale HTML pointing to /assets/index-HG14NNlR.js (404), preventing iframe hydration. This is not a successful visual-preview test; the parent was notified to restart the public gateway and the browser test is pending. Development React-refresh inline preamble is also blocked by strict CSP; no CSP weakening was introduced.

## Browser follow-up after gateway restart

Actual browser check passed using local headless Chrome: after initial iframe content fetch, changing a manifest-backed field in the admin editor updated the public iframe. A separate ordinary public page did not contain the unsaved marker. Screenshot: /tmp/p1-preview-regression.png. The fixture used production admin5009 assets, disposable API5007 through gateway4180, and production-to-localhost previewUrl substitution only.

A timing defect remains in the public frontend (reported to its owner): an unsaved preview message received before the initial page-content fetch resolves can be overwritten by `CmsProvider` resetting active state from the fetched published snapshot. The early-edit case failed while the post-fetch edit case passed. Preserve accepted preview values across same-route snapshot refreshes to avoid losing early editor updates. This is public frontend code, outside this task's Core edit ownership.

A directory-settings404 was observed from the older5009 admin fixture bundle; current Core source and release build are separate from that existing container. No authentication files were edited; subsequent canonical-auth federation is owned by the SSO task.

## Deterministic preview race recheck — passed

After the public-quality agent's route-scoped overlay fix and the parent's gateway restart, independently ran `/tmp/p1-preview-delayed.cjs` in headless installed Chrome. For both home-content and site-chrome, the test held the initial `/api/p1/page-content` response, entered an unsaved editor marker, verified its appearance in the real iframe before releasing that response, then released the response and verified the marker survived. Navigating the iframe to About cleared the overlay for both components. Ordinary public pages excluded both markers. Final run exited0 with all eight assertions passed. The initial route-navigation harness selected a hidden desktop navigation link inside the narrow iframe; selecting the visible About link corrected the harness.

The previously reported initial-fetch preview race is resolved by this browser evidence. Screenshots: /tmp/p1-preview-delayed-home-content.png and /tmp/p1-preview-delayed-site-chrome.png. These screenshots were captured after route navigation; the script assertions establish the early-preview and snapshot-refresh behavior. No authentication or other application source changes were made during this recheck.
