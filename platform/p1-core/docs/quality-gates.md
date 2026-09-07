# Quality Gates

This document describes the quality checks available in the Core Platform codebase and how to use them.

## Available Scripts

| Script           | Command             | Purpose                                               |
| ---------------- | ------------------- | ----------------------------------------------------- |
| Migration verify | `npm run db:verify` | Applies migrations to an isolated PostgreSQL database |
| Type-check       | `npm run check`     | Runs `tsc` to validate TypeScript types               |
| Lint             | `npm run lint`      | Runs ESLint across client, server, and shared code    |
| Format (check)   | `npm run format`    | Runs Prettier in check mode (reports issues only)     |
| Test             | `npm test`          | Runs Vitest unit tests                                |
| Build            | `npm run build`     | Builds the production client and server bundles       |
| Bundle budget    | `npm run budget`    | Checks production asset sizes after a build           |

## Running Checks Locally

Before pushing code, run the full quality suite:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/core_platform npm run db:verify
npm run check
npm run lint
npm run format
npm test
npm run build
npm run budget
```

All commands must pass cleanly before a pull request is ready to merge.

## Lint

ESLint is configured in `eslint.config.js` using the flat config format with:

- ESLint recommended rules
- TypeScript-ESLint recommended rules
- Unused variable warnings (with `_` prefix exceptions)
- Explicit `any` warnings (not errors)

To auto-fix lint issues:

```bash
npx eslint --fix client/src server shared
```

## Format

Prettier is configured in `.prettierrc` and runs in **check-only mode** by default (no auto-rewriting). Files in `node_modules`, `dist`, `build`, and `migrations` are excluded via `.prettierignore`.

To auto-format files:

```bash
npx prettier --write client/src server shared
```

## Tests

Tests use [Vitest](https://vitest.dev/) and are co-located with the source files they test (e.g., `server/utils/logger.test.ts`).

Test files are included in type validation via `tsconfig.test.json`, which extends the main `tsconfig.json` but adds `**/*.test.ts` to its include list.

### Adding New Tests

1. Create a file named `*.test.ts` next to the module you want to test.
2. Import `describe`, `it`, `expect` (and `vi` for mocks) from `vitest`.
3. Keep tests pure and fast — no database or network calls in unit tests.
4. Run `npm test` to verify your tests pass.

### Running Tests in Watch Mode

```bash
npx vitest --watch
```

## Bundle Budget

`npm run budget` reads `dist/public/assets`, so run `npm run build` first. The budget is intentionally practical rather than theoretical: it watches the first-load entry files, the shared vendor chunk, and known heavy optional chunks such as Stripe, maps, charts, Tiptap, and ProseMirror.

When a budget fails, do not simply raise the number. First check whether a module-only dependency has drifted into a shared chunk, whether a page is importing a heavy editor/chart/map library eagerly, or whether a new feature should be lazy-loaded behind route or component boundaries.

Current guardrails expect app-level routes such as CRM and ecommerce to stay lazy loaded instead of inflating the initial public bundle.

## CI Workflow

The tracked GitHub Actions quality workflow runs automatically on every push and pull request. It executes:

1. `npm ci` — clean install of dependencies
2. Apply migrations twice to the workflow's isolated PostgreSQL 16 service
3. `npm run check` — type-checking
4. `npm run lint` — linting
5. `npm run format` — formatting check
6. `npm test` — unit tests
7. Run backup, managed-form and reservation reliability tests against dedicated disposable databases in New York and UTC process timezones
8. `npm run build` — production bundle verification
9. `npm run budget` — production asset size budget
10. Start the compiled production bundle in isolated Linux with verified TLS PostgreSQL, verify readiness and Node PID 1, then require graceful SIGTERM exit
11. Install Chromium and run `playwright.app.config.ts` against the actual Express/Vite application and disposable PostgreSQL

All steps must pass for the CI run to be green. The workflow uses Node.js 20 and npm's lockfile cache; it does not use production credentials or contact client services.

## Conventions

- **Do not disable lint rules** without a comment explaining why.
- **Prefer `warn` over `error`** for rules that are aspirational rather than critical.
- **Test file naming**: `<module>.test.ts` co-located with the source file.
- **No mocked/stubbed database tests** in unit test files — those belong in integration tests (out of scope for now).

## Real application browser tests

`BROWSER_TEST_DATABASE_URL=postgresql://test:test@localhost:5432/core_browser_test npm run test:e2e`
runs desktop and mobile journeys after `npx playwright install chromium`. Provision the dedicated
local `core_browser_test` database first. The launcher rejects non-loopback destinations and URL
overrides, ignores ordinary DATABASE_URL/.env/provider credentials, seeds synthetic admin and CRM
editor users, runs migrations, and starts the actual app. It never reuses an existing web server.

The suite checks every ecommerce settings route, persisted CRM presentation changes through the
UI and reload, and CRM editor read/write permissions. It does not prove payment-provider sandbox
transactions or all CRM lifecycle flows; those remain separate release gates.

`npm run test:e2e:layout` retains the earlier synthetic CSS layout checks. Those fixture checks are
not evidence that an actual application journey works.
