# CMS Pages And Visual Builder

The Core Platform page builder uses structured content blocks rather than freeform page design. This keeps the site maintainable, consistent, and safer for non-technical editors.

## Builder Layout

### Structure

The left column shows the page structure and section order. Use it to jump between blocks, reorder sections, understand page composition quickly, and insert saved reusable sections.

### Canvas

The center canvas renders the actual page composition. Use it to visually confirm section spacing, images, hierarchy, and content flow.

- Block toolbars allow quick duplicate, reorder, delete, and public visibility toggles.
- Inactive blocks remain visible in the editor but disappear fully on the public site.

### Inspector

The right inspector is the primary editing surface for full block settings. It is designed for grouped editing:

- Content
- Media
- Layout
- Section Settings

The structure rail and inspector rail can both be collapsed to create more working space on smaller screens.

## Reusable Sections

Any block can be saved as a reusable section from the page builder.

- Use `Save Section` from the block toolbar or inspector.
- Saved sections appear in the sections library and can be inserted into other pages later.
- The reusable sections library is available under `Admin > CMS > Sections`.

## Previewing

- Use `Frontend Preview` from the builder toolbar to inspect the current page without builder chrome.
- Tablet and mobile preview now use real device-width frames, so they should reflect the live responsive layout much more accurately.

## Editing Best Practices

- Keep blocks focused on a single content purpose.
- Prefer page sections over trying to force unrelated content into one block.
- Use reusable dynamic blocks for content that already has its own system, such as blog previews or event previews.
- Review tablet and mobile preview before publishing large layout changes.

## Draft And Publish

- Save when you want to keep work in progress.
- Publish when the page is ready for the public site.
- Revision history remains tied to the same CMS page model, so structured content changes stay traceable.
- Use the draft preview link in the page editor when you want to review the real frontend rendering of the current saved draft before it goes live.
- Use the Quality tab before publishing to catch missing SEO fields, empty sections, incomplete CTAs, missing image alt text, and other common page issues.

## Collaborative Editing Safety

Pages now use live editor locks.

- One admin or editor can actively edit a page at a time.
- Other users may still open the page in read-only mode.
- Admins can take over a lock when needed.
- Locks refresh automatically while the editor stays open and expire after inactivity.

## Safe Content Editing Rules

- Use the rich text editor for body copy.
- Use the media library for images and documents.
- Avoid pasting raw third-party code unless the section explicitly supports HTML content.
- Check CTA links carefully before publishing.
- When sharing a preview link, remember it represents the latest saved draft. Saving again refreshes the underlying preview token so reviewers are always looking at the current version.

CMS Overview is the first link in the Content sidebar and the section landing page. Selecting the Content heading opens `/admin/cms`; its separate arrow expands or collapses the section. These CMS links respect the CMS feature gate.
