# Dashboard tool-load recovery

## Observed defect

After release9926fc01, a previously open dashboard tab navigated to Blog and
requested an obsolete hashed CSS asset. Vite rejected the lazy preload with
`Unable to preload CSS for /assets/BlogManager-CAoRQ0DH.css`. The uncaught lazy
rejection blanked the application. A full reload loaded the current assets and
restored the original Blog controls and empty catalog.

## Correction and boundary

`LazySurface` wraps the dashboard's existing per-tool Suspense boundaries with a
local React error boundary. Loading fallbacks stay in place. Rejected asset loads
show a recoverable tool error while preserving the surrounding dashboard navigation
and mounted siblings. Unrelated render errors use generic copy rather than claiming
a deployment caused them.

Reload is manual. The action first dispatches the existing cancellable
`p1:before-navigation` event, then explicitly warns that unsaved changes may be
lost. It does not automatically reload, swallow preload errors into invalid module
exports, or promise recovery of state already lost inside a failed subtree.

This is a recovery surface, not historical asset retention or offline availability
of every Marketing tool. Root-shell failures outside these boundaries and arbitrary
non-render asynchronous errors remain outside this specific correction.

## Acceptance

Required checks cover rejected CSS and JavaScript imports, sibling state and dirty
navigation guards, keyboard-accessible recovery, cancelled/confirmed reload,
ordinary Suspense loading, unrelated render errors, and an actual built-dashboard
missing-CSS browser reproduction. Final counts, build and deployment evidence are
recorded in handoff.md. No production content changes are needed for verification.


September19 validation: seven focused tests passed, including an independent
parent rerun. Clean dashboard typecheck and Vite production build passed. A
specialist actual Chrome153 reproduction returned404 for the built Blog CSS and
verified retained navigation, no automatic reload, keyboard-accessible Reload,
cancellation, then successful confirmed reload into the Blog list. Service workers
were blocked for that isolated asset test. Existing old bundles require one refresh
to receive the correction; this release cannot retroactively patch loaded JavaScript.
The boundary resets when its wrapped child key changes (including Analytics versus
Search Console), without retrying the same rejected import in a loop.
