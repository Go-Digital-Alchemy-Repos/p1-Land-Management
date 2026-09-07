# Directory Journey Audit

Date: 2026-06-13

## Product Direction

The directory should read as a configurable directory platform first. Therapist/provider language should be a preset experience, not the product shell.

## Current Journey

1. Public visitors enter through nav, footer, home, CMS pages, or `/directory`.
2. Directory settings determine the active model, labels, filters, gallery behavior, and template lab preview.
3. Admins tune those presets in Directory Settings before applying a live model.
4. Internal routes and schema still use legacy therapist identifiers for compatibility.

## Friction Found

- The platform shell still had hard-coded "Mental Health Professional" language in default nav/footer labels, independent of the active directory model.
- CMS block defaults used therapist-specific labels for generic directory blocks, so new pages could recreate old assumptions.
- Public directory internals are mostly template-aware, but legacy component names and test ids make future work easy to misread.
- Admin documentation mixed product language with compatibility identifiers, making it unclear which terms are user-facing and which are preserved technical names.

## Cleanup Applied

- Default nav/footer directory labels now respond to the active directory settings.
- Default footer copy now uses neutral directory language for non-practitioner templates.
- CMS block defaults now prefer "verified provider", "directory", and "profile" language while preserving stored block type keys.
- Directory admin docs now distinguish directory profiles from legacy `/api/admin/therapists` route names.
- Admin directory management headings, actions, and profile form labels now use the active directory settings while preserving legacy route/test identifiers.
- Join/register copy now speaks in listing/profile terms instead of assuming every applicant is a mental health professional.
- A real-estate smoke test now checks that public shell and directory browser copy no longer leaks mental-health-specific language when the active model is `real_estate`.

## Next UI Pass

- Add neutral API aliases such as `/api/providers` after the template model stabilizes.
- Make CMS dynamic block names settings-aware in the editor, not only neutral by default.
- Plan a deeper internal naming migration once visible product language is stable for at least one release cycle.
