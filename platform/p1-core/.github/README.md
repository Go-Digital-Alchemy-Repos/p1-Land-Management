# P1 Core automation

The isolated Core copy is built and verified from the repository-root
[`Verify P1` workflow](../../../.github/workflows/verify.yml). GitHub Actions
only discovers workflows under the repository root, so this nested directory
must not contain an independent workflow that could validate a different
product or identity provider.

The root Core job uses the P1 Core lockfile, a disposable PostgreSQL service,
additive-migration replay, timezone-sensitive reliability checks, the full
unit suite, production build/budget checks, and the P1 public-content contract.
