# Better Farms Content Review Record

**Status:** draft — content gate pending
**Reviewed source:** `31deb36e3fb13e29b1cab557dccd070c9e3fdf81`
**Review basis:** local production build and rendered-route browser review on 2026-09-04

This is a secret-free working record for the Better Farms `content` release gate. It identifies content
that needs client evidence; it does not approve copy, identities, media, or publication.

The current integration candidate `ee14d6746cc14cb4b441eecf6598aaaf0e18e975` carries the programmatic
Contact labels introduced in `cfd8576`, runs its quality workflow on Node 24, and renders the bundled Fund a
Farm content quietly when a Core origin is intentionally unconfigured. The focused browser review confirms
the Contact and donation-control accessible names without changing rendered content or layout, so the content
findings below remain applicable.

## Required approval evidence

Before the content gate can pass, the client must provide a dated approval record that identifies:

- approved copy for each included route and component;
- the name, role, and permission basis for every named person, testimonial, quotation, and portrait;
- the source or license for each reused image, logo, and other media where applicable;
- approved alternate text for images that convey content, or a documented decorative designation;
- the reviewer and evidence for responsive visual and accessibility review of the approved rendered pages;
- the approver, scope, and version/revision of the reviewed site content.

Keep personal contact details, licenses, and raw supporting documents outside this repository. The release
manifest should reference the approved record without copying its contents.

## Visible placeholders requiring replacement or written exclusion

| Route | Source location | Finding | Required decision |
| --- | --- | --- | --- |
| Home | `client/src/pages/HomepageWhite.tsx` testimonials 2–3 | Attributions use `Placeholder Name`, `Placeholder Farm`, and `Placeholder Ranch`. | Supply approved testimonial wording, attribution, permission basis, and any material claims substantiation; otherwise remove the testimonials. |
| Home | `client/src/pages/HomepageWhite.tsx` `teamCards` | Three cards use `Full Name`, `One-line credential`, and the shared filler biography. | Supply approved person identity, title, portrait rights, and biography for every retained card; otherwise remove the cards. |
| About | `client/src/pages/AboutUs.tsx` `boardMembers` | Six cards use `Full Name`, `One-line credential`, and the shared filler biography. | Supply approved board identity, title, portrait rights, and biography for every retained card; otherwise remove the cards. |
| Home and About | `client/src/components/TeamMemberDialog.tsx` `placeholderBio` | The member dialog displays Latin filler text for the cards above. | Replace it for each retained person with approved biography copy, or remove the affected member dialog entries. |
| How It Works | `client/src/pages/HowItWorks.tsx` quotation footer | A visible quotation is attributed only as `— Name`. | Supply approved attribution and permission basis, or remove the quotation. |
| Home | `client/src/pages/HomepageWhite.tsx` image alternatives | Several rendered images expose generic alternatives such as `Rectangle`, `Group`, or `Img`. | For each retained image, supply an approved descriptive alternative or explicitly mark it decorative after rendered-page review. |

Input placeholders such as `Full Name`, `Email`, `Select`, and `Leave a message` were reviewed as form
affordances rather than content claims. They are not release blockers on their own. Their labels,
validation, and mobile behavior remain part of the form accessibility review.

## Completion criteria

The client-approved record must cover every retained item above and the representative pages in the pilot
scope. After the source is updated, repeat the production build, rendered-route review, and accessibility
review against the exact release candidate. Only then may the release manifest's `content` gate be changed
from `pending` to `passed` with a reference to that approval record.
