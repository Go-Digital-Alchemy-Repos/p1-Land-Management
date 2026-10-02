# P1 design exploration

**MOCKUP ONLY — NOT IMPLEMENTED**

Start with [Final presentation](FINAL_PRESENTATION.md) and the [complete visual review](mockups/index.html).

- [UX audit](UX_AUDIT.md)
- [Experience inventory](EXPERIENCE_INVENTORY.md)
- [Audiences and journeys](AUDIENCE_AND_INTENT.md)
- [Research and reference locks](DESIGN_RESEARCH.md)
- [Photography audit](PHOTOGRAPHY_AUDIT.md)
- [Design system](DESIGN_SYSTEM.md)
- [Decisions](DESIGN_DECISIONS.md)
- [Coverage](MOCKUP_COVERAGE.md)
- [Critique](MOCKUP_CRITIQUE.md)
- [Owner decisions](OWNER_REVIEW.md)
- [Validation](VALIDATION.md)

All files are isolated in `docs/design-exploration`. Existing source and unrelated uncommitted work remain untouched. The three generated visual boards are exploratory; exact text and factual boundaries live in the editable HTML.

For local review: `python3 -m http.server 8766 --bind 127.0.0.1 --directory docs/design-exploration`, then open `http://127.0.0.1:8766/mockups/index.html`.

Regenerate isolated screens: `python3 docs/design-exploration/build_review.py`. Regenerate inventories/docs: `python3 docs/design-exploration/write_documentation.py`. Neither script edits production.
