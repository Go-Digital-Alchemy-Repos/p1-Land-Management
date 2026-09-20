# Production CRM preservation — September 19, 2026

Bounded production import completed using the existing reviewed source-fenced
runner at application revision22bfe064. This is data preservation and native inquiry
adoption, not permanent source write retirement or full account/access migration.

## Exact scope

Fresh read-only source export:3 leads,0 clients,0 notes,0 tasks. Source content
matched the prior isolated actual-source rehearsal exactly. One lead already mapped
to a dashboard inquiry through its commercial submission receipt. Two unmapped
submissions received distinct new inquiry UUIDs; matching person/company details
were not used to merge them. Source fields, including values without a native
editor, are retained in immutable source snapshots. Existing test/QA inquiry labels
were preserved; these records are not evidence of new customer acquisition.

- Source content SHA256:
  `7360ab7421dfa0eeb4bb228e38eeb9ac5937d317f0e1a5ea44cd5d45aea0ccf4`
- Reviewed plan SHA256:
  `fd61db82bfa2059518a7a4ac407a3ef68dd5bd3a4261d918dbcb3e0da15a9d36`
- Dry run:3 planned archive records, transaction rolled back.
- Apply:3 source records preserved, independently verified;2 separate inquiries
  created, existing mapped lead compared before/after and unchanged.
- Exact replay:3 replayed,0 created, independently verified; existing lead unchanged.
- No clients, properties, accounts, access grants, notifications, invoices or
  provider messages were created. Core source rows were not changed.

The runner verified the active canonical Owner identity, exact fresh source
snapshot/identity inventory, eligible forms, terminal delivery effects and held
source row locks until target commit and independent verification. The operator
acted under the Owner's existing project migration authority; the review file is
an operator assertion, not a separate signed Owner review. Its `releaseApproval`
output remains false by design: the runner cannot confer release authority.

## Evidence and recovery

Private export/review/apply/replay files are stored mode0600 in the protected
workstation directory `/private/tmp/p1-crm-fresh-d226y2bt`. No customer payloads,
credentials or review identity values are committed here. Connection values were
kept in process memory/stdin; neither service environment was changed.

The current Dashboard backup captured before this import passed an isolated
PostgreSQL18 restore, migration and second restore; archive SHA256:
`04c1d871c454d0562aed77cd6049621e7af5e793a74511f422dc22711edeec74`.
Original business rows were preserved in that rehearsal. Do not undo an uncertain
import by deleting immutable archives or inquiries; retain the identical plan and
run exact reconciliation/replay. Restoring production from the prior backup would
require separate recovery coordination to protect subsequent work.

Live authenticated Sales CUA showed3 inquiries, including the two imported entries,
preserved stage/follow-up date, structured acreage/service context, and the imported
CRM history viewer. No edits or messages were submitted during verification.

## Remaining consolidation work

- Core editing is still available. Establish permanent source ownership/write
  fencing and staff cutover before treating native CRM as the exclusive system.
- Preserve future new submissions; this is a point-in-time copy, not incremental
  synchronization. Source drift must fail closed rather than overwrite native edits.
- Pipeline configuration parity and full sales workflow acceptance remain open.
- Inactive-account/MFA policy decisions remain separate; this import changed none.
- `/admin` retirement and the overall consolidation goal remain incomplete.
