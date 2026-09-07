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
- Core service: `45646c66-c173-4e23-81ab-64ca4d545bbe`. Set and read back `SMTP_HOST=smtp.mailgun.org`, `SMTP_PORT=587`, `SMTP_FROM=P1 Land Management <notifications@mg.p1landmanagement.com>` with `--skip-deploys` to coordinate with its active release work.
- Core still needs `SMTP_USER` and `SMTP_PASS`. Dashboard needs `MAILGUN_API_KEY`, `MAILGUN_DOMAIN=mg.p1landmanagement.com`, and the same sender in `EMAIL_FROM`.
- Mailgun initially had no SMTP credentials or domain sending API keys. Browser policy requires explicit confirmation at credential creation; Owner confirmation requested. Never store credential values in this document or Git.

## Remaining validation

Create/store approved credentials securely, bind dashboard DNS after target provision, and verify transport/delivery after the owning tasks deploy. DNS readiness alone does not establish application email delivery. No email has been sent as part of this task.

References: [Mailgun verification](https://documentation.mailgun.com/docs/mailgun/user-manual/domains/domains-verify), [Cloudflare email DNS](https://developers.cloudflare.com/dns/troubleshooting/email-issues/).
