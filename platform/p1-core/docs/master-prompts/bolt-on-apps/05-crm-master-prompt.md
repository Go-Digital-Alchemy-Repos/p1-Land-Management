# CRM Bolt-On App — Master Prompt

Append this prompt to [00 — Universal Bolt-On App Contract](./00-universal-bolt-on-app-contract.md).

---

Build the complete **CRM** bolt-on app described below.

## App Registration

- App id/slug: `crm`
- Display name: configurable, default `CRM`
- Core Platform feature key: `crmEnabled`
- Core Platform persisted setting: `system_configuration.enable_crm`
- Core Platform default: enabled; use disabled for a fresh external installation unless explicitly configured otherwise
- Public surface: authenticated/signed inbound lead endpoint only; no public CRM record browser
- Admin routes: `/admin/crm` and `/admin/crm/clients`
- External intake API: `POST /api/crm/leads`
- Admin API family: `/api/admin/crm`
- Core permission: `crm`; map lead/client view, manage, assign, export, and settings privileges to host equivalents

## Product Goal

Provide a lightweight operational CRM with inbound lead capture, deduplication, a drag-and-drop sales/inquiry pipeline, lead detail, follow-up tasks, notes, won-lead conversion, and post-conversion client profiles.

CRM records are private operational data. Do not index them publicly, expose them through site search, or place personally identifiable data in client logs, analytics payloads, URLs, or error messages.

## Domain Model

Implement host-equivalent, namespaced models for:

- leads with name, normalized email/phone, company, message, stage, source, optional external id, source form submission, original normalized form data, safe metadata, owner, next follow-up, and timestamps;
- lead notes with actor and timestamp;
- lead tasks with title, due time, completion state, assignee, creator, and timestamps;
- clients with source lead, individual/business type, onboarding/active/inactive status, preferred contact method, primary and secondary contacts, address, company/legal/industry/size/website, billing contact, account owner, onboarding state, service/renewal/client-since dates, source, form data, metadata, tags, follow-up, and timestamps;
- client notes and client tasks with the same ownership/audit standards;
- optional app settings for intake credentials, sources, stage labels, retention, assignment, and notifications.

Use Core Platform's lead stages as the default configurable workflow:

1. `new`
2. `contacted`
3. `qualified`
4. `proposal`
5. `won`
6. `lost`

Use client statuses `onboarding`, `active`, and `inactive`, and onboarding states `not_started`, `in_progress`, and `complete`, unless the host already has compatible configurable workflows.

## Inbound Lead Capture

Build:

- authenticated external lead intake using a masked/secret API key or the host's stronger service-token mechanism;
- optional adapter from the host forms app or contact submissions;
- server-side mapping for common fields including `name`, `firstName`, `lastName`, `email`, `phone`, `company`, `organization`, `message`, `comments`, and `details`;
- source, external-id, safe metadata, and original form context preservation;
- normalized email and phone deduplication;
- deterministic behavior when a new inbound lead matches an existing lead: update appropriate current context, preserve source history, add a system note, and do not silently duplicate;
- rate limiting, request validation, idempotency using external id/request key where available, and privacy-safe responses.

Do not let arbitrary inbound payload keys overwrite stage, owner, internal notes, tenant/site id, permissions, or other protected fields.

## Admin Pipeline

Create:

- responsive pipeline board grouped by stage, with counts and host-native drag-and-drop;
- accessible non-drag stage-change controls for keyboard and assistive-technology users;
- search, source/owner/stage/follow-up filters, useful sorting, and bounded pagination or virtualization;
- lead create/edit and detail workspace;
- notes timeline and follow-up task list;
- task create, assign, due date, complete/reopen, and delete according to retention policy;
- owner assignment and next-follow-up controls;
- server-authoritative stage transitions with optimistic UI only when rollback is correct;
- clear empty, loading, permission, conflict, and error states.

## Won Lead Conversion

When a lead moves to `won`:

- create a linked client if none exists;
- copy normalized contact, source, owner, follow-up, form data, and safe metadata;
- add system notes to both lead and client documenting the conversion;
- perform stage change, client creation, and notes in one transaction;
- make retries idempotent so the same lead cannot create multiple clients;
- return the linked client for immediate navigation.

If a linked client already exists, preserve it and return it rather than creating a duplicate.

## Client Management

Create:

- searchable/filterable client list;
- individual/business profile editor;
- contact, address, organization, billing, ownership, lifecycle, dates, tags, notes, and tasks sections;
- onboarding state and operational follow-up views;
- source-lead link and conversion history;
- server-enforced tenant/site scope and permission checks for every nested note/task action;
- optional CSV export only if the host has an authorized, audited export pattern.

## Rules And Integrations

- Use a dedicated CRM service for normalization, deduplication, stage transitions, conversion, and source mapping.
- Preserve original source/form context when administrators clean or enrich records.
- Prefer notes for human context and tasks for explicit follow-up commitments.
- Use host notification/email adapters for assignments and due reminders only when configured.
- Keep Forms/Contact integration optional through an adapter.
- Mask intake secrets and expose configured/unconfigured status only.
- Apply retention and deletion rules suitable for PII and the host's compliance requirements.
- Audit ownership, stage, status, conversion, export, and deletion changes.

## CRM Acceptance Criteria

- Authorized inbound requests create or update a lead with preserved attribution; unauthorized or malformed requests reveal no private data.
- Duplicate matching by normalized email/phone updates the existing lead and records a visible system note.
- Users can manage pipeline stages, notes, owners, follow-up, and tasks with keyboard-accessible alternatives to drag-and-drop.
- Moving a lead to Won creates exactly one linked client transactionally and preserves conversion history.
- Client profiles support the full individual/business operational fields, notes, tasks, and lifecycle states.
- Cross-tenant and public access to CRM records is denied and tested.
- Disabling CRM hides the pipeline, clients, admin nav, APIs, form-to-CRM creation, reminders, and commands while preserving leads, clients, notes, tasks, and audit history.

---
