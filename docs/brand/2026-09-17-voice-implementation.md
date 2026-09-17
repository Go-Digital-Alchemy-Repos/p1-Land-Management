# Website Voice Implementation — September 17, 2026

Owner authorized implementing the proposed voice throughout the website. Existing authorization covers direct production publication.

Rewrote 335 inventoried passages across 40 component/page files, then revised short headings, form labels, metadata, and the complete introductions, sections, and FAQs for all 19 new location pages. Shared components carry the direction across all 54 public routes. Useful technical information, local context, required links, the one-acre minimum, confirmed experience, and service limits remain. Removed unsupported statistical and absolute claims identified during editorial review. No new service capabilities or customer proof were invented.

Examples:

- About: “coordinate the agreed scope with one accountable team” became “Start with the work you need now, and we'll help you plan what comes next.”
- Industrial FAQ: “P1 can discuss perimeter vegetation…” became “Yes. We maintain industrial grounds, clear overgrowth, and look after drainage and ponds.”
- Fort Mill FAQ now describes maintenance around deliveries, visitors, and daily operations.
- Shared CTA: “Let's Take a Look at Your Property.” The button remains “Get a Free Site Assessment.”

Comparison of server-rendered main content across 54 routes: scope/scopes/scoped/scoping fell from 127 to 0, qualification from 9 to 0, and mobilization from 11 to 0. These are wording counts, not a readability score or conversion claim. Full comparison summary and CMS revision checks are in voice-implementation-evidence.json.

CMS check: all 54 public snapshots have published page revision 0 and global revision 0; the API returns manifest defaults, not independent published edits. Both website and Core manifests are regenerated together. No database writes or migrations are needed. Form field names, option values, validation, and endpoints remain unchanged; only visible labels and instructions changed.

QA's About headline assertion was updated to the new approved headline, retaining its check that sentence-case source fragments render in title case. Validation includes production build, TypeScript, all-route public QA, FAQ/schema parity, required links and CTAs, image-loading checks, and browser review at desktop and mobile sizes.

No architecture, dependency, imagery, lead-handling, or release-topology changes. Work is isolated in the production release worktree to preserve unrelated in-progress changes in the main workspace.
