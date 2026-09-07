# P1 Land Management

P1 Land & Property Management website workspace.

## Run & Operate

- `npx --yes pnpm@11.7.0 install --frozen-lockfile` - install dependencies.
- `npx --yes pnpm@11.7.0 run typecheck` - typecheck workspace libs and runnable artifacts.
- `npx --yes pnpm@11.7.0 --filter @workspace/p1-website check:faq` - validate FAQ JSON-LD.
- `npx --yes pnpm@11.7.0 --filter @workspace/p1-website build` - build and prerender the production website.
- `npx --yes pnpm@11.7.0 run build` - run the full workspace build.
- `npx --yes pnpm@11.7.0 --filter @workspace/p1-website serve` - preview the built site locally.

## Stack

- pnpm workspaces, Node.js 22+ locally and in Docker, TypeScript 5.9.
- Website: Vite 7, React 19, Wouter, Tailwind CSS 4.
- SEO: static prerendering, generated sitemap, robots.txt, page-level metadata and JSON-LD.
- API skeleton: Express 5 with `/api/healthz`.
- Deployment: Railway Dockerfile serving `artifacts/p1-website/dist/public`.

## Where Things Live

- Website source: `artifacts/p1-website/src`.
- Website routes: `artifacts/p1-website/src/App.tsx`.
- Shared business constants: `artifacts/p1-website/src/lib/site.ts`.
- Sitemap/prerender/FAQ checks: `artifacts/p1-website/scripts`.
- Railway deploy config: `Dockerfile` and `railway.json`.
- API server: `artifacts/api-server/src`.

## Gotchas

- Use pnpm, not npm or yarn. The root preinstall hook enforces this.
- The production site is static/prerendered; route coverage depends on the static routes declared in `App.tsx`.
- Local macOS ARM QA needs native Rollup/esbuild/Tailwind/Lightning CSS optional packages in the lockfile.
- Website and mockup Vite configs default `PORT` and `BASE_PATH` for local builds; Railway still supplies `PORT` at runtime.
- Large PNG assets are the main known performance debt.
