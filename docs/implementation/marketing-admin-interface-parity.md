# Marketing: preserve the retained admin interface

Owner correction, September 19, 2026: Marketing must preserve the existing `/admin` tool sets, menus, icons, layouts and features. Backend/API compatibility alone is not acceptance. The current simplified native screens do not meet that requirement.

## Required implementation direction

Reuse retained page components and presentation, extracting shared components where required. Adapt routing, authenticated capability-aware transport and dashboard shell without recreating reduced forms. Preserve draft protection, reservations, version conflicts and confirmed-save behavior already added during consolidation. Do not embed a second independent login or weaken server authorization. Keep the unified dashboard's established system theme and colorful standalone icons.

Social Media is the first reference: `platform/p1-core/client/src/features/admin/settings/branding-tab.tsx` lines around785–876 contain its card, two-column profile fields, URL input behavior, adjacent style/preview layout and save toolbar. `design-page.tsx` supplies the title/description. The current `WebsiteSocial.tsx` retains safer versioned transport but replaces this interface with a long form; it requires correction, not a claim of parity.

## Acceptance sequence

1. Extract/reuse Social Media presentation and verify original field behavior, preview, style options and save/error/conflict behavior at desktop and mobile sizes.
2. Apply the same component-reuse review to Branding, Colors, Typography, then Content and Website System pages. Inventory original tabs, toolbars, dialogs, nested actions and keyboard behavior per page.
3. Compare retained and consolidated pages visually and functionally under the same data and permissions. A feature must not be dropped merely because the simplified native screen omitted it.
4. Restore corresponding tool icons and maintain meaningful accessible labels. Do not add icon backgrounds.
5. Keep retained admin available until every page-family comparison is accepted. No redirect or retirement is authorized by a cosmetic improvement alone.

The initial icon correction restores distinct retained-admin Lucide symbols and associated colors in Marketing. It does not establish page/layout/feature parity. Menu and redirect delivery work already in progress remains preserved and uncommitted pending validation; interface restoration takes priority.
