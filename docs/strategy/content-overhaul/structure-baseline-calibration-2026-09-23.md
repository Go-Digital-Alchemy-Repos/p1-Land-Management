# WP4 structure baseline calibration — September 23, 2026

The baseline is the source-default SSR prerender of all 54 static public routes
from `origin/main` `6c9cf25a66d8c0fe76bc61a6b1c6ee54f7c63469`, before WP3 copy edits.
It is committed separately from those edits on `codex/wp3-copy-update`.

The lock records ordered images in `<main>` (normalized source, content SHA-256,
width and height), the ordered element skeleton through depth three plus deeper
semantic sections, and the positions of the hero, map, sidebar, CTA band,
service cards and FAQ. The homepage hero snapshot includes the eyebrow, exact
Owner-approved H1 and subheading, buttons and trust row. The script asserts the
approved H1 and subheading even when writing a new baseline.

## Calibration actually run

The first two builds ran in the isolated WP3 worktree; Vite cleared its output,
and the second build began after moving the preceding `dist` out of that
worktree. The third build ran in a fresh second worktree at the same commit.
All used `TZ=America/New_York`, a fixed SSR clock of
`2026-09-23T16:00:00.000Z`, and `P1_CMS_CONTENT_OVERLAY=disabled`.

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile --offline` | Exit 0; 712 cached packages installed. |
| `node artifacts/p1-website/scripts/snapshot-structure.mjs --write` | Exit 0; wrote 54 routes. |
| `TZ=America/New_York P1_STRUCTURE_CLOCK=2026-09-23T16:00:00.000Z P1_CMS_CONTENT_OVERLAY=disabled pnpm --filter @workspace/p1-website build` | Exit 0 on build 1 and build 2; each printed `Prerendered 54 routes`, public content guard PASS, and `PASS structure lock: 54 routes match baseline`. |
| `pnpm install --frozen-lockfile --offline` in fresh second worktree | Exit 0; 712 cached packages installed. |
| Same fixed-clock website build in second worktree | Exit 0; `PASS structure lock: 54 routes match baseline`. |
| `git diff --check` | Exit 0. |

The build retains pre-existing Vite sourcemap-location and large-chunk warnings.
No route mismatch occurred.

For the negative check, a scratch branch `codex/wp4-negative-calibration`
temporarily removed the homepage hero `<img>` and the entire trust-strip
`<section>` from `src/pages/home.tsx`. The commands were
`pnpm exec vite build --config vite.config.ts`,
`TZ=America/New_York P1_STRUCTURE_CLOCK=2026-09-23T16:00:00.000Z node scripts/prerender.mjs`,
and `node scripts/snapshot-structure.mjs --check`. The checker exited 1 and
named both `/: images[0] changed` (the removed hero image) and
`/: skeleton[10] changed` (the removed `section.border-b border-border bg-white py-7`).
The scratch source and generated manifests were restored; the scratch worktree
is clean. No negative-test edit is committed or released.

## Intentional exclusions and limits

- Google review section descendants are omitted because live API reviews may
  replace card counts and details. The section's own place remains locked.
- Text outside the homepage hero is excluded so WP3 can edit copy. Homepage
  hero text is locked word for word.
- Vite asset filename hashes are removed from image paths; a separate content
  SHA-256 detects a changed image file at the same source path.
- Repeated `LocationPage.sections` use their first template instance in the
  skeleton because the plan allows those data-driven lists to change length.
  The surrounding container, FAQ and links positions remain locked.
- Dates, review counts and other text-only dynamic values are absent from the
  structural comparison. A fixed SSR clock removes seasonal date drift during
  calibration.

This baseline does not authorize WP3 copy work. The Owner checkpoint after WP0,
WP2 and this baseline remains in force.
