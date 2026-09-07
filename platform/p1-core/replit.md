# Core Platform — Counselor Directory & Subscription Platform

## Overview
Core Platform is a platform dedicated to supporting Third Culture Kids (Core Platforms) by connecting them with specialized mental health counselors. It offers a searchable counselor directory, secure authentication, integrated mapping, subscription management, and a robust admin dashboard to provide essential mental health support to the Core Platform community. The project aims to become the leading platform for Core Platforms seeking mental health professionals and aims to improve access to culturally competent mental health care for Core Platforms.

## User Preferences
- All visible text uses "Counselor"/"Counselors" throughout the UI (navbar, footer, home, directory, admin, auth pages).
- Code identifiers, API routes (`/api/therapist/*`, `/api/therapists`), DB columns, and role values (`"therapist"`) remain unchanged.

## System Architecture

### UI/UX Decisions
- **Terminology**: Consistent use of "Counselor"/"Counselors" across all UI.
- **Component Library**: `shadcn/ui` with Tailwind CSS for a responsive and modern interface.
- **Responsive Design**: Custom breakpoints (xs=480px, sm=640px, md=768px, lg=1024px, xl=1280px) for optimal viewing on various devices.
- **Interactive Components**: `Sheet` components for forms and details; `AlertDialog` for confirmations.
- **Branding**: Defined color palette (Navy, Sage, Copper, Teal) and specific fonts (EB Garamond for headings, Nunito for body text).
- **CMS Theme System**: 11 selectable theme presets covering colors, typography, radius, and fonts, applied site-wide via CSS custom properties.

### Technical Implementations
- **Frontend**: Built with React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter for routing, and TanStack Query v5 for data management.
- **Backend**: Implemented using Express.js and TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Custom JWT-based authentication with `bcryptjs` for password hashing and HTTP-only cookies, supporting admin, therapist, and client roles.
- **Core Features**:
    - **Counselor Directory**: Searchable profiles with multi-select specialization filtering, map integration, availability toggles, and status-based filters.
    - **Subscription Management**: Stripe integration for counselor memberships and paid event registrations.
    - **Event Management**: Creation and management of virtual, in-person, and hybrid events with registration, notifications, recurring event functionality, and a full-page admin editor.
    - **Recording Archives**: Role-aware video archives of past events, with options for free or paid access via Stripe controlled by admins.
    - **Admin Dashboard**: Comprehensive management of users, memberships, events, content, and system settings.
    - **Contact Professional**: Direct email functionality from counselor profiles to counselors' registered email addresses without requiring user accounts (inline form).
    - **Registration Consent**: Required age verification (18+) and PHI/HIPAA disclaimer checkboxes.
    - **Notifications**: In-app notification system with user preferences.
    - **CMS**: Nondestructive, block-based page builder with revision history, SEO fields, and scheduled publishing for pages and blog posts. Supports ~37 block types (including static and dynamic blocks like therapist-map). Media managed via Cloudflare R2.
    - **Reusable CMS Sections**: Library for saving and reusing block groups.
    - **Blog Integration**: Integrated blog management within the CMS, supporting Article, Podcast, and External Article post types with enhanced editor and SEO fields.
    - **Provider Application System**: A 7-step wizard for counselor applications with autosave, resume capability, credential management, reference collection, background check scaffolding, and a $150 application fee (via Stripe).
    - **Automated Reference Workflow**: Automated email dispatch with tokenized links for references, public form for submission, and status tracking.
    - **Provider Application Workflow & Gating**: Multi-status application process (`draft` to `active_member`) with admin approval/denial, background check scaffolding, interview scheduling, and subscription gating. Gates public directory visibility and subscription access based on approval and active status.
    - **Background Check Scaffolding**: Modular system for managing and tracking background checks, with provider and admin interfaces.
    - **Hybrid Page Rendering**: Public routes can render dynamic CMS content or static React components.
    - **SEO Foundation**: Global and per-page/post SEO settings with structured data (JSON-LD) generation, redirects manager, sitemap, and admin audit tools.
    - **Page Templates & Landing Page Generator**: Pre-built templates and a wizard for creating high-conversion landing pages within the CMS.
    - **Navigation Menu Builder**: Dynamic management of header and footer navigation with multi-level nesting (up to 3 levels deep).
    - **CMS Theme System**: 11 selectable theme presets controlling site-wide colors, typography, and radius, applied via CSS custom properties.

### System Design Choices
- **Layered Architecture**: Route → Service → Storage pattern for clear separation of concerns, with thin route handlers and domain services owning business logic.
- **Application Service**: Manages the full application lifecycle, including state machine, payment orchestration, and approval workflows.
- **Modular Structure**: Backend organized by concern, frontend by feature.
- **Structured Logging**: Pino-based JSON logger with PII redaction and full UUID request ID propagation.
- **Server-side Image Compression**: All uploaded images (avatars, CMS media, image attachments) are automatically optimized via `sharp` — converted to WebP with quality 80, resized to sensible max dimensions (avatars 400px, CMS 1920px, attachments 1600px). Falls back to the original file if conversion fails or produces a larger result.
- **Settings & Service Client Caching**: TTL-based in-memory caching for settings and singleton service clients (R2, Mailgun, Stripe).
- **Retry Utility**: `retryOnce` helper for idempotent outbound operations.
- **Operational Metrics**: Endpoint exposing request counts, latency, error rates, DB query timing, and email send outcomes via a health endpoint (`/api/health/metrics`).
- **Performance Optimization**: Frontend route-level lazy loading and React Query caching.
- **Database Indexing & FK Constraints**: Extensive use of B-tree/GIN indexes and foreign key constraints.
- **CMS Content Structure**: Block content stored as JSON with typed definitions, supporting a full publishing workflow with revision history.
- **Deployment (Railway)**: Configured for Railway with specific build/start commands, healthcheck, trust proxy, database SSL, conditional Vite plugin loading, esbuild server bundling, auto-migrations on startup, and a first-visit admin setup flow.

## External Dependencies
- **Stripe**: Subscription and payment processing, application fees, and event registrations.
- **MapLibre & OpenFreeMap**: Directory and event maps use MapLibre via React Map GL, with OpenFreeMap vector tiles and Logistics Advisor’s light palette. OpenStreetMap attribution is retained; no CARTO API key is required.
- **Mailgun / Nodemailer**: Transactional email delivery.
- **Cloudflare R2**: S3-compatible object storage for media assets.
- **Sharp**: High-performance image processing (WebP conversion, resizing).
- **Zod**: Schema validation.
- **bcryptjs**: Password hashing.
- **JWT (JSON Web Tokens)**: Custom authentication.
- **Helmet**: Security middleware.
- **express-rate-limit**: API rate limiting.
- **Wouter**: React routing.
- **TanStack Query**: Data fetching and caching.
