# P1 website acquisition and technical review

Review date: September 7, 2026. Status: review complete; recommendations proposed, not implemented. Companion: [implementation plan](./2026-09-07-implementation-plan.md). At the Owner's follow-up request, the supplied Desktop directives were adapted to P1 and project-local AGENTS.md/orchestrator.md copies were created.

## Executive assessment

P1 has a credible visual foundation, clear large-acreage positioning, useful service coverage, and working prerendered pages. Its largest obstacles to winning business are unreliable lead capture, weakly substantiated customer proof, excessive image weight, and a lack of acquisition measurement. These should precede a redesign or expansion into more location pages.

This is an evidence-based first-pass review, not a certification of security, WCAG conformance, ranking, or conversion performance. No numerical quality score is assigned where measurements are unavailable.

| Area | Assessment | First action |
|---|---|---|
| Lead conversion | High-priority gap | Replace email-app handoff with confirmed lead receipt |
| Trust and differentiation | High-priority evidence gap | Verify testimonials, projects, credentials and operating promises |
| Performance | Confirmed payload and caching problems | Responsive modern images, production static serving, route splitting |
| Technical SEO | Good foundation with confirmed defects | Real 404 responses, URL normalization, schema lifecycle |
| AI-search discoverability | Crawlable foundation; expertise/proof gaps | Original project evidence and reviewed, useful content |
| Accessibility/mobile | Useful foundations; incomplete interactions | Form labels, focus, validation, mobile CTA and full manual QA |
| Security | Hardening work identified; no critical exploit established | Bound dev exposure, production runtime/header policy, dependency validation |
| Analytics/operations | Acquisition outcome visibility absent in source | Trace accepted leads through qualification, estimates and wins |
| Code/QA | Build passes; business regressions poorly guarded | Automated route and critical-journey gates |

## Baseline and coverage

- Repository: Go-Digital-Alchemy-Repos/p1-Land-Management. Local main is `6ae56f8`; refreshed remote main is `5303da0`, two commits ahead, changing only the homepage slogan. The live headline agrees with the newer copy; exact deployed Git SHA was not verified through Railway.
- Existing changes preserved: two Vite configs, sitemap, pnpm lock/workspace files, replit.md and untracked README.md. One registered worktree found; no local-only commits relative to refreshed origin/main. Other machines/clones/task handoffs were not exhaustively inventoried.
- Reviewed the supplied Desktop orchestrator.md and AGENTS.md as user-supplied role guidance. FreightPath/LogisticsAdvisor product names and references to nonexistent canonical docs were not imported into P1. No root AGENTS.md or docs register existed in this checkout at the start.
- Inspected the 34 public route families, shared components, prerender/SEO implementation, deployment files, contact path, source content drafts, API skeleton and security boundaries. Three bounded specialist investigations supplemented parent source and live verification.
- Live HTTP checks covered all 34 routes. Browser inspection covered desktop/mobile homepage, mobile menu and Contact, including client navigation and head inspection. Static generated-page checks covered internal route links and image attributes.
- No production form submissions, source-code fixes, commits, pushes or deployments occurred. Build artifacts were regenerated. The direct build command bypassed the sitemap prebuild hook to preserve the already-dirty source sitemap.

### Actual validation results

| Check | Result |
|---|---|
| `pnpm run typecheck` | Passed across libraries and applicable workspace projects |
| Website `check:faq` | Passed: 35 page modules examined; 23 emit FAQPage blocks |
| Vite client build + prerender script | Passed: 34 routes; bundle-size and sourcemap diagnostic warnings remain |
| All 34 live routes | HTTP 200, one H1 each, unique titles and expected clean-path canonicals |
| Generated internal route links | No broken route links or empty/# placeholder links in checked anchors |
| Generated image occurrences | 185; all have alt attributes; none have width, height or srcset attributes; 163 lack loading attributes |
| Unknown live path | Defect: HTTP 200 with homepage HTML/title/canonical |
| Homepage → Contact client navigation | Defect: homepage FAQ JSON-LD remains in head alongside contact schema |
| Mobile visual checks | Homepage legible at 390×844; menu opens and Contact navigation works; form starts far below introductory content |
| Compression | Live HTML responds with gzip when requested |
| PageSpeed API | HTTP 429; no Lighthouse or CrUX scores obtained |

Image attribute counts are occurrences across routes, not unique files. Missing dimensions alone do not prove layout shift: several images have CSS aspect-ratio/size containment. Missing alt text was not found, but accuracy of every alt description was not certified.

## Prioritized findings

Priorities: P1 materially obstructs acquisition or warrants early delivery; P2 important quality/reliability improvement; P3 follow-up maintenance. These are business priorities, distinct from security severity. Repository-relative paths below are evidence references.

### P1-01 — The estimate form does not deliver a lead

`artifacts/p1-website/src/pages/contact.tsx:23–47` builds a `mailto:` URL and sets submitted state. The visitor still needs a configured mail client and must separately send the message. No backend acceptance, persisted receipt or delivery status exists. The completion text honestly says “ready to send,” but surrounding copy describes team review after submission. Returning to the form remounts blank fields. This creates a plausible lost-lead path; its actual loss rate is unknown.

Implement a same-origin, server-validated lead endpoint backed by durable receipt and reliable notification. Success must mean accepted by the backend, not a browser handoff. Preserve entered data on errors, handle duplicate submission and provide a reference. Keep telephone/email alternatives. Reduce initial required fields while retaining the 1-acre qualification. Acceptance tests must include no mail client, provider outage, timeout, duplicate click, invalid contact data and accessible error recovery.

### P1-02 — Customer/project proof needs provenance

`pages/home.tsx:346–352` publishes a named Marcus T. testimonial about a 40-acre property. `pages/testimonials.tsx:15–60,98,114` publishes quotes with five-star visuals and a “representative” qualification. The supplied core-page draft at `attached_assets/content-extracted/doc1-core-pages.txt:79–86` contains testimonial placeholders. `pages/gallery.tsx:27–36,82,157–159` names specific projects and calls imagery visual proof while also saying it is representative.

This establishes an evidence gap and inconsistent presentation, not proof of fabrication. Obtain source records and publication permission. Until verified, replace unsupported endorsements with factual capability copy, remove unsupported star ratings, and label illustrative images beside each image. Build authentic before/after case studies with service, approximate approved location, scope, acreage, constraints and results. Verify Est. 2009, ±0.1-inch tolerance, owned fleet/in-house delivery, licensing/insurance, service coverage and response promises before emphasizing them.

### P1-03 — Images and initial assets are unnecessarily heavy

The local production build contains about 97 MiB of source imagery, with individual PNGs around 1.49–2.80 MB. Homepage hero is 1.87 MB. Homepage HTML references approximately 26.2 MB of local assets; land-clearing HTML references 10.5 MB; gallery references 20.4 MB. These are referenced file totals, not measured cold-load transfer or proof every asset downloads immediately. All routes share one 676.03 KB minified JS file (179.09 KB build-reported gzip) and 130.88 KB CSS (20.28 KB gzip). `src/App.tsx:8–42` eagerly imports all page modules. `src/index.css:1` loads three Google font families through CSS import.

Use responsive WebP/AVIF with suitable fallback and source sizes, explicit layout space, lazy loading for below-fold images, and deliberate hero priority. Split page code without breaking prerender/hydration; measure before removing providers/dependencies. Reduce font families/weights to those actually used. Establish repeatable mobile budgets and real-user measurements before claiming Core Web Vitals success.

### P1-04 — There is no implemented acquisition measurement

Source search found no analytics initialization, UTM capture or conversion events in the application. External account configuration was not inspected. The business cannot evaluate this implementation's funnel by source, service, geography, accepted request, qualified lead, booked visit or won job.

Instrument pageviews, call/email/estimate actions, form starts, errors and server-confirmed acceptance. Capture permitted source attribution separately from contact details. Connect operational lead outcomes to reporting. Treat a call click as intent, not a completed qualified call. Establish a baseline before choosing conversion lift or revenue targets.

### P2-01 — Static serving produces soft 404s and duplicate URL variants

Live `/p1-audit-nonexistent-20260907` returned HTTP 200 and the complete homepage. `/contact`, `/contact/` and `/contact.html` all return 200; both apex and www hosts remain accessible rather than consolidating to the configured www canonical. Canonical tags on clean routes are correct, so duplicate accessibility is not itself proof of an indexing penalty. Client SEO uses raw pathname (`components/seo.tsx:37,66`), which can replace normalized static canonical values on variants.

Replace production Vite preview with a production static server. Serve a useful genuine HTTP 404 for unknown routes/assets; permanently redirect equivalent host/slash/HTML variants to one URL; preserve query strings. Use one route canonical function in static/client rendering. Existing content routes must continue returning prerendered HTML before JavaScript.

### P2-02 — Structured data accumulates and business identity drifts

`scripts/prerender.mjs:85–87` creates unmarked JSON-LD, while `components/seo.tsx:68–80` removes only marked scripts. Live homepage → Contact navigation left five blocks, including unmarked homepage FAQ data plus contact data. `index.html:23–55` also embeds a separate GeneralContractor entity, while helpers use LandscapingBusiness. `lib/structured-data.ts:94–111` reuses the same business ID but changes its URL, description and service area per location.

Give static and client page schema the same ownership lifecycle; maintain a stable, factual business entity and link service/place/article nodes to it. Remove competing unmanaged copies. Use actual logo assets and verified profile links; do not invent a public address. Test fresh HTML, hydration and multiple client navigation sequences. The existing FAQ checker stubs SEO and cannot catch this defect.

### P2-03 — Mobile contact access and form semantics need work

`SiteHeader.tsx:88–94` hides the persistent phone/estimate buttons at smaller breakpoints; the mobile menu places conversion actions below a long service list. The homepage retains working hero CTAs, but service/location hero templates lack equally direct mobile access. The 390×844 Contact screenshot shows most of the first screen occupied by introduction/spacing.

Contact requires both phone and email plus multiple qualification fields. Its select labels lack associated trigger IDs (`contact.tsx:136–152,187–190`), “Service Needed *” is not enforced (`:168–172`), and completion lacks explicit status/focus management. Contact details show phone/email as paragraphs (`:218,225`). Add associated labels, autocomplete, fieldsets, valid requirement wording, inline errors and actual links. Keep an immediately available mobile call/estimate action without obscuring content or keyboards.

### P2-04 — Accessibility needs behavioral verification

Strengths include a skip link, main target, desktop navigation label, image alt attributes and Radix controls. Gaps include gallery filter state without aria-pressed or announced result changes (`gallery.tsx:91–155`), Services trigger outline suppression without an obvious replacement (`SiteHeader.tsx:49`), scroll-only route changes (`App.tsx:97–101`) and no sitewide reduced-motion treatment for animated content.

Test keyboard operation, visible focus, VoiceOver, error announcements, touch targets, contrast on actual image overlays, 200% zoom and narrow reflow across every template family. Fix observed barriers against WCAG 2.2 AA. Automated scores alone cannot establish conformance; no comprehensive screen-reader/contrast audit ran in this pass.

### P2-05 — Existing content needs expertise and a stronger path to an estimate

All five articles lack visible author/reviewer and publication/review dates; cost ranges and regulatory statements lack linked evidence. Article markup uses generic business imagery. Blog closing copy says “request a free estimate online” without linking it; article bodies rely on telephone rather than contextual service links. City-page service lists such as `service-areas/greenville-sc.tsx:70–85` are plain text. Footer navigation does work, so these are not orphan-page defects.

Improve the existing articles and priority service/location pages with reviewed practical guidance, cost assumptions, authentic local examples, relevant service links and direct contextual estimate links. Differentiate Charlotte city/region pages by real intent; evaluate Search Console data before consolidation. Do not add dozens of near-duplicate city/service pages. Add real people/crew expertise to About and useful procurement information for commercial/HOA buyers.

### P2-06 — Production runtime and security hardening are incomplete

`Dockerfile` installs/copies the whole workspace and runs website `serve`; that script invokes Vite preview. There is no .dockerignore, explicit non-root runtime or multi-stage minimal static image. Vite explicitly says preview is not a production server. Sample live responses did not show CSP, HSTS, X-Content-Type-Options or frame restrictions; this is missing defense in depth, not an established exploit. Dev configs bind all interfaces and allow all hosts, weakening host validation if development is reachable.

Use a minimal non-root production server image, explicit build-context exclusions, constrained development host allowances, and tested security headers. Roll out a measured CSP policy without breaking inline SEO, fonts or application styles. Validate dependency advisories against actual shipped versions and reachability. No authenticated business API or stored customer-data path currently exists; the API skeleton exposes health only. New lead handling introduces a real PII/abuse boundary and requires server validation, size limits, throttling, secrets management, redacted logs and retention policy.

### P2-07 — QA and operational gates do not cover the business funnel

No tracked CI workflow or E2E configuration was found. Current scripts cover type checks, build and FAQ input structure. They miss lead receipt, soft 404s, metadata lifecycle, mobile form accessibility and image budgets. Railway healthcheck `/` can pass when a required contact workflow fails.

Add proportional CI, deployed-route smoke checks, synthetic lead checks against a test destination, error monitoring and a named lead-delivery alert owner. Monitor acceptance and notification separately. Verify deployed SHA and rollback path. Do not increase meaningless unit coverage of static prose; protect business behavior and template contracts.

### P3 — Maintainability, freshness and presentation follow-ups

- `generate-sitemap.mjs:33,42` stamps every URL with build date. Omit lastmod until significant-content dates are reliable, then update only changed content.
- Contact data, hours, service taxonomy and routes are duplicated despite `lib/site.ts`. Centralize stable facts and a route manifest incrementally; keep meaningful unique page copy.
- Article OG type is always website and image defaults to business logo. Support article type, real article images and genuine dates consistently in prerender/client head.
- Hashed JS/CSS/SVG sample live responses use `Cache-Control: no-cache`; set immutable long-lived caching for hashed assets while revalidating HTML. Gzip HTML is already enabled; do not report compression as absent.
- Add a privacy notice describing actual lead/analytics handling. Choose any consent controls based on the actual tools and applicable requirements; this review is not legal advice or a legal-compliance audit.

## Acquisition strategy and AIO

Treat AIO here as discovery and accurate representation in AI answers. The best investment is trustworthy, crawlable evidence of what P1 does, where it works, who performs it and what outcomes it has achieved. Google connects its AI experiences to foundational search eligibility and useful original content; it does not recommend llms.txt as a ranking shortcut. Existing robots and llms.txt do not demonstrate indexing or AI citations. [Google AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

The live hero “Your first impressions start at the curb” is visually polished but does less qualification than a direct service/location proposition. Preserve its latest version when integrating; evaluate an approved service-specific alternative after reliable lead tracking exists. The 1-acre minimum, owned-equipment capability and broad service delivery can differentiate P1 only when accurate and supported.

A small public search sample surfaced competitors emphasizing clear scope, timelines, project work and direct quote requests: [Piedmont Land Management](https://piedmontlmg.com/) and [Garrett Land Clearing](https://garrettlandclearing.com/). This is a directional messaging comparison, not a local ranking or market-share benchmark. A limited branded query did not establish P1's index coverage; use verified search accounts to investigate rather than conclude it is unindexed.

Owner/account-dependent follow-up: Search Console indexing and query reports, Bing indexing, actual Google Business Profile eligibility/configuration and service-area consistency, review sources, backlinks/local citations, historical traffic/lead quality, call handling and operational close rate. Confirm these before setting numeric revenue targets or prioritizing markets. Never publish a fictitious office to obtain local visibility.

## Measurement and acceptance framework

- Primary business outcome: qualified opportunities and won gross profit by service/market/source. Supporting funnel: accepted leads → contact made → site visit booked → estimate issued → job won. Track spam and out-of-area/sub-acre inquiries separately.
- Lead reliability: all accepted requests receive durable IDs; notification failure cannot silently lose a lead; alert/retry path demonstrated. No success event before acceptance; no contact details in analytics.
- Field performance goals: p75 LCP ≤2.5 seconds, INP ≤200 ms and CLS ≤0.1, segmented mobile/desktop when sufficient field data exists. Lab checks supplement rather than replace field measurement. [Web Vitals definitions](https://web.dev/articles/vitals)
- Proposed engineering budgets: mobile hero ≤250 KB, responsive card variants ≤100 KB, initial transferred page assets ≤1.5 MB, initial JS ≤150 KB gzip. These are project starting budgets, not universal ranking rules; record any justified exception with a measured reason.
- SEO: all indexable routes return 200 with unique truthful metadata; unknown routes/assets return 404; one canonical per route before and after navigation; no stale page schema; sitemap lists only intended canonical 200 URLs.
- Trust: every project/review/credential claim has a source and owner approval; illustrative assets cannot be mistaken for documented projects.
- QA: passing build/type/route/schema/critical-journey/accessibility/budget checks and targeted post-deploy smoke; actual deployment revision recorded.

Additional primary references: [Vite preview production limitation](https://vite.dev/guide/cli), [Google HTTP response guidance](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes).

## Security scan result

The standard source scan completed with one low-severity confirmed configuration finding: disabled development Host validation. No high/critical vulnerability was established within its partial coverage. Dependency manifests were reviewed, but no vulnerability-database audit ran. The generated report and findings are retained in the sibling `security/` directory. Security priority is distinct from the business priority assigned to lead capture and production hardening.

## Explicit limitations

No verified analytics, CRM, Business Profile, Search Console, Bing Webmaster, paid-search, DNS/email-deliverability or Railway deployment-console access was used. No local-pack grid, backlink audit, penetration test, full dependency exploit validation, load test, complete keyboard/screen-reader suite or Lighthouse score is claimed. Security tooling reported that its protected-output connector access could not be verified; source review continued. Specialist security coverage and artifacts are separate from this marketing review. These gaps are assigned discovery tasks in the implementation plan, not assertions that the corresponding systems are defective.
