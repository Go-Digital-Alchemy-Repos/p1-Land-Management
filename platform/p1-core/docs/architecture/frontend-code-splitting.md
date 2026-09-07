# Frontend Code Splitting & Query Freshness Strategy

## Code Splitting

### Route-Level Splitting

All page components in `client/src/App.tsx` use `React.lazy()` for dynamic imports:

```typescript
const DirectoryPage = lazy(() => import("@/features/directory/directory-page"));
const TherapistProfilePage = lazy(() => import("@/features/directory/therapist-profile-page"));
```

A `<Suspense>` wrapper with a `<PageLoader>` spinner displays while chunks load.

### Heavy Dependency Chunks

Vite manual chunk rules keep common heavy dependencies out of unrelated routes:

- `stripe` — checkout-only payment libraries
- `maps` — MapLibre and React Map GL; Vite emits a separate `maplibre-gl-worker` asset for vector tile processing
- `charts` — Recharts
- `tiptap` and `prosemirror` — CMS/editor tooling
- `carousel` — Embla carousel
- `vendor` — shared React/admin dependencies

When adding a new module, avoid importing heavyweight libraries from shared layout, route registration, navigation, or generic utility files. Import them from the lazy page/component that actually needs them.

### Component Organization

- **`client/src/features/`** — Page-level components grouped by domain (admin, auth, directory, public, therapist)
- **`client/src/components/`** — Shared and reusable components (auth dialogs, layout, UI primitives)
- **`client/src/lib/`** — Utilities, query client config, theme presets

## Query Freshness Strategy

### Global Defaults

Configured in `client/src/lib/queryClient.ts`:

```typescript
staleTime: 5 * 60 * 1000,   // 5 minutes
gcTime: 10 * 60 * 1000,     // 10 minutes (garbage collection)
refetchOnWindowFocus: false,
retry: false,
```

### Query Categories

| Category  | Example Queries                                   | Effective staleTime                              |
| --------- | ------------------------------------------------- | ------------------------------------------------ |
| Static    | Specializations list, theme presets, SEO settings | `STALE_TIMES.STATIC` where explicitly configured |
| Session   | Current user (`/api/auth/me`), setup status       | 5 min global default                             |
| Live      | Notifications, dashboards                         | 1 min where explicitly configured                |
| Paginated | Directory results, admin lists                    | Cache key includes page/filters                  |

## Bundle Budget

Run production bundle checks after a build:

```bash
npm run build
npm run budget
```

The budget script reports the largest assets and fails when route chunks or known vendor chunks exceed their thresholds. Treat a failure as a design signal: split the dependency, move it behind a lazy boundary, or remove it from the route before raising the budget.

### Cache Invalidation Patterns

- **Auth mutations** (login, register, logout): Invalidate `/api/auth/me` and related queries
- **CRUD mutations**: Invalidate the specific resource query key after create/update/delete
- **Hierarchical keys**: Array-based query keys (e.g., `['/api/therapists', id]`) allow targeted invalidation

### Data Fetching Patterns

- Default fetcher is configured globally — queries only need `queryKey`
- Mutations use `apiRequest()` from `queryClient.ts` for POST/PATCH/DELETE
- `queryClient.invalidateQueries()` is called after mutations to refresh data
