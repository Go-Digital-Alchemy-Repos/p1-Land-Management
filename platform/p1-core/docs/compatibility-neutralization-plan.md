# Compatibility Neutralization Plan

Date: 2026-06-12

## Current Policy

User-facing product language should use neutral platform terminology:

- `provider`, `professional`, or `listing owner` instead of therapist-specific copy.
- `member` or `customer` instead of client-specific copy.
- `platform-approved` or `verified` instead of legacy domain-specific approval language.
- `members`, `participants`, `communities`, and `organizations` for generic examples.

## June 2026 Stabilization Status

The stabilization pass neutralized high-visibility default copy in:

- Static HTML title and Open Graph defaults.
- Public footer fallback copy and system CMS footer menu labels.
- Public search fallback text.
- CMS builder block defaults and page template starter copy.
- Directory page fallback explanatory copy.
- Provider application labels and helper text.
- Provider application status, mobile shell badges, role display labels, contact email footer copy, directory fallback categories, and demo seed provider examples.

Remaining `therapist`, `counselor`, and old domain-specific hits were reviewed again on 2026-06-18. Current remaining matches are intentionally retained for compatibility or pending a dedicated asset/key migration:

- Compatibility identifiers are intentionally preserved.
- Historical docs should be rewritten only when the doc is still reader-facing and current.
- Public asset filenames should be renamed only after references and generated derivatives are migrated together.
- Test fixture search strings may retain old terms when they are validating free-form search behavior rather than product language.

## Preserved Identifiers

Do not rename these directly in a stabilization pass:

- Database tables and columns such as `therapist_profiles`.
- API paths such as `/api/therapists` and `/api/therapist`.
- Role values such as `therapist`.
- Type names, schema names, CMS block type keys, and event visibility values already used in stored data.

## Migration Path

1. Add neutral aliases at API and service boundaries, for example `/api/providers` as a compatibility wrapper over existing directory storage.
2. Add neutral schema/type exports while keeping legacy exports as deprecated aliases.
3. Migrate CMS block keys and stored event visibility values with a reversible data migration.
4. Update clients and tests to consume neutral aliases.
5. After at least one release cycle, remove or hide legacy aliases from documentation while keeping server redirects where practical.

The goal is to remove visible legacy positioning without risking data loss, route breakage, or role/permission regressions.
