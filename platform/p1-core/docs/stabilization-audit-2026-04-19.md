# Stabilization Audit — 2026-04-19

## Executive Summary

The system is now in a much healthier state than it was at the start of the last sprint.

What is going well:
- The admin and CMS are loading again.
- The page builder is working and has direct smoke coverage.
- Locking behavior is materially more stable.
- The public site has stronger prerendering, search, and SEO foundations.
- The automated quality baseline is better than before: the current suite passes with 30 test files and 125 tests.

What still needs attention:
- Several core admin surfaces remain very large and will continue to attract regressions unless we keep decomposing them.
- The public/admin rendering boundary is still too entangled in some places, even though the most dangerous CMS-specific leaks were removed.
- Bundle stability improved, but performance optimization should now be conservative and evidence-based after the recent chunking regressions.
- Save-state, unsaved-change protection, and editor UX consistency still need one more deliberate pass.

Recommendation:
- Stop broad feature work for one focused stabilization sprint.
- Protect the editorial workflows first.
- Make the admin/CMS architecture more predictable before returning to application wizard, memberships, and transaction flows.

## Current Baseline

- Full test suite passing: 30 files / 125 tests
- Production build passing
- CMS page builder loading and rendering
- Route-level smoke coverage exists for:
  - CMS pages
  - blog editor
  - section editor
  - forms
  - events
  - docs
  - editor lock behavior

## Strengths

### 1. Product breadth is strong

The system already covers a lot:
- public CMS pages
- directory and therapist profiles
- events and recordings
- blog and comments
- forms and entries
- SEO and sitemap controls
- reusable sections
- email templates and system mail

That breadth is a real asset. We do not need more surface area right now; we need more consistency and reliability across what already exists.

### 2. The hybrid rendering strategy is directionally right

The public app now has:
- route-level lazy loading
- server prerender support
- dedicated search results
- CMS fallback pages

That gives the site a strong foundation for indexing and content flexibility.

### 3. Quality gates are now meaningful

Compared with earlier in the sprint, the project now has:
- a working Vitest setup that actually includes `.tsx` client tests
- regression coverage for critical editorial paths
- a cleaner production build path than before

This is a good base to build on.

## Highest-Risk Findings

### P1. Oversized admin/CMS files are still the main regression magnet

The biggest files in the codebase are still concentrated in the exact areas where we keep feeling friction:
- `client/src/features/admin/settings-page.tsx`
- `client/src/features/admin/cms/builder/block-renderer.tsx`
- `client/src/features/admin/forms-page.tsx`
- `client/src/features/admin/events-page.tsx`
- `client/src/features/admin/cms/builder/block-registry.ts`
- `client/src/features/admin/cms/cms-page-editor-page.tsx`

These are manageable today, but they are still large enough that small changes can create unrelated breakage.

### P1. Public/admin renderer boundaries are improved, but still delicate

The recent CMS failures showed a clear pattern:
- builder code accidentally imported public rendering paths
- chunking changes exposed hidden coupling
- route-specific regressions were hard to spot until production

We should assume there are still a few boundary leaks left and continue separating:
- admin preview rendering
- public runtime rendering
- preview-only adapters

### P1. The builder needs a dedicated protection layer

The builder is now stable enough to use, but it is still the most complex editing surface in the app.

Needed next:
- a stronger PageBuilder smoke suite
- content-specific builder fixtures
- safer preview adapters for dynamic blocks
- targeted logging around failed builder block previews

### P2. Save-state and exit protection are not fully uniform yet

We improved save-state messaging significantly, but we still need:
- consistent unsaved-change warnings on close/navigation
- consistent dirty-state reset rules
- consistent wording for save success/failure

This is not a data-loss emergency right now, but it is one of the last major UX consistency gaps in the admin.

### P2. Performance work should now be conservative

The app is in a safer place after the chunking rollback, but we learned something important:
- aggressive bundle splitting without route-graph verification is too risky here

From here on, performance work should be:
- measured
- route-specific
- backed by smoke tests

Not another broad manual-chunking experiment.

## Medium-Priority Findings

### P2. Test coverage is solid at the workflow level, but still not broad enough around publishing

What we have now is much better, but still missing:
- save/publish/unpublish regression tests for more admin flows
- builder content fixture tests with representative page data
- broader SEO/system-settings workflow tests

### P2. Some architectural docs are now ahead of some runtime realities

The docs are useful and strong overall, but after the last sprint we should refresh them to reflect:
- the current lock model
- current CMS builder boundaries
- the current stabilization priorities
- the new expectation that performance work must stay stability-first

### P3. Technical debt list should be refreshed

The existing debt catalog is useful, but it is more codebase-general than workflow-specific.

We now need a debt lens that prioritizes:
- editorial reliability
- admin consistency
- public/admin rendering isolation
- bundle safety

## Recommended Improvement Sprint

### Sprint 1: Editorial Reliability

Goal:
- protect the workflows people trust most

Deliverables:
- add unsaved-change exit protection across route and sheet editors
- add more save/publish smoke coverage
- add stronger builder smoke coverage with realistic content fixtures
- add logging around builder preview failures and lock anomalies

### Sprint 2: CMS / Builder Architecture Cleanup

Goal:
- reduce the chance of page-builder regressions

Deliverables:
- continue decomposing `block-renderer.tsx`
- continue separating public renderer logic from admin preview logic
- introduce explicit preview adapters for dynamic/public blocks
- audit builder imports for public-route coupling

### Sprint 3: Admin UX Consistency

Goal:
- make the admin feel like one coherent product

Deliverables:
- unify save-state and dirty-state behavior everywhere
- standardize close/cancel/warning patterns
- standardize lock messaging and blocked-editor behavior
- standardize media/focus/upload controls where still divergent

### Sprint 4: Measured Performance Pass

Goal:
- improve load performance without destabilizing the app

Deliverables:
- route-by-route bundle review
- lazy-load only clearly isolated heavy surfaces
- add smoke verification before any future chunking changes

## Recommended Order Before Returning to Memberships / Wizard Work

1. Editorial reliability
2. CMS/builder architecture cleanup
3. Admin UX consistency
4. Measured performance pass
5. Return to application wizard, memberships, and transactional flows

## Bottom Line

The system is no longer in “emergency stabilization” mode.

It is now in “protect and refine the core” mode.

That is a very good place to be.

The best next sprint is not more feature breadth. It is:
- reliability
- boundaries
- consistency
- then performance

If we do that in order, the next round of application wizard and membership work will land on a much more dependable foundation.
