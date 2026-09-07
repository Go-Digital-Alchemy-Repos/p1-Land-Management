# Better Farms route acceptance status

Reviewed 2026-09-05. Site source: clean `ee14d6746cc14cb4b441eecf6598aaaf0e18e975`
(`Better Farms Foundation-codex-site-shell`); Core source: `9a8bf1a2d0e5d5fd17bac1fac935860c841bb81b`.
This is a React/source audit, not a new seven-route browser approval. The existing
`e2e/pilot/better-farms.spec.ts` proves the Fund-a-Farm two-origin preview/save/publish
slice with synthetic data; it does not prove the other routes or form delivery.
The approved intake covers seven routes and excludes imports, live checkout and production DNS.

## Follow-up verification

Site `cec78df` fixed the contact/newsletter retry gap below; Core's real two-origin browser
proof verified after-commit response loss and one receipt/effect set on retry (see the execution
ledger). Those source findings are retained as the original audit, not current open defects.

Site `8021f6b` fixes canonical removal/recreation during unknown-route navigation and removes
`maximum-scale=1`. Its 35 tests, type check and production build passed. Playwright CLI verified
the compiled site with a synthetic public origin: direct unknown route → About SPA navigation
→ Back → Forward correctly removed/recreated exactly one canonical and changed robots metadata.
No production release or full accessibility approval is implied. Core's two-origin source pin
now references `8021f6b`; all three integrated cases passed in 16.6 seconds on 2026-09-06 UTC
(see `docs/release-evidence/better-farms-integration-2026-09-06.json`).
External hero image policy, approved quotations/identities/assets and broader route interaction
acceptance remain open.

## Seven-route browser follow-up — 2026-09-06 UTC

The actual local two-origin pilot fixture now pins clean Better Farms
`7fd1298beb373ee447aa97f578fb11e575faf8f0`. Running
`npx playwright test --config playwright.pilot.config.ts` passed **22/22 cases in
33.7 seconds**: the existing three CMS/form integration cases plus nineteen route
and interaction cases in `e2e/pilot/routes.spec.ts`.

For all seven routes at 1440px and 390px, browser checks confirmed HTTP 200, one visible
nonempty primary heading, successful decoding of local `img` elements, internal
link paths belonging to the seven-route set, actual header navigation to Contact,
and a successful reload. Every About board dialog opened by keyboard with a decoded
headshot and closed using Escape. Donation selection/custom amount and the CTA to
Contact worked at both widths; no checkout or provider call was exercised.

The initial run against 21eeb76 passed 18 cases and reproduced one defect: Tab from
the final mobile drawer link focused the obscured page. Site commit 7fd1298 fixes
forward/reverse focus wrapping, guards focus entry and makes background branches
inert while preserving their prior state. The passing regression verifies Escape
returns focus to the trigger, close restores background interaction, and resizing
to desktop closes the drawer and restores desktop navigation. The original failed
assertion was retained and extended, not relaxed.

The fixture built the real site production artifact, ran Core in development mode,
and owned synthetic local PostgreSQL/TLS services. Browser requests were restricted
to fixture origins. Its container and ports 5202/5203/5443 were released afterward.
Better Farms typecheck and 38 site-contract tests passed; Core typecheck and scoped
ESLint passed. The source branch `codex/form-reliability` was pushed at 7fd1298.

This supersedes the broad pending route-interaction statement above only for these
specific checks. It is not content/portrait/quotation approval, comprehensive WCAG
conformance, provider delivery, checkout, production DNS, or production release
acceptance. The original audit below remains historical evidence; unresolved copy,
rights and broader accessibility gates still apply.

## Route matrix

All seven paths are actually mounted in site `client/src/App.tsx:51`; each renders
one main landmark, a primary heading, SiteHeader and SiteFooter. “Static” below means
React-owned content, not an absent page. The manifest deliberately declares no editable
regions outside Fund-a-Farm; expanding every page into Puck is not an approved requirement.

| Route           | Implemented React blocks and behavior                                                                                                                                                   | Forms / CMS integration                                                                                                                                    | Remaining acceptance                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`             | Hero, impact statistics, challenge/project content, newsletter, testimonial controls, keyboard-activated team dialogs, donation amount controls (`HomepageWhite.tsx:21–668`).           | Inline and footer newsletter use shared submission hook. Static page content; no CMS fetch. Donation CTA links to contact.                                 | Placeholder testimonial attribution and team identity/bio; generic image alternatives. Claims, portraits and copy need approval; complete responsive/keyboard review pending. |
| `/how-it-works` | Hero, five foundation cards, application/process steps, funding/impact content, newsletter, quotation, CTAs and donation card (`HowItWorks.tsx:9–449`).                                 | Inline/footer newsletter; static page content. Contact and Fund-a-Farm CTAs are real route links.                                                          | Quotation `— Name` at line344; approved copy/media and route interaction review pending.                                                                                      |
| `/about`        | Hero/introduction, quotation, principles, mission/vision, newsletter, six board cards/dialogs, CTA (`AboutUs.tsx:16–355`).                                                              | Inline/footer newsletter; static page content.                                                                                                             | Six placeholder board identities/credentials/bios; also `— Name` quotation at line139, additional to the existing content-review table.                                       |
| `/contact`      | React Hook Form + Zod fields for name/email/message and optional organization/role/referral, associated FormLabel/FormControl/FormMessage, success/error toasts (`Contact.tsx:32–262`). | Real submit calls `/api/contact`; adapter maps optional context into Core message and fixed subject. Footer newsletter also present.                       | Actual site→Core durable receipt, error/retry and mobile validation acceptance not yet evidenced by pilot browser spec. Destination/provider configuration remains separate.  |
| `/for-farmers`  | Hero, five project categories, application/process explanation, contact CTA, donation card and imagery (`ForFarmers.tsx:7–233`).                                                        | Footer newsletter; application CTA routes to contact. No standalone farmer-application workflow or CMS fetch.                                              | Dedicated application workflow is not required by current manifest. Approve copy/assets and verify route links/layout/keyboard behavior.                                      |
| `/fund-a-farm`  | Validated content renderer, named theme/SiteShell, amount buttons/custom amount, CTA, impact statement and hero image (`FundAFarm.tsx:19–124`).                                         | Only CMS-backed page: eight fixed field paths; trusted preview overrides published payload; same-origin API proxy and bundled fallback. Footer newsletter. | Local two-origin content flow passed; production content/accessibility approval remains pending. No payment integration, intentionally excluded.                              |
| `/get-involved` | Corporate/foundation/DAF/individual pathways, contact/funding CTAs, newsletter, benefit cards and donation card (`GetInvolved.tsx:9–373`).                                              | Inline/footer newsletter; static page content.                                                                                                             | Approve giving levels, benefit/impact claims and copy/media; route interaction/accessibility review pending.                                                                  |

Site filenames above are under `client/src/pages/` at the pinned source.

## Shared integration and release evidence

- **Forms exist, delivery acceptance incomplete:** `client/src/site/platform-forms.ts:24–95`,
  `hooks/use-newsletter-signup.ts:9–52`, and `server/client-site-content-proxy.ts:85–169`
  implement validation, same-origin POST, error handling and authenticated server proxy.
  Missing Core origin/token returns503; it does not invent success. Newsletter collects
  a visible full-name input but submits only email (the current declared newsletter schema).
  All seven footers include newsletter; home/about/how-it-works/get-involved also include inline forms.
- **Retry gap:** browser `submitPlatformForm` sends no idempotency key, and the site proxy
  forwards no such header. Core `server/routes/client-forms.routes.ts:32` accepts it;
  `server/services/forms.service.ts:390–400` stores null when absent. Therefore a response-loss
  retry can create another submission/effect set (source-derived risk, not reproduced here).
- **SEO mostly implemented, navigation defect remains:** all seven routes have title,
  description, robots and social title/description in `shared/site-metadata.ts`.
  `server/static.ts` injects metadata into production HTML; `server/site-metadata.ts:47`
  emits canonical only with configured public origin and removes it for unknown routes.
  But `client/src/site/page-metadata.ts:8–35` derives origin only from an existing canonical
  and always rewrites it: client navigation to an unknown route retains a canonical;
  a direct unknown-route load followed by valid SPA navigation cannot recreate one.
  No sitemap or social image tag is present; robots.txt allows crawling. These are source
  findings, not a claim that production origin, crawl behavior or SEO approval is complete.
- **Accessibility foundations exist:** actual main/headings, named navigation, labelled
  contact/newsletter/custom-amount controls, aria-pressed donation buttons and keyboard team
  dialogs are implemented. Header opens focus on first mobile link, supports Escape/focus
  return, and makes the closed drawer inert (`SiteHeader.tsx:20–37,92–95,124–128`).
  Full focus-order/contrast/zoom testing remains pending; `client/index.html:5` sets
  `maximum-scale=1`, a concrete zoom restriction to remove. Generic home image alternatives
  remain; a footer accessibility statement is copy, not conformance evidence.
- **Assets exist locally:** a filesystem check of literal `/figmaAssets/` and `/sourcePhotos/`
  references across `client/src` found75 unique paths, all present in `client/public`.
  This does not validate dynamic references, image meaning, rights or browser decoding.
  The hero schema accepts HTTPS image URLs, while site production `server/index.ts:32`
  permits only self/data images: an external hero may validate but be blocked by CSP.
  Local asset approval is distinct from the explicitly excluded source-media import.
- **Content gate remains pending:** existing `content-review.md` lists approval requirements;
  add the About quotation to the eventual review update. Static legal statements and imagery
  do not establish client authorization. Real domain/configuration and release evidence
  are not supplied by local route completion.

## Recommended next implementation slice

**Complete retry-safe contact/newsletter delivery through the existing Core form boundary.**
Do not expand page schemas or add a donation provider. Own site
`client/src/site/platform-forms.ts`, `client/src/hooks/use-newsletter-signup.ts`,
`client/src/pages/Contact.tsx`, `server/client-site-content-proxy.ts` and focused tests;
coordinate an extension to Core's dedicated `e2e/pilot` fixture/spec. Preserve approved
payload fields and exact stack/token authorization. Generate one key per logical submission,
retain it for an unchanged-payload retry, renew it after success or changed payload, and
forward it through the server proxy using Core's existing bounded header contract.

Acceptance: real contact and newsletter browser submissions reach an isolated Core database;
a deliberately lost response followed by unchanged retry produces one submission/effect set;
changed payload creates a new submission; validation failure creates none; unavailable or
unauthorized proxy shows failure and retains form input. Use synthetic destinations with
outbound mail/CRM/provider effects disabled or controlled; do not contact real recipients.
This development work needs no production domain, import source or approved public copy.
The canonical/zoom/HTTPS-image-policy findings are separate bounded followups, not silently
included in that implementation slice.
