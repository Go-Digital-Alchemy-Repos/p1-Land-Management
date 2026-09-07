# P1 Mailgun and DNS setup

Owner authorized Mailgun relaying, system notifications, and related DNS changes on 2026-09-07. DNS task owns Cloudflare/Mailgun configuration; Orchestrator owns Core implementation/releases; Business Dashboard task owns dashboard implementation/releases.

## Verified configuration

- Mailgun US sending domain: `mg.p1landmanagement.com`.
- Existing SPF `v=spf1 include:mailgun.org ~all`, DKIM selector `mailo`, and tracking CNAME `email.mg` to `mailgun.org` verified in Mailgun.
- Added MX `mg` to `mxa.mailgun.org` and `mxb.mailgun.org`, both priority 10, DNS only, Auto TTL. Both resolve publicly and Mailgun marks both Verified.
- Existing `_dmarc.mg` monitoring policy (`p=none`) is published. Mailgun's DMARC UI still reported Unconfigured during initial verification; no duplicate record added.
- Root Google Workspace MX, SPF, and DKIM retained.
- Mailgun click/open tracking and unsubscribe rewriting are off. Certificate verification is required; outbound TLS is opportunistic in the domain settings.

## Applications

- CMS: `https://www.p1landmanagement.com/admin`, using the approved gateway/private Core architecture; no separate CMS DNS needed.
- Business dashboard: `https://dashboard.p1landmanagement.com`, backed by Railway's DNS-only CNAME target. Its `_railway-verify.dashboard` TXT ownership record is also published and both resolve publicly.
- Railway project: `e83f79dd-d901-4ab1-836b-bdf272b58dc2`; production environment: `6126e9ca-b071-4c41-b7c0-aa945fa37067`.
- Core service: `45646c66-c173-4e23-81ab-64ca4d545bbe`. Its `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, and `SMTP_PASS` variables are configured securely.
- Dashboard service has `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `EMAIL_FROM`; its worker receives the key through a Railway service-variable reference. Values are never stored in source control.
- Mailgun has one scoped Core SMTP credential and one domain sending API key for dashboard transactional notifications. Never store credential values in this document or Git.

## Remaining validation

Core SMTP authenticated with required TLS and sent one authorized, plainly labeled verification message to the owner. Mailgun recorded it as Delivered, with the recipient server returning `2.0.0 OK`.

The dashboard sent its single owner-account setup email and Mailgun recorded Accepted followed by Delivered, also with the recipient server returning `2.0.0 OK`. The message body and setup code were not opened or recorded. The setup is configured on the reviewed preview; completion of the owner password and MFA flows remains with the owner, and production rollout remains governed by the release process.

References: [Mailgun verification](https://documentation.mailgun.com/docs/mailgun/user-manual/domains/domains-verify), [Cloudflare email DNS](https://developers.cloudflare.com/dns/troubleshooting/email-issues/).
