# CRM Pipeline And Clients

The CRM app gives admins a lightweight lead pipeline, lead detail workspace, and client profile area for post-conversion account management.

## Where To Find It

- Lead pipeline: `Admin > CRM > Pipeline`
- Client records: `Admin > CRM > Clients`
- Pipeline configuration: `Admin > CRM > Settings` (administrators only)
- Feature toggle: `Admin > Settings > System Configuration > Enable CRM`

If CRM is disabled in system configuration, CRM navigation should be treated as unavailable for that site. Existing data is preserved when the app is turned off.

## Lead Pipeline

Leads move through these stages:

- New
- Contacted
- Qualified
- Proposal
- Won
- Lost

The pipeline supports drag-and-drop stage changes. Opening a lead shows its details, notes, and tasks. Tasks can be assigned, given due dates, and marked complete.

## Pipeline Settings

Administrators can rename, recolor and reorder the six stages. Save applies the presentation to
the board, filters and stage selectors; it does not change lead data or lifecycle rules. The `won`
stage still creates a client even when its display label changes. Restore defaults fills the editor;
Save confirms the reset. Editors with CRM access see the configured pipeline but cannot change its
settings. Failed loads prevent saving; unsupported configuration versions require compatibility
repair before editing.

The Connected settings links open the existing platform integrations, transactional email templates
and branding pages. These settings apply across the site, rather than to an individual lead.

## Lead Sources And Deduplication

CRM leads can be created manually or inferred from form submissions and API payloads. The lead service normalizes common form fields such as `name`, `firstName`, `lastName`, `email`, `phone`, `company`, `organization`, `message`, `comments`, and `details`.

External CRM lead intake is available at `POST /api/crm/leads` and requires the `X-CRM-API-Key` header to match the configured `crm_api_key` setting.

When a new inbound lead matches an existing lead by email or phone, the existing record is updated instead of creating a duplicate. A note is added so admins can see that a duplicate lead was received.

## Won Lead Conversion

Moving a lead to `Won` creates a client record if one does not already exist for that lead. The generated client keeps the lead's contact information, source, owner, next follow-up date, form data, and metadata. The system also adds notes to both the lead and client records documenting the conversion.

## Client Profiles

Client records now include expanded profile fields:

- Client type: individual or business
- Status: onboarding, active, or inactive
- Preferred contact method
- Primary and secondary contact fields
- Address fields
- Company, legal, industry, size, and website fields
- Billing contact fields
- Account owner
- Onboarding status
- Service start, renewal, and client-since dates
- Internal tags
- Notes and tasks

Use client profiles for operational account tracking after a lead has become a customer or client. Use lead records for pre-sale or inquiry-stage work.

## Operational Notes

- Keep source and form metadata intact when cleaning records; it is useful for attribution and debugging.
- Use notes for human context and tasks for follow-up commitments.
- Before marking a lead `Won`, verify the contact details are clean enough to become a client profile.
- If CRM is not part of a site's operating model, turn it off in system configuration rather than deleting CRM data.
