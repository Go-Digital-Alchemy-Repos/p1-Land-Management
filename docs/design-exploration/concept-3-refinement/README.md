# Concept 3, with P1's brand and content

**MOCKUP ONLY — NOT IMPLEMENTED**

Owner feedback on October 2, 2026: Concept 3 is preferred, but the explorations lost the actual logo and too much existing content. This refinement applies that feedback to seven key pages. It does not authorise production implementation.

Open [the seven-page visual index](index.html), then review:

- [Homepage](home.html)
- [Services](services.html)
- [Drainage](drainage.html)
- [Grading & site preparation](grading.html)
- [Commercial](commercial.html)
- [About P1](about.html)
- [Contact](contact.html)

The original `attached_assets/Asset_1_1782329698014.svg`, which is imported by the site's header and footer, is copied unchanged to `assets/p1-original-logo.svg`. Its green-and-blue colours and proportions are retained. No generated wordmark is used.

Current live page content was captured on October 2 into `evidence/live-content.json`. The layouts retain the captured headings, paragraphs, lists, reviews, FAQ answers and field labels. The homepage fixes the commercial-grounds slide for this static preview; it does not demonstrate every seasonal carousel state. Existing public experience, licensing, response-time and service claims are reproduced for content fidelity; this is not new verification of those claims. Navigation destinations outside this seven-page set link to the existing website.

Concept 3's design character is preserved: a warm linen canvas, broad landscape heroes, charcoal sans-serif headlines, Georgia editorial body/section type, restrained clay bands and open service grids. P1's original logo anchors the header and footer. The copy has not been replaced with generic concept slogans.

One new generated grading illustration is used on the grading page. The prompt and tool provenance are in [IMAGE_PROMPT.md](IMAGE_PROMPT.md). Other imagery reuses the site's assets, with some live-only images referenced from their existing public URLs. All illustrative imagery is labelled, and no completed P1 project is fabricated.

Forms retain the current visible fields, but submission is intercepted locally and displays “Mockup preview only. Nothing was sent to P1.” No backend is connected. The disconnected verification spinner and hidden spam-trap field are intentionally omitted from this visual simulation. Production forms and their security remain untouched.

Validation: 408 substantive text passages checked against rendered content on seven pages at 1440px, 820px and 390px. All 21 checks passed: one H1, no horizontal page overflow, no missing checked copy or broken completed images. Header/footer logo references point to the exact original asset. Keyboard menu and FAQ expansion were exercised; sample contact values reached the local preview status. Captures for all seven pages at all three widths are in `captures/`. These checks do not establish full accessibility compliance or production readiness.

Regenerate with `python3 docs/design-exploration/concept-3-refinement/build.py`. The generator writes only inside this isolated refinement directory. No production source, content, API, database or deployment changes were made.
