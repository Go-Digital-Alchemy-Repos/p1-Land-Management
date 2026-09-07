# Events Bolt-On App — Master Prompt

Append this prompt to [00 — Universal Bolt-On App Contract](./00-universal-bolt-on-app-contract.md).

---

Build the complete **Events** bolt-on app described below.

## App Registration

- App id/slug: `events`
- Display name: configurable, default `Events`
- Core Platform feature key: `eventsEnabled`
- Core Platform persisted setting: `system_configuration.enable_events`
- Core Platform default: enabled; use disabled for a fresh external installation unless explicitly configured otherwise
- Public routes: `/events`, `/events/:id`, plus configured archive/recording entry points
- Admin routes: `/admin/events`, `/admin/events/new`, `/admin/events/settings`
- Public API families: `/api/events`, `/api/registrations`
- Admin API families: `/api/admin/events`, `/api/admin/registrations`
- Core permission: `content`; map event create/edit/publish and registration-management permissions to host equivalents

## Product Goal

Provide event publishing, discovery, venue/organizer management, registration, attendance, reminders, paid/free access, archives, and recordings. Date, timezone, capacity, payment, and visibility rules must be server-authoritative.

## Domain Model

Implement host-equivalent, namespaced models for:

- events with title, unique slug/id, rich description, start/end, timezone, status, visibility, image/focal point, type, category, audience, format, tags, and delivery mode;
- in-person, virtual, or hybrid location fields, protected join details, speaker content, member-only state, archive/recording configuration, and optional CMS form reference;
- reusable venues with address, coordinates, arrival, parking, transit, and accessibility details;
- reusable organizers with contact, website, and media;
- recurrence definition and generated/linked occurrences with a parent event;
- registration configuration: enabled, free/paid, fee/currency, open/close window, capacity, waitlist, automatic/manual approval, and custom-form reference;
- registrations with user or guest identity, status, payment state, provider ids, amount snapshot, notes, attendance/check-in, reminder, registration, and cancellation timestamps;
- app settings for labels, defaults, registration policies, archive behavior, reminders, and payment/integration status.

Use unambiguous event and registration status enums and service-level state transitions.

## Public Experience

Build:

- responsive upcoming/archive views with list/card and optional calendar presentation;
- filters for configured type, category, audience, format, delivery mode, date, and keyword;
- detail page with correct single-day or multi-day date/time rendering in the event timezone, location/virtual state, speaker, description, registration state, and accessible media;
- registration states for not open, open, approval required, full, waitlist available, closed, canceled, completed, member-only, already registered, and payment pending;
- authenticated and guest registration when allowed, with duplicate prevention by event/user or normalized event/email;
- secure cancellation or attendee self-service using authenticated ownership or an unguessable token;
- archive and recording display according to access and price settings;
- CMS preview-block adapter and unified search/sitemap/structured-data participation for public published events only.

Never expose a private virtual join URL, dial-in data, attendee list, private notes, or payment identifiers to an unauthorized user.

## Admin Experience

Create:

- event list/calendar with search, filters, statuses, and create action;
- full create/edit workflow for content, classification, schedule/timezone, recurrence, venue, organizer, location, speaker, media/focal point, visibility, archives/recordings, and registration;
- sensible presets for training, workshop, webinar, class, consultation, appointment, and community event without hardcoding those as the only allowed future types;
- venue and organizer CRUD;
- registration roster with search/filter, detail, approve/reject/waitlist/confirm/cancel status actions, payment state, attendance/check-in, notes, export if host conventions support it, and safe deletion/retention;
- reminder controls and delivery status;
- settings for labels, defaults, registration, email, payment, archive, and integration health;
- live editor lock/read-only behavior matching the host's shared editing patterns.

## Rules And Integrations

- Store instants consistently and preserve the named event timezone; never derive business rules solely from the browser timezone.
- Require end after start, valid registration windows, non-negative minor-unit fees, and coherent capacity/waitlist rules.
- Capacity reservation and registration creation must be transactional and safe under concurrency.
- The server re-reads fee, currency, eligibility, capacity, and event state before checkout or confirmation.
- Payment checkout and verified webhooks must be idempotent and separate from Ecommerce, Membership, and Directory payment settings.
- Use host email/jobs for confirmations, approvals, cancellations, changes, reminders, and attendee/admin notifications.
- CMS forms are optional; provide a minimal native registration schema if Forms/CMS is absent.
- Membership can optionally supply member eligibility through an adapter. Events must still support public/non-member operation without Membership.
- Recurrence generation, reminders, and recording publication must be safe to retry.

## Events Acceptance Criteria

- An editor can create and publish single-day, multi-day, virtual, in-person, hybrid, and recurring events with correct timezone display.
- Eligible guests/users can register through every configured approval, payment, capacity, and waitlist state without duplicate or oversold registrations.
- Administrators can manage the roster, attendance, reminders, venues, organizers, and settings.
- Private join, attendee, note, and payment data is never exposed publicly.
- Event cards, search, sitemap, structured data, CMS embeds, and archives obey publication and feature availability.
- Disabling Events removes public/admin/API/discovery/embed surfaces and prevents new reminders or registrations while preserving event, registration, attendance, and reconciliation records.

---
