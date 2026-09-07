# Provider integration status

Mailgun replaces the plan's Postmark adapter by the owner's subsequent instruction. The DNS/email task owns domain authentication, DNS and credential activation. Use `MAILGUN_DOMAIN=mg.p1landmanagement.com`, approved `EMAIL_FROM`, and secret `MAILGUN_API_KEY` on the worker. No real delivery has been validated by this implementation task. Do not put API keys in chat, source or build arguments.

QuickBooks uses `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, configured redirect URI, sandbox environment by default, and `INTEGRATION_ENCRYPTION_KEY` (32-byte hex AES-GCM key). `QBO_SERVICE_ITEM_ID` is needed for posting; `QBO_WEBHOOK_TOKEN` verifies webhook HMAC. Owner-bound OAuth state is consumed transactionally; advisory locking serializes the initial company binding. Tokens are encrypted at rest and refresh is serialized. Review customer matches before importing; accounts without a mapping are excluded/quarantined.

Invoice posting uses stable request IDs and immutable payloads. Reconciliation rechecks customer ownership; imported invoices can move only to mapped clients, while local billing remains operationally attached and is hidden when accounting ownership differs. Accounting changes must originate in QuickBooks. Browser redirects never mark an invoice paid. Payment URLs are accepted only on approved Intuit hosts. Actual sandbox round trips, partial payments, credits, disconnection/retry and production eligibility must be verified before use.

Twilio needs authorized account/sender credentials, approved registration, signed callback URLs and recorded opt-in before activation. Consent and STOP/HELP callbacks are implemented; real deliverability and approval are pending. No outbound campaign or invoice-send action is automatic. Unknown email outcomes require explicit retry review to avoid duplicates.

Private object storage is Railway S3-compatible. Web service requires S3 endpoint, region, bucket, access key and secret. Images are decoded, oriented, size-limited and re-encoded as WebP to remove metadata. A synthetic bucket write/read probe passed; authenticated image-route round trips and cleanup/orphan policy testing remain pending. Private files are served through authenticated access checks; signed direct-download URLs are not implemented yet.

Website inquiry bridging is pending coordination with the Core CMS intake owner. Retain one public intake system and propagate source IDs idempotently into dashboard leads.
