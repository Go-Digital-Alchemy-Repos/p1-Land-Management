# Visual Builder Architecture

## Overview

The Core Platform CMS visual builder is a registry-first, canvas-based editor for CMS pages. It preserves the existing structured JSON page model while upgrading the authoring experience from form-driven editing to a synchronized navigator, visual canvas, and inspector.

This phase does **not** introduce front-end live editing. It focuses only on the admin authoring experience.

## Architecture Direction

We evaluated whether the current CMS block model could be moved toward a Puck-style architecture without destructive rewrites.

The answer was yes, but with an important nuance:

- We **did not** replace the CMS with a second page model.
- We **did not** introduce freeform positioning or a Webflow-like layout engine.
- We **did** formalize the current block model into a stronger component registry + shared renderer pattern that is compatible with a future Puck-style live editing path.

This means the current implementation is **Puck-style in architecture** even though it does not yet embed the external Puck package directly.

## Core Building Blocks

### 1. Block / Component Registry

File:
- `client/src/features/admin/cms/builder/block-registry.ts`

Responsibilities:
- defines block types
- defines typed prop schemas
- defines categories and defaults
- creates new block instances
- remains the canonical source of truth for CMS block configuration

This registry is the equivalent of a component config layer in a framework-backed visual editor.

### 2. Visual Builder Shell

File:
- `client/src/features/admin/cms/builder/page-builder.tsx`

Responsibilities:
- left navigator / structure panel
- center visual canvas
- compact floating section toolbar on the canvas
- right advanced inspector
- block selection
- reordering
- duplication
- deletion
- add-block and saved-section insertion

The page itself is now the editing surface, instead of a list of preview cards with a detached form editor.

### 3. Shared Render Path

Files:
- `client/src/features/public/public-block-renderer.tsx`
- `client/src/features/admin/cms/builder/page-builder.tsx`
- `client/src/features/admin/cms/builder/section-style.tsx`

The admin visual canvas now renders blocks through the same public block renderer path used for published pages. The admin layer adds selection chrome, action overlays, and inspector synchronization on top of the shared output.

That gives us:
- truer WYSIWYG behavior
- fewer preview-only inconsistencies
- a cleaner migration path toward future live edit tooling

### 4. Inspector

File:
- `client/src/features/admin/cms/builder/block-editor.tsx`

Responsibilities:
- full editing for the currently selected block
- grouped controls for `Content`, `Media`, `Layout`, and `Settings`
- continued use of Cloudflare R2-backed media pickers instead of raw media URL entry

The same block editor now supports two roles:
- `contextual` mode for future lightweight inline use where safe
- `full` mode for the advanced inspector on the right

The inspector remains schema-driven and uses the registry definitions, but presents them in a more modern grouped experience.

## Canvas / Navigator / Inspector Model

### Left: Navigator

The navigator is the structure view for the page:
- displays ordered blocks
- supports drag reordering
- supports duplicate and delete
- shows block metadata like category, dynamic/live status, and full-width behavior
- syncs selection with the visual canvas

### Center: Visual Canvas

The center pane is the actual editing surface:
- renders the real page composition
- preserves spacing and layout wrappers
- supports click-to-select on the canvas
- shows selection outlines and quick block actions
- scrolls as a full page surface instead of previewing block cards

#### Floating Toolbar

When a section is selected, a floating toolbar appears with high-frequency actions:
- select / edit
- move up
- move down
- duplicate
- add below
- delete

The floating toolbar is intentionally compact and non-blocking. It does **not** host full editing forms.

### Right: Inspector

The right inspector is the primary editing surface:
- used for full block editing
- stays synchronized to the same selected section as the navigator and canvas toolbar
- remains visible as a docked desktop rail while the canvas scrolls inside the sticky builder shell
- supports long forms through its own internal scrolling region
- keeps grouped controls for `Content`, `Media`, `Layout`, and `Settings`
- continues using Cloudflare R2-backed media upload and picker flows instead of raw URL entry

The inspector can still be hidden to prioritize canvas space, but the default editing pattern is now:
1. select a section on the canvas
2. use the floating toolbar for section actions
3. edit full block fields in the docked inspector

## Selection Synchronization

Selection state is shared across:
- left navigator
- center canvas
- floating section toolbar
- right docked inspector

Additional long-page usability improvements:
- selecting a block scrolls it into view
- selected sections remain visually obvious
- the desktop builder shell stays pinned in the viewport so authors do not lose the inspector while working lower on the page
- the docked inspector stays visible while the canvas scrolls
- the inspector scrolls independently from the page canvas, which keeps long forms usable
- the inspector includes a direct "Locate" action to jump the selected block back into view on the canvas

## Media Handling Rules

All image-oriented editing in the visual builder continues to use the existing CMS media flow:
- Cloudflare R2-backed upload
- media library selection
- image focal / position controls where supported

The intended UX remains:
- upload or pick from media library
- do not treat raw image URLs as the primary editor workflow

This preserves the existing media governance model and avoids regressions in asset management.

## Data Model Compatibility

The visual builder preserves the current CMS contracts:
- `cms_pages.content` remains structured JSON
- existing routes and slugs remain unchanged
- draft / publish / scheduled publish flows remain unchanged
- revision history remains compatible
- public SEO behavior remains unchanged
- blog and dynamic block behavior remain unchanged

## Why We Did Not Swap In a New Editor Package Immediately

The existing CMS already had:
- typed blocks
- shared rendering primitives
- R2 media flows
- revision history
- public rendering contracts

A direct package-level editor swap would have added migration risk without first establishing a stable shared renderer + registry-first architecture.

The chosen approach is therefore:
1. keep the page model
2. make the canvas use the real renderer
3. strengthen the registry-driven inspector and builder shell
4. keep future package-level adoption optional instead of mandatory

## Future Compatibility With Front-End Live Edit Mode

This admin visual builder is intentionally designed so that a future live-edit mode can reuse:
- the same block registry
- the same block renderer
- the same section styling wrappers
- the same structured JSON persistence
- the same contextual-vs-advanced editing split

The next logical step for front-end live editing is to extract the canvas selection layer and inspector state into shared editing primitives that can mount either:
- inside the admin dashboard, or
- around a front-end preview route in authenticated edit mode

## Recommended Next Step

For future front-end live edit mode:
- create a shared editor session state layer
- add route-level preview mode on CMS pages
- gate editing chrome behind authenticated admin edit mode
- keep persistence and publish workflows on the current CMS endpoints
