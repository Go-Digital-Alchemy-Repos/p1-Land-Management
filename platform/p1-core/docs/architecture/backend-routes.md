# Backend Route Organization

## Route Registration

All API routes are registered in `server/routes/index.ts` via `registerApiRoutes(app)`. Routes are organized by domain and mounted under `/api/`.

## Route Map

| Mount Point                  | File                             | Auth                  | Description                                                                |
| ---------------------------- | -------------------------------- | --------------------- | -------------------------------------------------------------------------- |
| `/api/auth`                  | `auth.routes.ts`                 | Public                | Login, register, password reset, current user                              |
| `/api/therapists`            | `directory.routes.ts`            | Public                | Therapist directory listing, filters, featured, profile detail             |
| `/api/therapist`             | `therapist.routes.ts`            | Therapist             | Therapist dashboard data                                                   |
| `/api/therapist/application` | `application.routes.ts`          | Therapist             | Multi-step provider application workflow                                   |
| `/api/stripe`                | `stripe.routes.ts`               | Mixed                 | Subscription checkout, portal, subscription management, webhook            |
| `/api/admin/*`               | `admin/index.ts`                 | Admin                 | All admin routes (see below)                                               |
| `/api/events`                | `events.routes.ts`               | Public                | Event listing, detail                                                      |
| `/api/events`                | `registration.routes.ts`         | Mixed                 | Event registration (RSVP, tickets)                                         |
| `/api/contact`               | `contact.routes.ts`              | Public                | Contact form submissions                                                   |
| `/api/forms`                 | `forms.routes.ts`                | Public/Admin mixed    | Public form definitions and submissions                                    |
| `/api/crm`                   | `crm.routes.ts`                  | API key               | Inbound CRM lead intake                                                    |
| `/api/ecommerce`             | `ecommerce.routes.ts`            | Public, feature-gated | Storefront catalog, cart pricing, checkout, order lookup                   |
| `/api/membership`            | `membership.routes.ts`           | Mixed, feature-gated  | Public plans, current-user membership, checkout, customer portal           |
| `/api/careers`               | `careers.routes.ts`              | Public, feature-gated | Career settings, filters, jobs, applications, feeds, integration endpoints |
| `/api/portfolio`             | `portfolio.routes.ts`            | Public, feature-gated | Portfolio settings, filters, project listing, project detail               |
| `/api/contact-professional`  | `contact-professional.routes.ts` | Public (rate-limited) | Guest message to a therapist                                               |
| `/api/admin/docs`            | `docs.routes.ts`                 | Admin                 | Internal document management                                               |
| `/api/uploads`               | `upload.routes.ts`               | Auth                  | File upload to R2                                                          |
| `/r2/*`                      | `r2-public.routes.ts`            | Public                | Public R2 object delivery fallback                                         |
| `/api/notifications`         | `notifications.routes.ts`        | Auth                  | User notifications                                                         |
| `/api/specializations`       | `specializations.routes.ts`      | Public                | Specialization list                                                        |
| `/api/blog`                  | `blog.routes.ts`                 | Public                | Blog post listing                                                          |
| `/api/cms`                   | `cms-public.routes.ts`           | Public                | CMS page rendering                                                         |
| `/api/setup`                 | `setup.routes.ts`                | Public                | Initial admin setup                                                        |
| `/api/reference`             | `reference.routes.ts`            | Public (token)        | Reference form for provider applications                                   |
| `/api/search`                | inline in `index.ts`             | Public                | Unified public site search                                                 |

## Admin Sub-Routes

All admin routes require `admin` role and are registered under `/api/admin/`:

| Path                | File                       | Description                                                                         |
| ------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `/dashboard`        | `dashboard.routes.ts`      | Dashboard statistics                                                                |
| `/therapists`       | `therapists.routes.ts`     | Therapist management                                                                |
| `/users`            | `users.routes.ts`          | User management                                                                     |
| `/membership-tiers` | `tiers.routes.ts`          | Membership tier CRUD                                                                |
| `/events`           | `events.routes.ts`         | Event management                                                                    |
| `/` (inline)        | `registrations.routes.ts`  | Event registration management (sub-paths under admin root)                          |
| `/blog`             | `blog.routes.ts`           | Blog post management                                                                |
| `/applications`     | `applications.routes.ts`   | Provider application review                                                         |
| `/cms/pages`        | `cms.routes.ts`            | CMS page builder                                                                    |
| `/cms/media`        | `cms-media.routes.ts`      | Media library                                                                       |
| `/cms/sections`     | `cms-sections.routes.ts`   | Reusable CMS sections                                                               |
| `/cms/seo`          | `cms-seo.routes.ts`        | SEO settings                                                                        |
| `/cms/menus`        | `cms-menus.routes.ts`      | Navigation menus                                                                    |
| `/cms/sidebars`     | `cms-sidebars.routes.ts`   | Sidebar and widget management                                                       |
| `/cms/redirects`    | `cms-redirects.routes.ts`  | URL redirect management                                                             |
| `/cms/audit`        | `cms-audit.routes.ts`      | CMS audit log                                                                       |
| `/forms`            | `forms.routes.ts`          | Form builder and form submissions                                                   |
| `/crm`              | `crm.routes.ts`            | Lead pipeline, lead detail, client profiles, notes, tasks                           |
| `/ecommerce`        | `ecommerce.routes.ts`      | Products, categories, coupons, orders, refunds, shipping, ecommerce Stripe settings |
| `/membership`       | `membership.routes.ts`     | Membership plans, prices, members, access rules, Stripe settings, activity          |
| `/careers`          | `careers.routes.ts`        | Career jobs, applications, resume download, settings, integrations                  |
| `/portfolio`        | `portfolio.routes.ts`      | Portfolio projects, archive settings, filters                                       |
| `/editor-locks`     | `editor-locks.routes.ts`   | Editor lock status and conflict handling                                            |
| `/system-backups`   | `system-backups.routes.ts` | System backup creation, restore support, backup listings                            |

## Additional Endpoints (inline in index.ts / server/index.ts)

| Path                        | Method | Description                                                                                              |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| `/api/health`               | GET    | Basic health check (memory, uptime, version)                                                             |
| `/api/health/ready`         | GET    | Readiness probe (checks DB connectivity)                                                                 |
| `/api/health/metrics`       | GET    | Metrics (development, or production with `METRICS_ENABLED` and bearer token)                            |
| `/api/branding`             | GET    | Public branding settings for the frontend                                                                |
| `/api/membership-tiers`     | GET    | Public tier listing                                                                                      |
| `/api/seo/global`           | GET    | Global SEO settings                                                                                      |
| `/api/site-config`          | GET    | Feature-app availability for directory, blog, events, CRM, ecommerce, membership, careers, and portfolio |
| `/api/search`               | GET    | Public search across enabled public content sources                                                      |
| `/api/runtime-integrations` | GET    | Runtime integration config such as GA4 measurement ID                                                    |
| `/robots.txt`               | GET    | Dynamic robots.txt                                                                                       |
| `/sitemap.xml`              | GET    | Dynamic XML sitemap                                                                                      |
| `/product-feed.xml`         | GET    | Ecommerce product feed XML when enabled                                                                  |

## Middleware Pipeline

Applied in order in `server/index.ts`:

1. `securityHeaders()` — Helmet CSP, CORS headers
2. `requestIdMiddleware` — Assigns UUID to each request
3. Stripe webhook route (raw body parser, before JSON parser)
4. `express.json({ limit: "1mb" })` — JSON body parser
5. `express.urlencoded()` — URL-encoded body parser
6. `cookieParser()` — Cookie parsing
7. Health check endpoints
8. `apiLimiter` — Global rate limit (300 req/15min)
9. `originCheck` — Origin/referer validation for state-changing requests
10. Static file serving (`/uploads`)
11. Request logging middleware (duration, redacted body)
12. API route handlers
13. Error handler
14. Vite dev server (dev) or static file serving (prod)
