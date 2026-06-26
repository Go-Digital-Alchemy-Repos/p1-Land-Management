---
name: P1 heading font token & editorial hero
description: Why P1 headings can look like Inter, and that the editorial hero is a shared component
---

# Heading font token is headings-only
- The serif font token drives ALL headings (the base `h1..h6` rule uses it); non-heading text was deliberately moved off it. So whatever face that token holds is the heading face.
- **Trap:** it was set to a *sans-serif* (Barlow), so headings looked indistinguishable from the Inter body and users reported "headings became Inter." Setting the token to the serif display face (Fraunces) fixes every heading at once.
- **Why:** brand direction = Inter for all non-heading text, a display *serif* for headings (see `p1-brand-direction.md`).
- **How to apply:** change the global heading face via that one token, not per page; never put a sans face in it or headings stop reading as distinct.

# Editorial hero is shared
- The "Editorial" hero (low-opacity image + diagonal navy wash + topographic contour lines + kicker eyebrow + serif headline with optional tan accent) is a single reusable component used by every interior page; the home page keeps its own bespoke variant with extra elements.
- **How to apply:** new pages should reuse the shared hero for consistency rather than hand-rolling a hero.
