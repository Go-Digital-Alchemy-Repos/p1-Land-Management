# ADR-001: CMS Hybrid Rendering

## Status

Accepted

## Context

The application needs both static pages (home, about, contact, join) and dynamic CMS-managed content. We needed to decide between:

1. Fully hardcoded React pages
2. Fully CMS-driven rendering
3. A hybrid approach

## Decision

We chose a **hybrid rendering** model via `CmsHybridPage`. For key routes (home, about, contact, join), the component first checks if a CMS page exists for that slug. If CMS content is available, it renders the block-based page builder output. If not, it falls back to the hardcoded React component.

```tsx
<Route path="/" component={() => <CmsHybridPage slug="home" fallback={<HomePage />} />} />
```

## Consequences

- **Positive**: Content editors can customize pages without code changes while maintaining a functional fallback
- **Positive**: New pages can be created entirely in the CMS without developer involvement
- **Negative**: Two rendering paths to maintain (CMS blocks and React components)
- **Negative**: Block renderer (`block-renderer.tsx`, 1481 lines) and block registry (`block-registry.ts`, 1108 lines) are large files
- **Trade-off**: CMS pages require the block builder's component library to match the visual quality of hardcoded pages
