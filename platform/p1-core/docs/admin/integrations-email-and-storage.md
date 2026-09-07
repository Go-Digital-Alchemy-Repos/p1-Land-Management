# Integrations, Email, And Storage

System integrations in the admin control key production services. Changes should be made carefully and verified immediately.

## Cloudflare R2

Cloudflare R2 is used for media storage. Confirm the following when troubleshooting media:

- bucket credentials are valid
- public URL points to the public asset domain, not the S3 API endpoint
- uploaded images are visible in the media library
- rendered pages can resolve the published asset URL

## Mailgun

Mailgun is used for transactional email and test-connection workflows. Unauthorized errors usually point to:

- incorrect API key
- wrong domain
- mismatched region/domain pairing

## Mailchimp

Mailchimp is configured as a shared audience integration.

- Store the API key, audience ID, and server prefix in Integrations.
- Form-specific Mailchimp tags are controlled in the Forms system rather than in global settings.
- The directory application flow can tag applicants separately from newsletter or inquiry forms.

## Analytics And Consent Readiness

The public consent system now stores essential, preferences, analytics, and marketing choices for 60 days.

- Essential cookies stay on.
- Non-essential scripts should only load after the relevant consent has been granted.
- The integration area now has a clean home for future direct GA4 configuration, but public tracking should remain gated by consent.

## Stripe And Ecommerce Stripe

Stripe is used in two separate operating areas:

- Membership/subscription and recording-purchase payments use the existing Stripe integration.
- Storefront checkout uses ecommerce Stripe settings in the ecommerce admin area.

For ecommerce, configure test and live publishable keys, secret keys, webhook secrets, and the active mode in `Admin > Ecommerce > Settings`. Secret keys and webhook secrets should be stored only through the encrypted settings flow.

Before testing ecommerce checkout:

- confirm the active mode is correct
- confirm the matching publishable and secret keys are present
- configure the ecommerce webhook endpoint in Stripe
- verify the webhook secret is saved for the active mode

Do not reuse planning-note credentials, pasted credentials, screenshots, seed data, or docs as a source of truth for live keys.

## System Configuration

The System Configuration tab controls whether major feature apps are active for this site:

- Directory
- Blog
- Events
- CRM
- Ecommerce

Turning an app off hides its navigation and guarded routes where implemented, but it does not delete stored data. Use this for project-specific platform tailoring instead of removing migrations or records.

## Operational Advice

- Update credentials in admin settings carefully and verify them immediately.
- Keep a record of which account owns the live credentials.
- If an integration appears configured but does not work on the frontend, verify both storage and rendering layers instead of assuming the upload failed.
