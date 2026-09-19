# Native CMS editor deep links

Pages, Galleries and Sections now accept an initial record or create selection on their existing Business Center routes:

| Destination | Existing record | Unsaved creation intent |
| --- | --- | --- |
| `/marketing/content/pages` | `?page=<id>` | `?page=new` |
| `/marketing/content/galleries` | `?gallery=<id>` | `?gallery=new` |
| `/marketing/content/sections` | `?section=<id>` | `?section=new` |

The selector must occur once and contain 1–200 ASCII letters, digits, underscores or hyphens. CMS IDs are stored as varchar keys; this deliberately supports retained opaque IDs rather than assuming all records are UUID-only. Empty, duplicate, traversal, encoded slash, whitespace/control and overlong selections display a list-level error and do not issue a record request. An otherwise valid but missing or inaccessible record keeps the existing editor error/Back-to-list path; it never silently creates replacement content.

Selection, successful creation and return to the list update only the manager's query key with `history.replaceState`, following the existing Blog editor convention. Other query fields, the URL fragment and current history state are retained by these selection operations. New editor selections do not add browser history entries. Direct links are consumed when the manager mounts; arbitrary external same-page `pushState` changes are not a new editor-switch API.

`new` opens an unsaved draft only. It performs no create/publish operation until the editor's existing explicit save flow. On a successful create, the returned record ID replaces `new`, so refreshing the resulting URL selects that record. The native route capability gates, server authorization, reservations, revisions and save/publish semantics are unchanged.

Existing dirty-close confirmations and the shared `p1:before-navigation`/unload draft guard remain active. Canceling the editor's Back action leaves both the draft and selection in place. The dashboard's existing navigation guard restores its saved URL when a navigation is refused; this change does not rewrite that shared behavior.

## Validation

Fifteen mocked-provider component tests cover all three managers: direct opaque-ID selection, invalid selectors with no record fetch, missing-record escape, create intent without writes, unsaved draft cancellation/navigation, and explicit successful save replacing the URL with the new record ID. No actual CMS content was created or modified during validation.

These links supply native destinations for eventual exact legacy route mappings. No `/admin` redirects, authentication changes or backend/API contracts were introduced. Full retained-operation parity, real account reconciliation, browser acceptance and retirement authorization remain separate gates.

## Released read-only checks

Commit `112f1d1` is on main and the task branch. Railway dashboard deployment `a97ad844-eb79-48f6-91a0-1f419ad91b5e` reached SUCCESS. The authenticated Owner browser opened Pages, Galleries and Sections creation intents directly; the Page Back control removed its query selection and restored the list. No save or publish action was submitted. Actual retained-record refresh, mobile layout, reservation conflicts and complete browser Back/Forward dirty-draft behavior remain separate acceptance checks.
