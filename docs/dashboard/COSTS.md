# Planning cost estimate — 2026-09-07

This is a workload assumption, not measured usage or a quote. No additional owner cost approval is requested: the owner explicitly authorized setup with awareness of its cost. Existing website/Core costs and existing accounting subscriptions are separate.

Railway currently lists RAM at $10/GB-month, CPU at $20/vCPU-month, volume storage at $0.15/GB-month and service egress at $0.05/GB. Paid plan subscription fees count toward usage, so do not simply add another plan fee per service. [Railway pricing](https://docs.railway.com/pricing)

For a small pilot, assume aggregate web/worker/database usage of 1–2 GB RAM and 0.1–0.3 vCPU, 5 GB database volume, 20 GB billable backup storage, 50 GB photos and 20 GB service egress. That estimates approximately $17.50–$31.50/month before temporary staging, applicable workspace minimum and taxes. Add roughly $5–$15/month of assumed staging usage while it remains running: **budget $25–$50/month for dashboard infrastructure**, then replace assumptions with actual metrics. These figures do not set resource limits or promise available capacity.

Railway bucket storage is $0.015/GB-month; bucket upload/download/API requests are free, but uploads from Railway services incur service egress. [Bucket billing](https://docs.railway.com/storage-buckets/billing) Backups follow volume pricing; snapshot size/churn and retention determine actual cost. [Backup billing](https://docs.railway.com/volumes/backups)

Mailgun Basic is listed at $15/month for 10,000 emails; Foundation at $35/month for 50,000. Existing account billing may differ. Budget $15–$35/month unless the existing authorized plan already covers dashboard traffic. [Mailgun pricing](https://www.mailgun.com/pricing/)

Twilio US SMS long-code base price is $0.0083 per outbound or inbound segment, plus carrier and number/registration fees. A 1,000-outbound-segment assumption is $8.30 in base send charges; reserve $15–$30/month for a small messaging pilot, plus onboarding fees, and recalculate against the actual approved sender/campaign. Long messages may use multiple segments. [Twilio US pricing](https://www.twilio.com/en-us/sms/pricing/us)

Combined planning allowance: **$55–$115/month**, excluding existing QuickBooks subscriptions, payment processing, one-time SMS registration, domain subscription and taxes. QuickBooks production/payment pricing and eligibility depend on the owner's existing account and selected product; they have not been inspected here. Do not activate charges or send invoices as a cost test.
