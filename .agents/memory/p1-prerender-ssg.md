---
name: P1 prerender/SSG pipeline
description: How the p1-website build emits static SEO HTML per route and the traps around static serving and SSR head collection.
---

# P1 prerender pipeline

The p1-website build runs `vite build` then `scripts/prerender.mjs`, which builds an SSR bundle (`src/entry-server.tsx`) and renders every static route from `App.tsx` into `dist/public`.

**Rules that must hold:**
- The `<SEO />` component collects head data via an SSR collector (`src/lib/ssr-head.ts`) during render; the browser path still uses `useEffect`. Every indexable page must render `<SEO />` or the prerender build fails on purpose.
- `index.html` contains `<!--seo-head-start-->`/`<!--seo-head-end-->` markers the prerender replaces. Don't remove them.
- **Why flat `.html` files exist:** static servers with an SPA rewrite (`/* -> /index.html`) resolve extensionless URLs like `/about` to `about.html` *before* falling back — but they skip `about/index.html` and serve the home page instead. So prerender writes both `<route>/index.html` and `<route>.html`.
- Client `main.tsx` hydrates when `#root` has children (prerendered) and falls back to `createRoot` in dev.

**How to apply:** when adding routes, nothing extra is needed (routes are parsed from `App.tsx`, same as the sitemap script), but new pages must include `<SEO />`.
