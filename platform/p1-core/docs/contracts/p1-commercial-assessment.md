# P1 commercial assessment intake contract

Implemented Core boundary: `POST /api/forms/p1-commercial-assessment/submit`, JSON body, optional `Idempotency-Key` header (public client must retain it across retries of the same logical request). Runtime validator: `server/services/p1-commercial-assessment.ts`.

| Field | Contract |
| --- | --- |
| inquiryType | Required literal `commercial_site_assessment` |
| name / company | Required trimmed strings, maximum150 /300 characters |
| email / phone | Optional individually; at least one usable channel required. Whitespace trims to empty. Any supplied nonempty channel must validate. Email maximum254; phone maximum50 and7–15 digits with optional formatting. |
| address | Required trimmed location string, maximum500; city/region accepted when full address unknown |
| title / propertyName / propertyType / acreage | Optional strings, maximum150 /300 /150 /100; acreage may be a range or unknown |
| services | Required array of1–12 nonempty strings, maximum100 each; `general_site_assessment` supported for an unsure buyer |
| projectStage | Required `development_construction`, `turnover_establishment`, `long_term_operations` or `unknown` |
| serviceTiming | Required `immediate`, `recurring` or `both` |
| message | Optional trimmed string, maximum5000; no access codes or sensitive facility-security information requested |
| attribution | Optional flat string record, maximum12 entries, keys maximum64 alphanumeric/underscore beginning with a letter; values maximum2048; no nested objects |
| website | Optional empty-string honeypot; not saved |

Unknown top-level fields, including attachments/upload references, are rejected. Existing JSON limits, submission rate limiting and durable storage apply. No new public upload path is enabled.

Acceptance returns201 `{message, submissionId}` only after submission and effects persist. Same-key replay returns200 with the original submissionId; the existing durable-storage contract preserves the original accepted intent rather than rewriting it. A new project uses a new key even for the same person. Validation returns400; failed durable storage does not produce acceptance.

Core queues the existing CRM effect with `source=website_form`; the initial stage remains `new`. Structured inquiry and all project details remain in `formData`, separate from free-text message. Phone-only inquiries retain null CRM email; no synthetic email is invented. Existing notification jobs retry independently. The system seed enables CRM and admin notifications, with the existing per-form notification recipients and administrator fallback; subsequent boot preserves edited settings, field definitions and inactive state.

The existing `p1-estimate` validator and public behavior are unchanged. The system-form registry now also includes this commercial form.

COM-04 Core-to-dashboard bridge remains unfinished. This change does not claim dashboard commercial-queue creation, create business clients/users, assign cross-property permissions, book an assessment, or send outreach. Until the bridge is accepted, Core Forms and CRM are the staff intake queue; the Orchestrator must assign responsible staff and document handoff status before launch.

Validation:41 focused tests passed, including10 disposable PostgreSQL tests proving concurrent retry deduplication, same-person separate-project preservation, nullable-email commercial CRM creation and the existing worker rollback/retry protections. Typecheck passed. A staging synthetic commercial receipt/CRM check is required after deployment of the seed and validator. No production or original Core Platform changes were performed by this implementation task.
