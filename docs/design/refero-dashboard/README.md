# P1 dashboard system theme

The Owner supplied these four Refero exports on September 19, 2026 as the dashboard's visual foundation: https://styles.refero.design/style/0fd67ec5-7e9c-4ca9-b368-5d9c7388477a. The exports are preserved unchanged here. Refero MCP could not resolve the style UUID; the visible reference and supplied exports establish provenance.

The dashboard imports `src/refero-variables.css` (the exported variables with the invalid `48-80px` range converted to a CSS clamp), then adapts existing HSL semantic tokens in `src/theme.css`. This preserves component contracts without adding Tailwind or changing the public website. Dashboard typography uses self-hosted Geist Latin variable font from @fontsource-variable/geist 5.3.0 under its included SIL Open Font License. Its 100–900 weight range covers existing component weights. No runtime font provider request is needed; the service worker caches the font for offline use.

There is one fixed light theme. The appearance control and dark token set are removed. Pre-render initialization ignores legacy saved theme choices and operating-system dark mode. A future dark theme requires a separate reviewed implementation.

Owner-directed exceptions to the source's monochrome guidance: preserve colorful navigation/workspace icons (without added icon backgrounds), P1 brand artwork, map pins, and meaningful operational status colors. Destructive red follows the reference's explicit destructive-state guidance, rather than its conflicting decorative palette description. Keep accessible focus outlines, 44px touch controls, readable tables, existing responsive breakpoints and real maps. Container width follows the 1280px reference; content remains fluid at smaller widths. Card and form geometry use the exported 24px and 18px named radii. Tab underlines and map controls retain their functional shapes.

Validation: dashboard TypeScript and production build pass (existing large-chunk warning remains); five pre-render theme regression checks pass. Local login UI visually inspected; local API was not running, so authenticated flows are verified after deployment. No API, data model, account, authorization or public-site branding changes.

Rollback: revert the scoped theme commit and redeploy. No data migration is required.
