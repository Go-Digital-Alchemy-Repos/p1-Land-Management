**Comparison Target**

- Source visual truth: `/Users/mikedickerman/Desktop/Screenshot 2026-09-21 at 12.19.45 AM.png` (440 × 956) for the prior mobile menu; `/private/var/folders/5q/z8zp8fjx4hn52fnvw00hqts00000gn/T/TemporaryItems/NSIRD_screencaptureui_qRE5Ul/Screenshot 2026-09-21 at 12.23.19 AM.png` (442 × 957) for the existing mobile action bar.
- Implementation evidence: browser-rendered capture in the Codex in-app browser at `http://127.0.0.1:4173/services/land-clearing`, 390 × 844 CSS px, device scale factor 1. The browser surface does not expose a durable screenshot-file path; the rendered open-menu and expanded-services captures are preserved in this task's visual review.
- State: mobile navigation open; second pass with Property services expanded. The reference is a baseline, not a pixel-match target: the requested outcome intentionally replaces its flat drawer with an iOS-inspired navigation sheet.

**Findings**

- No actionable P0/P1/P2 findings remain.
- [P3] The reference's original menu kept every service visible at rest; the redesigned version intentionally collapses that long directory into a clearly labeled Property services control. The first screen is calmer and the sticky call/assessment actions remain visible. No change required.

**Required Fidelity Surfaces**

- Fonts and typography: the existing Manrope/Fraunces pairing is preserved. Navigation labels use compact sans-serif hierarchy, avoid truncation at 390 px, and retain readable weights.
- Spacing and layout rhythm: the sheet uses grouped rows, 44 px-or-larger controls, consistent 16–20 px interior spacing, and fixed bottom actions. The expanded service list scrolls within the sheet instead of pushing actions away.
- Colors and visual tokens: existing P1 primary blue, deep navy, clay, green, background, border, and muted tokens are reused. The blurred overlay and restrained elevation add iOS-like depth without introducing a competing palette.
- Image quality and asset fidelity: the existing P1 vector logo is retained; no visible image asset was replaced. Standard navigation icons use the existing Lucide icon family.
- Copy and content: every existing destination remains available, including Commercial Site Management first in the service list and emphasized Service Areas last. The persistent action text remains Get a Free Site Assessment; Call P1 gains a visible phone icon.
- Accessibility and interaction: the menu keeps its dialog semantics, Escape-close behavior, focus return, close label, visible focus treatment, semantic navigation, labeled expandable services control, and coarse-pointer targets. `prefers-reduced-motion` remains respected by the global style.

**Comparison History**

1. Initial rendered mobile-menu review found the services disclosure affordance too visually subtle when separated from its parent row. Fixed by making the entire Property services row the expandable control and moving Browse all services into the revealed list.
2. Post-fix browser review at 390 × 844 confirmed a visible chevron, usable close control, expanded service links, persistent call and assessment actions, no console errors, and `390px` document width on `/services/land-clearing`.

**Implementation Checklist**

- [x] Rework mobile menu into an iOS-inspired sheet with grouped navigation.
- [x] Add an expandable service directory and retain all service destinations.
- [x] Improve mobile trigger, overlay, close control, and transition feedback.
- [x] Add a phone icon and touch-first styling to Call P1 in the persistent action bar.
- [x] Verify type checking, navigation checks, layout checks, production build, and browser interactions.

**Follow-up Polish**

- [P3] If product analytics later shows high service-menu use, consider remembering the disclosure state for the current session. This is intentionally not added now so the navigation remains predictable and stateless.

final result: passed
