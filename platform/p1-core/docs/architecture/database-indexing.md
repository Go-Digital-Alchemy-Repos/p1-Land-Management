# Database Indexing & Foreign Key Strategy

## Database Engine

PostgreSQL hosted on Railway. The application uses `pg` through `drizzle-orm/node-postgres` and connects over Railway private networking in production.

## Index Strategy

The schema defines 45+ B-tree indexes across all major tables. Key indexing patterns:

### Therapist Profiles Indexes

Defined in `shared/schema/therapist-profiles.ts`:

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| `idx_tp_user_id` | `userId` | B-tree | User-to-profile lookup |
| `idx_tp_visibility` | `isApproved, isActive` | B-tree | Base directory filter |
| `idx_tp_country` | `country` | B-tree | Country filter |
| `idx_tp_practice_mode` | `practiceMode` | B-tree | Practice mode filter |
| `idx_tp_featured` | `isFeatured` | B-tree | Featured therapist queries |
| `idx_tp_specializations_gin` | `specializations` | GIN | Array containment queries |
| `idx_tp_languages_gin` | `languages` | GIN | Array containment queries |
| `idx_tp_directory_filter` | `isApproved, isActive, practiceMode, acceptingClients` | B-tree | Common directory filter pattern |

### Other Key Table Indexes

| Table | Indexes | Notes |
|-------|---------|-------|
| `users` | `email` (unique), `role` | Core lookup patterns |
| `specializations` | `name` (unique) | Lookup by name |
| `cms_pages` | `slug` (unique), `status` | Page rendering |
| `blog_posts` | `slug`, `isPublished` | Blog listing |
| `notifications` | `userId`, `isRead` | User notification queries |
| `provider_applications` | `userId`, `status` | Application lookup |
| `events` | `status`, `startDate` | Event listing/filtering |
| `crm_leads` | `stage`, `email`, `phone`, `source`, `ownerId`, `createdAt` | Pipeline, dedupe, ownership, and follow-up work |
| `crm_clients` | `sourceLeadId`, `status`, `email`, `phone`, `clientType`, `companyName`, `accountOwnerId`, `ownerId`, `createdAt` | Client search, status views, source conversion, and ownership |
| `ecommerce_products` | `urlSlug` (unique), `status, active` | Public catalog and product detail lookup |
| `ecommerce_orders` | `customerId`, `status`, `paymentStatus`, `createdAt`, `lookupToken`, `stripePaymentIntentId` | Admin order lists, customer lookup, public status lookup, Stripe reconciliation |
| `ecommerce_processed_webhook_events` | `provider, eventId` (unique) | Idempotent webhook processing |

## Foreign Key Relationships

All tables use `varchar` IDs (UUID-style strings). Foreign keys are declared via Drizzle's `references()`:

### Core Relationships

```
users.id ←── therapist_profiles.userId
users.id ←── notifications.userId
users.id ←── saved_professionals.userId
users.id ←── profile_views.viewerId / profileId
users.id ←── event_registrations.userId
users.id ←── conversations.participant1Id / participant2Id
users.id ←── direct_messages.senderId
users.id ←── provider_applications.userId

therapist_profiles.id ←── therapist_subscriptions.therapistProfileId

membership_tiers.id ←── therapist_subscriptions.tierId

events.id ←── event_registrations.eventId

cms_pages.id ←── cms_page_revisions.pageId

provider_applications.id ←── provider_application_timeline.applicationId
provider_applications.id ←── provider_application_credentials.applicationId
provider_applications.id ←── provider_application_references.applicationId
provider_applications.id ←── provider_background_checks.applicationId
provider_applications.id ←── provider_interviews.applicationId
provider_applications.id ←── provider_application_decisions.applicationId
```

## Migration Strategy

- Migrations are stored in `migrations/` directory (with journal metadata in `migrations/meta/`)
- Production migrations run automatically on startup via `server/migrate.ts`
- Schema changes use `npm run db:push` for development
- Migration files are numbered sequentially (0001, 0002, etc.)

## Ecommerce Index Notes

The ecommerce schema has a broad set of lookup indexes because ecommerce work has multiple hot paths: public catalog reads, admin order operations, checkout reconciliation, coupon validation, refund tracking, and shipping updates.

Key ecommerce index groups:

- Product/category slugs and active catalog filters.
- Product-category association lookups.
- Customer email/user lookups.
- Order status, payment status, created date, lookup token, and Stripe payment-intent lookups.
- Order item product/order lookups.
- Coupon code, active status, and redemption history lookups.
- Refund order/status/Stripe refund lookups.
- Shipping zone/rate and shipment tracking lookups.
- Processed webhook event uniqueness for idempotency.

Use `migrations/0024_ecommerce.sql` for the base ecommerce schema and `migrations/0025_ecommerce_indexes.sql` for supplemental ecommerce indexes.
