# Google reporting target management

Website System Integrations now edits the targets consumed by live reporting.
The Owner chooses deployment targets or explicit managed GA property/Search Console
site targets. Credentials remain deployment-managed; public tracking remains the
separate build-time measurement ID. No credentials are copied or changed by saves.

Core stores three nonsecret google_reporting values using existing versioned settings
and audits key names only. Generic settings endpoints cannot bypass this boundary.
Every report resolves a fresh settings snapshot and selects revision-isolated service
instances; old requests cannot populate a new target cache. The private cache identity
includes effective deployment configuration without exposing a secret-derived hash.
The public form version protects stored settings, not externally edited environment
variables. Invalid managed targets fail closed. Saving is not proof of Google access;
the report links display actual provider results and access errors.

Dashboard preserves overrides across source switches, labels effective saved values,
and blocks retries after uncertain saves/conflicts until confirmed reload. It has no
credential fields. OpenAPI/client generation includes the new versioned operation;
regeneration also synchronizes preexisting inline Blog model definitions without
changing their server contracts. The existing Owner-only integration proxy applies.

Validation: parent27 focused Core tests,21 bridge tests,19 dedicated editor tests,
Core/dashboard builds and dashboard types passed. Canonical editor config now pins
Lucide to the dashboard React runtime, matching the dedicated config. Parent browser
review on loopback synthetic data confirmed saved-target changes and readable mobile
controls at390px; no production/provider configuration was written. Deployment and
live read-only verification follow. Full credential management and Search Console
property access remain separate acceptance items.
