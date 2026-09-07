# P1 Land Management

Marketing site and supporting workspace for P1 Land & Property Management.

Project scope and current delivery state: [Master plan](docs/MASTER_PLAN.md), [task register](docs/TASKS.md), [implementation evidence](docs/implementation-status.md), and [business dashboard preview/remaining work](docs/dashboard/README.md). The [commercial sales initiative](docs/initiatives/commercial-industrial-sales.md) is planned, not yet implemented.

## Applications and release status

- `artifacts/p1-website` - React marketing site with published CMS server rendering; current implementation is awaiting production release.
- `platform/p1-core` - P1-owned CMS/CRM copy, separate build/database, proxied at `/admin` and `/api`.
- `artifacts/p1-dashboard` and `artifacts/api-server/src/dashboard` - business web/worker preview, separate service/database; unfinished scope is recorded in its README.
- `artifacts/mockup-sandbox` - local design/mockup sandbox used during website iteration.
- `lib/api-spec`, `lib/api-client-react`, `lib/api-zod`, `lib/db` - shared API/schema/client packages.

## Local Setup

Use pnpm through Corepack or the pinned pnpm version:

```sh
npx --yes pnpm@11.19.0 install --frozen-lockfile
```

Common checks:

```sh
npx --yes pnpm@11.19.0 run typecheck
npx --yes pnpm@11.19.0 --filter @workspace/p1-website check:faq
npx --yes pnpm@11.19.0 --filter @workspace/p1-website build
npx --yes pnpm@11.19.0 run build
```

Run the production site locally:

```sh
npx --yes pnpm@11.19.0 --filter @workspace/p1-website serve
```

The Vite configs default to local ports when `PORT` is not set:

- P1 website: `4173`
- Mockup sandbox: `4174`

Railway still provides `PORT` in production.

## Deployment

Railway builds from the root `Dockerfile`:

1. Install workspace dependencies with `pnpm install --frozen-lockfile`.
2. Build the website with `PORT=4173 BASE_PATH=/ pnpm --filter @workspace/p1-website build`.
3. Run the non-root Node server with `node server/index.mjs`; render published content and proxy the isolated backend.

Production domain constants live in `artifacts/p1-website/src/lib/site.ts`.
Robots and sitemap files live in `artifacts/p1-website/public`.

## QA Notes

- The website build prerenders every static route declared in `artifacts/p1-website/src/App.tsx`.
- `check:faq` validates page-level FAQPage JSON-LD across the route set.
- Responsive WebP/AVIF variants, route splitting and public budget checks are implemented locally. Production and field-performance verification remain distinct release gates.
