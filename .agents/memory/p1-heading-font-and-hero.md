---
name: P1 heading font token & editorial PageHero
description: Why P1 headings looked like Inter (Barlow token) and how the editorial hero is shared
---

# Heading font token
- `--app-font-serif` in `artifacts/p1-website/src/index.css` drives ALL headings (base `h1..h6` rule uses `font-serif`). A prior sweep moved every non-heading element off `font-serif`, so that token is now **headings-only**.
- It was set to **Barlow**, which is itself a *sans-serif* — so headings looked nearly identical to the Inter body and users read them as "Inter". Fix was to point the token at **Fraunces** (the editorial display serif), flipping every heading in one line.
- **Why:** brand direction = Inter for all non-heading text, Fraunces display serif for headings (see `p1-brand-direction.md`).
- **How to apply:** to change the global heading face, edit the `--app-font-serif` token, not individual pages. Don't reintroduce a sans font into that token or headings stop reading as distinct.

# Editorial hero is a shared component
- The "Editorial" hero treatment (low-opacity bg image + diagonal navy wash + `ContourField` topographic lines via soft-light + bottom fade + clay kicker eyebrow + left-aligned Fraunces headline w/ optional tan `<em>` accent) lives in `artifacts/p1-website/src/components/layout/PageHero.tsx` and is used by every interior page. The home page (`pages/home.tsx`) keeps its own bespoke inline version (has the "Index of Work" side panel + CTAs).
- **How to apply:** new pages should use `<PageHero>` for visual consistency; only touch `home.tsx`'s inline hero for home-specific tweaks.
