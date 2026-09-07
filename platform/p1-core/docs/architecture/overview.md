# Core Platform — Architecture Overview

## Deployment and Public-Site Model

Near-term delivery follows the canonical [Client Migration Master Plan](../core-project-plan.md): one
Core Platform application and database per client, paired with one separately built static React site.
This is not a shared multi-tenant runtime. Imported sites supply versioned manifests, Puck registrations,
and design-system adapters so enabled bolt-on pages inherit the client's visual system.

The current repository still bundles its existing public SPA with the dashboard/API. Separating the
client public site is target architecture and remains behind the manifest, origin, route, authentication,
publishing, and release contracts in Milestones 1–3.

The target routes the public site's browser API calls through same-origin `/api` to Core Platform where
feasible, while the dashboard remains on a protected admin subdomain with its own same-origin API path.
The onboarding domain wizard produces exact provider-neutral DNS instructions and performs read-only
DNS/TLS/routing verification. An operator applies the records manually at the chosen provider; Core
Platform neither requests provider credentials nor mutates DNS.

## Tech Stack

| Layer            | Technology                             | Notes                                                                                          |
| ---------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Frontend         | React 18 + TypeScript                  | Vite bundler, SPA with route-level code splitting via `React.lazy()`                           |
| Routing (client) | wouter                                 | Lightweight alternative to React Router                                                        |
| State / Data     | TanStack Query v5                      | Global defaults: `staleTime: 5min`, `gcTime: 10min`                                            |
| UI Framework     | shadcn/ui + Tailwind CSS               | Dark mode via class strategy, theme presets system                                             |
| Backend          | Express 5 (TypeScript)                 | Runs on Node.js with HTTP server                                                               |
| ORM              | Drizzle ORM                            | PostgreSQL driver via `pg` and `drizzle-orm/node-postgres`                                     |
| Database         | PostgreSQL                             | Hosted on Railway, with application access over Railway private networking                     |
| Auth             | JWT (HTTP-only cookies)                | `bcryptjs` for password hashing, 7-day token expiry                                            |
| Payments         | Stripe                                 | Directory application fees, membership subscriptions, ecommerce checkout, and webhook handling |
| File Storage     | Cloudflare R2                          | For media uploads, career resumes, images, recordings, and public asset delivery               |
| Email            | Custom email service                   | Template-based with `email.service.ts`                                                         |
| Logging          | Pino                                   | Structured logging with named sources and request IDs                                          |
| Security         | Helmet, rate limiting, origin checking | CSP headers, per-endpoint rate limits                                                          |
| Feature Apps     | Settings-backed toggles                | Directory, blog, events, CRM, ecommerce, membership, careers, and portfolio availability       |

## Folder Structure

```
├── client/
│   └── src/
│       ├── App.tsx                  # Main router with lazy-loaded pages
│       ├── components/
│       │   ├── auth/                # Login/register dialogs
│       │   ├── directory/           # Directory-specific components
│       │   ├── layout/              # Site layout components
│       │   ├── shared/              # Shared components (editors, SEO, theme)
│       │   └── ui/                  # shadcn/ui primitives
│       ├── features/
│       │   ├── admin/               # Admin dashboard, CMS, blog, CRM, ecommerce, membership, portfolio, careers, applications
│       │   ├── auth/                # Auth pages (login, register, reset)
│       │   ├── directory/           # Therapist directory and profile pages
│       │   ├── ecommerce/           # Shop, product detail, cart, checkout, order status
│       │   ├── public/              # Public pages (home, about, events, insights, careers, portfolio, membership)
│       │   └── therapist/           # Therapist dashboard, profile edit, subscription
│       ├── hooks/                   # Custom React hooks
│       └── lib/                     # Utilities, query client, theme presets
├── server/
│   ├── index.ts                     # Express app bootstrap, middleware pipeline
│   ├── db.ts                        # Drizzle database connection
│   ├── migrate.ts                   # Production migration runner
│   ├── middleware/
│   │   ├── auth.ts                  # JWT auth, role-based access
│   │   ├── security.ts              # Helmet, rate limiters, origin check
│   │   ├── error-handler.ts         # Error handling, async wrapper
│   │   └── validation.ts            # Request body validation middleware
│   ├── routes/
│   │   ├── index.ts                 # Route registration hub
│   │   ├── admin/                   # Admin-only routes for CMS, directory, CRM, ecommerce, membership, careers, portfolio, etc.
│   │   ├── directory.routes.ts      # Public therapist directory
│   │   ├── auth.routes.ts           # Login, register, password reset
│   │   ├── stripe.routes.ts         # Directory subscription Stripe checkout/portal/webhooks
│   │   ├── ecommerce.routes.ts      # Public ecommerce catalog, pricing, checkout, lookup
│   │   ├── membership.routes.ts     # Public membership plans, checkout, portal, entitlements
│   │   ├── careers.routes.ts        # Public jobs, applications, feeds, integration endpoints
│   │   ├── portfolio.routes.ts      # Public portfolio archive/detail/settings
│   │   ├── application.routes.ts    # Therapist application flow
│   │   └── ...                      # Events, blog, CMS, contacts, etc.
│   ├── services/
│   │   ├── email.service.ts         # Email template rendering and sending
│   │   ├── r2.service.ts            # Cloudflare R2 file operations
│   │   ├── background-check.service.ts
│   │   ├── crm.service.ts
│   │   ├── ecommerce-order.service.ts
│   │   ├── ecommerce-pricing.service.ts
│   │   ├── ecommerce-stripe.service.ts
│   │   ├── membership-access.service.ts
│   │   ├── careers.service.ts
│   │   ├── portfolio.service.ts
│   │   ├── public-search.service.ts
│   │   ├── editor-locks.service.ts
│   │   └── scheduled-publish.service.ts
│   ├── storage/                     # Data access layer, grouped by platform domain
│   │   ├── index.ts                 # Storage facade aggregating all stores
│   │   ├── therapist.storage.ts     # Therapist profiles with pagination/filtering
│   │   ├── application.storage.ts   # Provider application workflow
│   │   └── ...
│   ├── utils/
│   │   ├── logger.ts                # Pino-based structured logger
│   │   ├── metrics.ts               # In-memory request metrics
│   │   └── params.ts                # Express param helpers
│   └── webhooks/
│       ├── stripe.handler.ts        # Subscription Stripe webhook event processing
│       └── ecommerce-stripe.handler.ts # Ecommerce Stripe webhook event processing
├── shared/
│   ├── schema/                      # Drizzle table definitions grouped by platform domain
│   │   ├── index.ts                 # Re-exports all schemas
│   │   ├── users.ts
│   │   ├── therapist-profiles.ts
│   │   ├── provider-applications.ts # Multi-step application workflow
│   │   └── ...
│   └── types/
│       ├── index.ts                 # Shared TypeScript types and enums
│       └── directory.ts             # Directory search params schema
└── docs/                            # Developer documentation (this folder)
```

## Data Flow

1. **Client → Server**: React components use TanStack Query to make HTTP requests to `/api/*` endpoints. Mutations use `apiRequest()` from `queryClient.ts`.

2. **Server → Storage**: Express route handlers call methods on the `storage` facade (`server/storage/index.ts`), which delegates to domain-specific storage classes.

3. **Storage → Database**: Storage classes use Drizzle ORM query builders to interact with PostgreSQL. All table definitions live in `shared/schema/`.

4. **Auth Flow**: JWT tokens are stored in HTTP-only cookies (`corePlatform_token`). The `authenticateToken` middleware verifies tokens and attaches the user to `req.user`. Role-based access is enforced via `requireRole()`.

5. **File Uploads**: Files are uploaded to Cloudflare R2 via `r2.service.ts`. The upload route handles multipart form data and returns the R2 URL.

6. **Payments**: Stripe handles directory application/subscription flows, membership checkout/portal sessions, and ecommerce checkout. Keep those integrations separate unless a service explicitly shares configuration.

7. **CMS**: A hybrid rendering system allows pages to be served from the CMS block builder or fall back to hardcoded React components. The `CmsHybridPage` component checks for CMS content first.

8. **Feature Apps**: The frontend reads `/api/site-config` and the server reads `system_configuration` settings to decide which major apps are active. Feature gates hide or reject unavailable app surfaces without deleting data.

9. **Search & Discovery**: Public search aggregates fallback pages and enabled content modules through `public-search.service.ts`.

10. **Collaboration**: Admin/editor workflows use editor locks for long-lived edits and notifications for user-facing activity.
