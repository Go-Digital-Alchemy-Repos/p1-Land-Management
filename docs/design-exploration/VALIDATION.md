# Validation and evidence boundaries

**MOCKUP ONLY — NOT IMPLEMENTED**

Completed checks for this design exploration:

- Discovered and captured 56 live public routes on desktop and mobile. Captured 18 core routes at 820px tablet width; individual location and article tablet captures were not performed.
- Read the local marketing routes and page sources, plus shared navigation, forms, review, map, content and image patterns. The local checkout differs from live in some content and navigation; observations identify their source rather than assuming equivalence.
- Inspected all four live desktop contact sheets, four mobile sheets and two tablet sheets, together with representative full-page and expanded-state evidence. Entrance animation can make some body sections appear faint in screenshots; retained DOM text supplies content evidence.
- Captured all 32 recommended concept screens at desktop, tablet and mobile widths. Captured the three alternative homepages at those widths.
- Ran 384 browser structure checks: 128 screens at 1440×1000, 820×1180 and 390×844. All passed the checked conditions: no horizontal overflow, one H1 and no broken completed image loads. This does not test all browser/device behaviour.
- Checked 5,769 HTML image, stylesheet and link references across 129 HTML files. No missing local target was found.
- Compared SHA-256 hashes for 55 inspected source page files against their initial capture: unchanged. Git status shows no new production-file changes. The existing unrelated dirty files remain outside this task.
- Exercised gallery Water filter: two illustrations shown with the selected state and announced count. Exercised the mobile menu with Enter. Used sample values and a selected scope to reach the local simulated confirmation. No production inquiry was submitted.
- Reviewed concept desktop/mobile sheets and the four-direction comparison. Refined heading size, vector logo, skip-link visibility, B's distinct scope-led hero, hidden gallery items and regional map reference.

Run `python3 docs/design-exploration/validate_review.py` to repeat local integrity/source-hash checks. Results are saved in `evidence/integrity-validation.json`; responsive browser results are in `evidence/mockup-browser-checks.json`.

No application build, dependency installation, production API test, CMS edit, database operation or deployment was required or performed. Mockup forms are local simulations. No conversion lift, full WCAG conformance, field performance score or production release readiness is claimed. Assistive technology, zoom, colour-state combinations, real lead receipts and final content permissions remain future-phase validation.

The proposed project profile is an evidence template. Generated boards are exploratory art direction and can contain incidental generation errors. Exact editable HTML, source attribution and owner fact checks govern any future implementation.
